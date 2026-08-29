import { NextResponse } from "next/server";

export async function POST () {
    const res = NextResponse.json({ message: "Logged out successfully" }, { status: 200 });
    res.cookies.set("token","", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path:"/",
        maxAge:0,
    })
    res.cookies.set("refreshToken", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    })
    return res;
}
