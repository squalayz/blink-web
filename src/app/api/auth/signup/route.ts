// BLINK custodial signup — alias for /api/auth/create-wallet. The two endpoint
// names exist because the spec called both. Both accept { username, password }
// and return a session token. Private keys are never returned.

export { POST } from "../create-wallet/route";
