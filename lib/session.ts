import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/config";

/** The JWT from the HttpOnly session cookie, for route handlers. Server-only. */
export async function sessionToken(): Promise<string | null> {
  return (await cookies()).get(AUTH_COOKIE_NAME)?.value ?? null;
}
