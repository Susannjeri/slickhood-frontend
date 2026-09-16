import { NextResponse } from "next/server";
import { accessTokenMaxAge } from "@/lib/session-token";
import { writeAccessTokenCookies } from "@/lib/access-token-cookie";
import { rejectUnsafeBrowserSessionMutation } from "@/lib/browser-session-security";

export async function POST(req: Request) {
  const rejected = rejectUnsafeBrowserSessionMutation(req);
  if (rejected) return NextResponse.json({ success: false, description: rejected.description }, { status: rejected.status });
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : "";
  const maxAge = accessTokenMaxAge(token);
  if (!maxAge || refreshToken.length < 16) {
    return NextResponse.json({ success: false, description: "Invalid session" }, { status: 400 });
  }

  const res = NextResponse.json({ success: true });
  writeAccessTokenCookies(res.cookies, token, maxAge);

  res.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

  return res;
}
