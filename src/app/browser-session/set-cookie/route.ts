import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { token, refreshToken } = await req.json();
  if (!token || !refreshToken) {
    return NextResponse.json({ success: false, description: "Invalid session" }, { status: 400 });
  }
  const res = NextResponse.json({ success: true });
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("token", token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 });
  res.cookies.set("refreshToken", refreshToken, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return res;
}
