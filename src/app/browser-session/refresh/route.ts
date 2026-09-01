import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import { accessTokenMaxAge } from "@/lib/session-token";
import { clearAccessTokenCookies, writeAccessTokenCookies } from "@/lib/access-token-cookie";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("refreshToken")?.value;
  if (!refreshToken) {
    return NextResponse.json({ success: false, description: "No refresh token found", code: "i0000", data: null }, { status: 401 });
  }
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is not configured");
    const backendResponse = await axios.post(`${apiUrl.replace(/\/$/, "")}/auth/refresh`, { refreshToken });
    const provider = backendResponse.data;
    const tokenData = provider.data?.[0] ?? provider.data;
    const accessToken = tokenData?.jwt;
    const newRefreshToken = tokenData?.refreshToken;
    const maxAge = typeof accessToken === "string" ? accessTokenMaxAge(accessToken) : null;
    if (!provider.success || !accessToken || !newRefreshToken || !maxAge) throw new Error(provider.description || "Invalid token response from backend");

    const res = NextResponse.json({ success: true, description: provider.description, code: provider.code });
    writeAccessTokenCookies(res.cookies, accessToken, maxAge);
    const secure = process.env.NODE_ENV === "production";
    res.cookies.set("refreshToken", newRefreshToken, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch (error: unknown) {
    const providerDescription = axios.isAxiosError(error) ? error.response?.data?.description : undefined;
    const localDescription = error instanceof Error ? error.message : undefined;
    const res = NextResponse.json({ success: false, description: providerDescription || localDescription || "Failed to refresh token", code: "E0000", data: null }, { status: 401 });
    clearAccessTokenCookies(res.cookies);
    res.cookies.set("refreshToken", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    return res;
  }
}
