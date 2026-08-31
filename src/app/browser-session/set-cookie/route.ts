import { NextResponse } from "next/server";
import { accessTokenMaxAge } from "@/lib/session-token";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : "";
  const maxAge = accessTokenMaxAge(token);
  if (!maxAge || refreshToken.length < 16) {
    return NextResponse.json({ success: false, description: "Invalid session" }, { status: 400 });
  }
  const res = NextResponse.json({ success: true });
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("token", token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge });
  res.cookies.set("refreshToken", refreshToken, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return res;
}
