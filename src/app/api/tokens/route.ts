import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import {
  sanitizeString, sanitizeTokenName, sanitizeTokenSymbol,
  isValidUUID, isValidETHAmount, checkRateLimit, RATE_LIMITS,
  calculateBuyTokens, calculateSellETH, getCurrentPrice, log
} from "@/lib/production";

const TOTAL_SUPPLY = 1_000_000;
const FOUNDER_SHARE = 300_000;
const CURVE_SUPPLY = 400_000;

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return err("Invalid JSON"); }
  const { action } = body;
  if (!action || typeof action !== "string") return err("Missing action");

  // ═══ PUBLIC ENDPOINTS (no auth) ═══

  if (action === "list_marketplace") {
    const { sort = "volume", search, limit = 50 } = body;

    // Rate limit searches
    const ip = req.headers.get("x-forwarded-for") || "anon";
    const rl = checkRateLimit(`search:${ip}`, RATE_LIMITS.SEARCH.max, RATE_LIMITS.SEARCH.window);
    if (!rl.allowed) return err("Rate limited. Try again shortly.", 429);

    let query = supabase.from("token_launches")
      .select("*, founder_a:founder_a_user_id(id, name, avatar_url), founder_b:founder_b_user_id(id, name, avatar_url), fusion:fusion_id(name, generation, dna)")
      .eq("status", "LIVE");

    // Sanitize search to prevent SQL injection via ilike
    if (search && typeof search === "string") {
      const clean = sanitizeString(search, 50).replace(/[%_]/g, ""); // Strip SQL wildcards
      if (clean.length >= 2) {
        query = query.or(`token_name.ilike.%${clean}%,token_symbol.ilike.%${clean}%`);
      }
    }

    const sortMap: Record<string, string> = { volume: "volume_24h", newest: "launched_at", holders: "holder_count", price: "current_price" };
    query = query.order(sortMap[sort] || "volume_24h", { ascending: false });

    const safeLimit = Math.min(Math.max(1, Number(limit) || 50), 100);
    const { data, error } = await query.limit(safeLimit);
    if (error) { log("error", "list_marketplace failed", { error: error.message }); return err("Server error", 500); }
    return NextResponse.json({ tokens: data || [] });
  }

  if (action === "token_detail") {
    const { launch_id } = body;
    if (!launch_id || !isValidUUID(launch_id)) return err("Invalid launch_id");
    const { data } = await supabase.from("token_launches")
      .select("*, founder_a:founder_a_user_id(id, name, avatar_url, industry), founder_b:founder_b_user_id(id, name, avatar_url, industry), fusion:fusion_id(id, name, generation, dna, performance_score)")
      .eq("id", launch_id).single();
    if (!data) return err("Not found", 404);
    return NextResponse.json({ token: data });
  }

  if (action === "trade_history") {
    const { launch_id, limit = 50 } = body;
    if (!launch_id || !isValidUUID(launch_id)) return err("Invalid launch_id");
    const { data } = await supabase.from("token_trades")
      .select("*, user:user_id(name, avatar_url)")
      .eq("launch_id", launch_id)
      .order("created_at", { ascending: false })
      .limit(Math.min(Number(limit) || 50, 100));
    return NextResponse.json({ trades: data || [] });
  }

  if (action === "holders") {
    const { launch_id } = body;
    if (!launch_id || !isValidUUID(launch_id)) return err("Invalid launch_id");
    const { data } = await supabase.from("token_holdings")
      .select("*, user:user_id(name, avatar_url)")
      .eq("launch_id", launch_id).gt("balance", 0)
      .order("balance", { ascending: false }).limit(50);
    return NextResponse.json({ holders: data || [] });
  }

  if (action === "price_history") {
    const { launch_id, period = "1h", limit = 168 } = body;
    if (!launch_id || !isValidUUID(launch_id)) return err("Invalid launch_id");
    const validPeriods = ["1m", "5m", "1h", "4h", "1d"];
    const safePeriod = validPeriods.includes(period) ? period : "1h";
    const { data } = await supabase.from("token_price_history")
      .select("*").eq("launch_id", launch_id).eq("period", safePeriod)
      .order("recorded_at", { ascending: true }).limit(Math.min(Number(limit) || 168, 500));
    return NextResponse.json({ prices: data || [] });
  }

  if (action === "leaderboard") {
    const { sort = "volume", limit = 25 } = body;
    let query = supabase.from("token_launches")
      .select("id, token_name, token_symbol, current_price, price_24h_ago, volume_24h, holder_count, total_trades, market_cap, launched_at, fusion:fusion_id(name, generation)")
      .eq("status", "LIVE");
    const sortMap: Record<string, string> = { volume: "volume_24h", holders: "holder_count", price: "current_price" };
    if (sort === "newest_hot") {
      query = query.order("volume_24h", { ascending: false }).gte("launched_at", new Date(Date.now() - 86400000).toISOString());
    } else {
      query = query.order(sortMap[sort] || "volume_24h", { ascending: false });
    }
    const { data } = await query.limit(Math.min(Number(limit) || 25, 50));
    return NextResponse.json({ tokens: data || [] });
  }

  // ═══ AUTH REQUIRED ═══
  const user = await getSessionUser();
  if (!user) return err("Unauthorized", 401);
  const ip = req.headers.get("x-forwarded-for") || user.id;

  // ═══ PROPOSE ═══
  if (action === "propose") {
    const rl = checkRateLimit(`propose:${user.id}`, RATE_LIMITS.PROPOSE.max, RATE_LIMITS.PROPOSE.window);
    if (!rl.allowed) return err("Too many proposals. Wait 5 minutes.", 429);

    const { fusion_id, token_name, token_symbol, my_eth } = body;
    if (!fusion_id || !isValidUUID(fusion_id)) return err("Invalid fusion_id");

    const cleanName = sanitizeTokenName(token_name || "");
    const cleanSymbol = sanitizeTokenSymbol(token_symbol || "");
    if (cleanName.length < 2) return err("Token name too short (min 2 chars)");
    if (cleanSymbol.length < 2) return err("Symbol too short (min 2 chars)");

    const ethAmount = parseFloat(my_eth);
    if (!isValidETHAmount(ethAmount)) return err("Invalid ETH amount (0.001 - 1000)");

    const { data: fusion } = await supabase.from("fusions")
      .select("id, parent_a_user_id, parent_b_user_id, status, name")
      .eq("id", fusion_id).eq("status", "active").single();
    if (!fusion) return err("Fusion not active", 404);

    const isA = fusion.parent_a_user_id === user.id;
    const isB = fusion.parent_b_user_id === user.id;
    if (!isA && !isB) return err("Not your fusion", 403);

    const { count } = await supabase.from("token_launches")
      .select("id", { count: "exact", head: true })
      .eq("fusion_id", fusion_id).neq("status", "CANCELLED");
    if ((count || 0) > 0) return err("Token already exists for this fusion", 409);

    const { data: launch, error: insertErr } = await supabase.from("token_launches").insert({
      fusion_id,
      token_name: cleanName,
      token_symbol: cleanSymbol,
      founder_a_user_id: fusion.parent_a_user_id,
      founder_b_user_id: fusion.parent_b_user_id,
      [isA ? "founder_a_eth" : "founder_b_eth"]: ethAmount,
      [isA ? "founder_a_agreed" : "founder_b_agreed"]: true,
      status: "PROPOSING",
    }).select().single();

    if (insertErr) { log("error", "propose insert failed", { error: insertErr.message }); return err("Server error", 500); }

    const otherId = isA ? fusion.parent_b_user_id : fusion.parent_a_user_id;
    await supabase.from("notifications").insert({
      user_id: otherId, type: "token_proposed",
      message: `Your co-founder proposed a token: ${cleanName} ($${cleanSymbol})! Review it.`,
      metadata: JSON.stringify({ launch_id: launch.id, fusion_id }),
    });
    await supabase.from("fusion_activity").insert({
      fusion_id, type: "task",
      content: { action: "token_proposed", launch_id: launch.id, name: cleanName, symbol: cleanSymbol },
    });

    log("info", "Token proposed", { launch_id: launch.id, user: user.id });
    return NextResponse.json({ ok: true, launch });
  }

  // ═══ UPDATE PROPOSAL ═══
  if (action === "update_proposal") {
    const { launch_id, token_name, token_symbol, my_eth } = body;
    if (!launch_id || !isValidUUID(launch_id)) return err("Invalid launch_id");

    const { data: launch } = await supabase.from("token_launches")
      .select("*").eq("id", launch_id).eq("status", "PROPOSING").single();
    if (!launch) return err("Not found or not proposing", 404);

    const isA = launch.founder_a_user_id === user.id;
    if (!isA && launch.founder_b_user_id !== user.id) return err("Not your launch", 403);

    const updates: any = { updated_at: new Date().toISOString() };
    if (token_name) updates.token_name = sanitizeTokenName(token_name);
    if (token_symbol) updates.token_symbol = sanitizeTokenSymbol(token_symbol);
    if (my_eth !== undefined && isValidETHAmount(parseFloat(my_eth))) {
      updates[isA ? "founder_a_eth" : "founder_b_eth"] = parseFloat(my_eth);
    }

    // Reset other founder's agreement when terms change
    updates[isA ? "founder_b_agreed" : "founder_a_agreed"] = false;

    await supabase.from("token_launches").update(updates).eq("id", launch_id);

    const otherId = isA ? launch.founder_b_user_id : launch.founder_a_user_id;
    await supabase.from("notifications").insert({
      user_id: otherId, type: "token_updated",
      message: `Token terms updated for ${updates.token_name || launch.token_name}. Review and agree.`,
      metadata: JSON.stringify({ launch_id }),
    });

    return NextResponse.json({ ok: true });
  }

  // ═══ AGREE ═══
  if (action === "agree") {
    const { launch_id, my_eth } = body;
    if (!launch_id || !isValidUUID(launch_id)) return err("Invalid launch_id");

    const { data: launch } = await supabase.from("token_launches")
      .select("*").eq("id", launch_id).in("status", ["PROPOSING", "AGREED"]).single();
    if (!launch) return err("Not found", 404);

    const isA = launch.founder_a_user_id === user.id;
    if (!isA && launch.founder_b_user_id !== user.id) return err("Not yours", 403);

    const updates: any = {
      [isA ? "founder_a_agreed" : "founder_b_agreed"]: true,
      updated_at: new Date().toISOString(),
    };
    if (my_eth !== undefined && isValidETHAmount(parseFloat(my_eth))) {
      updates[isA ? "founder_a_eth" : "founder_b_eth"] = parseFloat(my_eth);
    }

    const otherAgreed = isA ? launch.founder_b_agreed : launch.founder_a_agreed;
    updates.status = otherAgreed ? "FUNDING" : "AGREED";

    await supabase.from("token_launches").update(updates).eq("id", launch_id);

    if (otherAgreed) {
      for (const uid of [launch.founder_a_user_id, launch.founder_b_user_id]) {
        await supabase.from("notifications").insert({
          user_id: uid, type: "token_ready_to_fund",
          message: `Both founders agreed! Fund your ETH to launch ${launch.token_name}.`,
          metadata: JSON.stringify({ launch_id }),
        });
      }
    } else {
      const otherId = isA ? launch.founder_b_user_id : launch.founder_a_user_id;
      await supabase.from("notifications").insert({
        user_id: otherId, type: "token_co_agreed",
        message: `Co-founder agreed on ${launch.token_name}. Your turn to agree and set ETH.`,
        metadata: JSON.stringify({ launch_id }),
      });
    }

    return NextResponse.json({ ok: true, status: updates.status });
  }

  // ═══ FUND ═══
  if (action === "fund") {
    const { launch_id, tx_hash } = body;
    if (!launch_id || !isValidUUID(launch_id)) return err("Invalid launch_id");

    const { data: launch } = await supabase.from("token_launches")
      .select("*").eq("id", launch_id).eq("status", "FUNDING").single();
    if (!launch) return err("Not in FUNDING status", 404);

    const isA = launch.founder_a_user_id === user.id;
    if (!isA && launch.founder_b_user_id !== user.id) return err("Not yours", 403);
    const alreadyFunded = isA ? launch.founder_a_funded : launch.founder_b_funded;
    if (alreadyFunded) return err("Already funded");

    const updates: any = {
      [isA ? "founder_a_funded" : "founder_b_funded"]: true,
      updated_at: new Date().toISOString(),
    };

    const otherFunded = isA ? launch.founder_b_funded : launch.founder_a_funded;
    if (otherFunded) {
      const totalLiq = (parseFloat(String(launch.founder_a_eth)) || 0) + (parseFloat(String(launch.founder_b_eth)) || 0);
      if (totalLiq <= 0) return err("No ETH contributed");

      const initialPrice = getCurrentPrice(totalLiq, CURVE_SUPPLY);
      updates.status = "LIVE";
      updates.total_liquidity = totalLiq;
      updates.deploy_tx_hash = sanitizeString(tx_hash || "", 66);
      updates.launched_at = new Date().toISOString();
      updates.current_price = initialPrice;
      updates.market_cap = initialPrice * TOTAL_SUPPLY;

      await supabase.from("token_holdings").upsert([
        { launch_id, user_id: launch.founder_a_user_id, balance: FOUNDER_SHARE },
        { launch_id, user_id: launch.founder_b_user_id, balance: FOUNDER_SHARE },
      ], { onConflict: "launch_id,user_id" });

      for (const uid of [launch.founder_a_user_id, launch.founder_b_user_id]) {
        await supabase.from("notifications").insert({
          user_id: uid, type: "token_live",
          message: ` ${launch.token_name} ($${launch.token_symbol}) is LIVE! Liquidity: ${totalLiq.toFixed(4)} ETH`,
          metadata: JSON.stringify({ launch_id }),
        });
      }

      await supabase.from("token_price_history").insert({
        launch_id, price: initialPrice, volume: 0,
        open_price: initialPrice, high_price: initialPrice,
        low_price: initialPrice, close_price: initialPrice, period: "1h",
      });

      await supabase.from("fusion_activity").insert({
        fusion_id: launch.fusion_id, type: "task",
        content: { action: "token_launched", name: launch.token_name, symbol: launch.token_symbol, liquidity: totalLiq },
      });

      log("info", "Token deployed", { launch_id, totalLiq });
    } else {
      const otherId = isA ? launch.founder_b_user_id : launch.founder_a_user_id;
      await supabase.from("notifications").insert({
        user_id: otherId, type: "token_co_funded",
        message: `Co-founder funded! Your turn to fund ETH for ${launch.token_name}.`,
        metadata: JSON.stringify({ launch_id }),
      });
    }

    await supabase.from("token_launches").update(updates).eq("id", launch_id);
    return NextResponse.json({ ok: true, deployed: !!otherFunded });
  }

  // ═══ BUY — with proper bonding curve math + race condition protection ═══
  if (action === "buy") {
    const rl = checkRateLimit(`trade:${user.id}`, RATE_LIMITS.TRADE.max, RATE_LIMITS.TRADE.window);
    if (!rl.allowed) return err("Rate limited. Max 10 trades/minute.", 429);

    const { launch_id, eth_amount, tx_hash } = body;
    if (!launch_id || !isValidUUID(launch_id)) return err("Invalid launch_id");
    const ethAmt = parseFloat(eth_amount);
    if (!isValidETHAmount(ethAmt) || ethAmt < 0.0001) return err("Invalid ETH amount (min 0.0001)");

    // Read current state
    const { data: launch } = await supabase.from("token_launches")
      .select("*").eq("id", launch_id).eq("status", "LIVE").single();
    if (!launch) return err("Token not live", 404);

    const reserveBalance = parseFloat(String(launch.total_liquidity)) || 0;
    const curveTokenBalance = CURVE_SUPPLY - (parseFloat(String(launch.total_trades)) || 0); // Approximate
    const currentPrice = parseFloat(String(launch.current_price)) || 0;

    // Proper bonding curve math matching Solidity
    const { tokensOut, fee, newPrice } = calculateBuyTokens(ethAmt, reserveBalance, Math.max(1, CURVE_SUPPLY * 0.4));

    if (tokensOut <= 0) return err("Trade too small for any tokens");

    // Optimistic concurrency: use updated_at as version check
    const { data: updated, error: updateErr } = await supabase.from("token_launches")
      .update({
        current_price: newPrice,
        total_liquidity: reserveBalance + (ethAmt - fee),
        volume_24h: (parseFloat(String(launch.volume_24h)) || 0) + ethAmt,
        market_cap: newPrice * TOTAL_SUPPLY,
        updated_at: new Date().toISOString(),
      })
      .eq("id", launch_id)
      .eq("updated_at", launch.updated_at) // Optimistic lock
      .select("id").single();

    if (!updated) {
      return err("Price changed. Refresh and retry.", 409);
    }

    await supabase.from("token_trades").insert({
      launch_id, user_id: user.id, type: "buy",
      token_amount: tokensOut, eth_amount: ethAmt,
      price_per_token: currentPrice, platform_fee: fee,
      tx_hash: sanitizeString(tx_hash || "", 66),
    });

    const { data: existing } = await supabase.from("token_holdings")
      .select("balance, total_invested").eq("launch_id", launch_id).eq("user_id", user.id).maybeSingle();

    const newBalance = (existing?.balance || 0) + tokensOut;
    const newInvested = (existing?.total_invested || 0) + ethAmt;
    await supabase.from("token_holdings").upsert({
      launch_id, user_id: user.id,
      balance: newBalance, total_invested: newInvested,
      avg_buy_price: newBalance > 0 ? newInvested / newBalance : 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: "launch_id,user_id" });

    // Notify founders on external buys
    if (user.id !== launch.founder_a_user_id && user.id !== launch.founder_b_user_id) {
      const { data: buyer } = await supabase.from("users").select("name").eq("id", user.id).single();
      for (const uid of [launch.founder_a_user_id, launch.founder_b_user_id]) {
        await supabase.from("notifications").insert({
          user_id: uid, type: "token_bought",
          message: `${buyer?.name || "Someone"} bought ${tokensOut.toLocaleString()} $${launch.token_symbol}!`,
          metadata: JSON.stringify({ launch_id, buyer: user.id }),
        });
      }
    }

    log("info", "Token bought", { launch_id, user: user.id, tokens: tokensOut, eth: ethAmt });
    return NextResponse.json({ ok: true, tokens_received: tokensOut, new_price: newPrice, fee });
  }

  // ═══ SELL — with proper math + race protection ═══
  if (action === "sell") {
    const rl = checkRateLimit(`trade:${user.id}`, RATE_LIMITS.TRADE.max, RATE_LIMITS.TRADE.window);
    if (!rl.allowed) return err("Rate limited. Max 10 trades/minute.", 429);

    const { launch_id, token_amount, tx_hash } = body;
    if (!launch_id || !isValidUUID(launch_id)) return err("Invalid launch_id");
    const tokenAmt = parseFloat(token_amount);
    if (!tokenAmt || tokenAmt <= 0 || tokenAmt > TOTAL_SUPPLY) return err("Invalid token amount");

    const { data: launch } = await supabase.from("token_launches")
      .select("*").eq("id", launch_id).eq("status", "LIVE").single();
    if (!launch) return err("Token not live", 404);

    const { data: holding } = await supabase.from("token_holdings")
      .select("balance").eq("launch_id", launch_id).eq("user_id", user.id).single();
    if (!holding || holding.balance < tokenAmt) return err("Insufficient balance", 400);

    const reserveBalance = parseFloat(String(launch.total_liquidity)) || 0;
    const { ethOut, fee, newPrice } = calculateSellETH(tokenAmt, reserveBalance, CURVE_SUPPLY * 0.4);

    if (ethOut <= 0) return err("Trade too small");
    if (ethOut > reserveBalance) return err("Insufficient liquidity in curve");

    // Optimistic lock
    const { data: updated } = await supabase.from("token_launches")
      .update({
        current_price: newPrice,
        total_liquidity: Math.max(0, reserveBalance - ethOut - fee),
        volume_24h: (parseFloat(String(launch.volume_24h)) || 0) + ethOut + fee,
        market_cap: newPrice * TOTAL_SUPPLY,
        updated_at: new Date().toISOString(),
      })
      .eq("id", launch_id)
      .eq("updated_at", launch.updated_at)
      .select("id").single();

    if (!updated) return err("Price changed. Refresh and retry.", 409);

    await supabase.from("token_trades").insert({
      launch_id, user_id: user.id, type: "sell",
      token_amount: tokenAmt, eth_amount: ethOut,
      price_per_token: parseFloat(String(launch.current_price)), platform_fee: fee,
      tx_hash: sanitizeString(tx_hash || "", 66),
    });

    await supabase.from("token_holdings").update({
      balance: holding.balance - tokenAmt,
      updated_at: new Date().toISOString(),
    }).eq("launch_id", launch_id).eq("user_id", user.id);

    log("info", "Token sold", { launch_id, user: user.id, tokens: tokenAmt, eth: ethOut });
    return NextResponse.json({ ok: true, eth_received: ethOut, new_price: newPrice, fee });
  }

  // ═══ PORTFOLIO ═══
  if (action === "portfolio") {
    const { data: holdings } = await supabase.from("token_holdings")
      .select("*, launch:launch_id(id, token_name, token_symbol, current_price, price_24h_ago, status, fusion_id)")
      .eq("user_id", user.id).gt("balance", 0)
      .order("updated_at", { ascending: false });

    const { data: myLaunches } = await supabase.from("token_launches")
      .select("*")
      .or(`founder_a_user_id.eq.${user.id},founder_b_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    return NextResponse.json({ holdings: holdings || [], launches: myLaunches || [] });
  }

  // ═══ CANCEL ═══
  if (action === "cancel") {
    const { launch_id } = body;
    if (!launch_id || !isValidUUID(launch_id)) return err("Invalid launch_id");
    const { data: launch } = await supabase.from("token_launches")
      .select("*").eq("id", launch_id).in("status", ["PROPOSING", "AGREED", "FUNDING"]).single();
    if (!launch) return err("Cannot cancel", 404);
    if (launch.founder_a_user_id !== user.id && launch.founder_b_user_id !== user.id) return err("Not yours", 403);
    await supabase.from("token_launches").update({ status: "CANCELLED", updated_at: new Date().toISOString() }).eq("id", launch_id);
    log("info", "Launch cancelled", { launch_id, user: user.id });
    return NextResponse.json({ ok: true });
  }

  return err("Unknown action", 400);
}

export const runtime = "nodejs";
