import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET_STR = process.env.NEXTAUTH_SECRET;
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STR || "dev-only-insecure-key-do-not-use-in-prod");

export interface SessionUser {
  id: string;
  address: string;
}

/**
 * Get current user from SIWE JWT session cookie.
 * Drop-in replacement for getServerSession(authOptions).
 * 
 * Usage in any API route:
 *   const user = await getSessionUser();
 *   if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *   // user.id, user.address available
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get("mm-session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.sub) return null;
    return { id: payload.sub, address: payload.address as string };
  } catch {
    return null;
  }
}
