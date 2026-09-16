import { NextResponse } from "next/server";
import { clearAccessTokenCookies } from "@/lib/access-token-cookie";
import { rejectUnsafeBrowserSessionMutation } from "@/lib/browser-session-security";

export async function POST(request: Request) {
  const rejected = rejectUnsafeBrowserSessionMutation(request);
  if (rejected) return NextResponse.json({ success: false, description: rejected.description }, { status: rejected.status });
  const res = NextResponse.json({ message: "Logged out successfully" });
  const secure = process.env.NODE_ENV === "production";
  clearAccessTokenCookies(res.cookies);
  res.cookies.set("refreshToken", "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
