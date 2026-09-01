import { NextRequest, NextResponse } from "next/server";
import { readAccessTokenCookie } from "@/lib/access-token-cookie";

export async function GET(req: NextRequest) {
  const token = readAccessTokenCookie(req.cookies);
  if (!token) {
    return NextResponse.json(
      { success: false, description: "No token found", code: "i0000", data: null },
      { status: 401 },
    );
  }
  return NextResponse.json({ success: true, description: "Token retrieved", code: "i0001", data: { jwt: token } });
}
