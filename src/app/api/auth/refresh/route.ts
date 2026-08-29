// app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";



export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("refreshToken")?.value;
  if (!refreshToken) {
    return NextResponse.json(
      {
        success: false, 
        description: "No refresh token found", 
        code: "i0000", 
        data: null
      },
      { status: 401 }
    );
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      throw new Error("NEXT_PUBLIC_API_URL is not configured");
    }
    const backendResponse = await axios.post(
      `${apiUrl.replace(/\/$/, "")}/auth/refresh`,
      { refreshToken },
      { headers: { "Content-Type": "application/json" } }
    );
    const response = backendResponse.data;

    if (!response.success) {
      throw new Error(response.description || "Failed to refresh token");
    }

    // Extract the actual token data
    // Your backend returns data as an array with one object
    const tokenData = response.data[0] || response.data;
    const { jwt: accessToken, refreshToken: newRefreshToken } = tokenData;

    if (!accessToken || !newRefreshToken) {
      throw new Error("Invalid token response from backend");
    }

    const nextResponse = NextResponse.json({
      success: true,
      description: response.description,
      code: response.code,
      data: { refreshToken: newRefreshToken },
    }, { status: 200 });

    // ✅ FIXED: Correct secure flag (false in dev, true in prod)
    const isProduction = process.env.NODE_ENV === "production";

    // Update access token
    nextResponse.cookies.set({
      name: "token",
      value: accessToken,
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15, // 15 minutes
    });

    // Update refresh token
    nextResponse.cookies.set({
      name: "refreshToken",
      value: newRefreshToken,
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return nextResponse;
  } catch (error: unknown) {
    const providerDescription = axios.isAxiosError(error)
      ? error.response?.data?.description
      : undefined;
    const localDescription = error instanceof Error ? error.message : undefined;
    return NextResponse.json(
      { 
        success: false,
        description: providerDescription || localDescription || "Failed to refresh token",
        code: "E0000",
        data: null 
      },
      { status: 401 }
    );
  }
}
