# What We Never Do

BLINK is wallet-aware, not wallet-custodial. This document lists what we do
not — and will not — do with your wallet. It is linked directly from the
sign-in screen so anyone can verify these guarantees before connecting.

## We never ask for your private keys

Not a seed phrase, not a hex private key, not a JSON keystore, not a paper
backup. The sign-in flow uses Sign-In With Ethereum (EIP-4361). You sign a
plain-text message that proves you control the address — nothing more.

## We never request transaction signatures

The only signature BLINK asks for is the EIP-4361 SIWE login message. We never
prompt for `eth_sendTransaction`, contract approvals, ERC-20 `approve`,
`setApprovalForAll`, or any signature that could move your tokens.

## We never gain access to your funds

The SIWE signature is a proof of address ownership. It cannot be replayed onto
the chain. It cannot authorize transfers. It cannot drain your wallet. After
you sign it once, the session lives in an httpOnly cookie that the server uses
to look up your address.

## We never broadcast on your behalf

BLINK does not relay, sponsor, or send transactions for users who logged in
via wallet. If you want to mint a Genesis or trade a Mythic you do that on
[mintmyblink.com](https://mintmyblink.com) or OpenSea — outside our system.

## We never store keys

There is no server-side key vault for SIWE wallets. There is no encrypted
"BLINK private key" persisted anywhere for accounts that signed in with a
wallet. The wallet stays where it always was — in your wallet app.

## We only read public on-chain data

When you log in we use a server-side [Alchemy](https://www.alchemy.com/) API
key to call `getNFTsForOwner` against the BLINK Genesis and Mythic contracts.
This is the same data anyone in the world can query about your wallet. We
cache the result for 60 seconds per wallet.

## The session is short-lived

The httpOnly session cookie expires in 24 hours. After that you sign a new
SIWE message. There is no refresh token, no long-lived API key, no remote
device list.

## You can disconnect at any time

Disconnecting from your wallet app — or hitting "Sign out" inside BLINK — both
clear the session cookie. The next visit asks you to sign in again.

## Where this is enforced in the code

- SIWE issue/verify: `src/app/api/auth/siwe/`
- Session cookie: `src/lib/siwe-session.ts` (HS256 JWT, httpOnly, sameSite=lax)
- Public read-only Alchemy client: `src/lib/wallet-nfts.ts`
- No `eth_sendTransaction` or `eth_signTypedData` callers exist in
  the Phase 3 wallet auth path. Grep `src/` to verify.

If you spot anything in BLINK that contradicts the above, file an issue —
we'll treat it as a security bug.
