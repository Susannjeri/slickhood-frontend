"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default function AuthLandingPage() {
  return (
    // <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 via-white to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
    //   <Card className="w-full max-w-md shadow-xl rounded-2xl">
    //     <CardHeader className="text-center">
    //       <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-100">
    //         Welcome 👋
    //       </CardTitle>
    //       <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
    //         Please log in to your account, or register if you’re new here.
    //       </p>
    //     </CardHeader>

    //     <CardContent className="space-y-6">
    //       {/* Login Button */}
    //       <Button asChild className="w-full text-lg py-6 bg-[#FF3D00]">
    //         <Link href="/login">Login</Link>
    //       </Button>

    //       {/* Register Button */}
    //       <Button asChild variant="outline" className="w-full text-lg py-6">
    //         <Link href="/role">Register</Link>
    //       </Button>
    //     </CardContent>
    //   </Card>
    // </div>
    redirect("/login")
  );
}
