import { ethers } from "ethers";

const RPCS = {
  Ethereum: "https://eth.llamarpc.com",
  Base: "https://mainnet.base.org",
  Arbitrum: "https://arb1.arbitrum.io/rpc",
  Optimism: "https://mainnet.optimism.io",
  Polygon: "https://polygon-rpc.com",
  BSC: "https://bsc-dataseed.binance.org",
};

const WALLETS = [
  ["Platform fee", "0x00468c1B22451ed9Fabc9DA32E6aEa28DC03a216"],
  ["Sweep destination/Genesis owner", "0xb7401d1E52CE927Bb68Ca60DddE0a11dC789b112"],
  ["ALPHA contract owner", "0x1a00e7Dc83bcc62EA20D0d9aCD3ABEbb6Aa50DAb"],
  ["Dormant (old iPhone)", "0x812Ff2420EC87eB40Da80a596f14756ACf98Dacc"],
  ["Mystery (unknown key)", "0x1e99645F4bF67ef1f21502a7b3F402ce320Ea120"],
  ["Raw key swept", "0xC694a2EbB25C64aDF61f40dD5b857613F00379f5"],
  ["ALPHA contract (29 ETH locked)", "0x138C2F1123cF3f82E4596d097c118eAc6684940B"],
];

const out = [];
for (const [label, addr] of WALLETS) {
  const row = { label, addr, balances: {} };
  for (const [chain, rpc] of Object.entries(RPCS)) {
    try {
      const p = new ethers.JsonRpcProvider(rpc);
      const b = await p.getBalance(addr);
      const eth = Number(ethers.formatEther(b));
      if (eth > 0) row.balances[chain] = eth;
    } catch (e) {
      row.balances[chain] = `err: ${e.message.slice(0,30)}`;
    }
  }
  out.push(row);
}

// ETH price
let price = 3500;
try {
  const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
  const j = await r.json();
  price = j.ethereum.usd;
} catch {}

console.log(`ETH price: $${price}\n`);
let total = 0;
for (const w of out) {
  const has = Object.keys(w.balances).length > 0;
  if (!has) {
    console.log(`❌ ${w.label}  ${w.addr}  (empty all chains)`);
    continue;
  }
  console.log(`✅ ${w.label}  ${w.addr}`);
  for (const [c, b] of Object.entries(w.balances)) {
    if (typeof b === "number") {
      const usd = b * price;
      total += usd;
      console.log(`   ${c}: ${b.toFixed(6)} ETH ($${usd.toFixed(2)})`);
    } else {
      console.log(`   ${c}: ${b}`);
    }
  }
}
console.log(`\nTotal recoverable ETH value: $${total.toFixed(2)}`);
