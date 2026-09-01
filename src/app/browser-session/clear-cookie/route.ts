import { NextResponse } from "next/server";
import { clearAccessTokenCookies } from "@/lib/access-token-cookie";

export async function POST() {
  const res = NextResponse.json({ message: "Logged out successfully" });
  const secure = process.env.NODE_ENV === "production";
  clearAccessTokenCookies(res.cookies);
  res.cookies.set("refreshToken", "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
