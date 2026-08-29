"use client";

import {useEffect} from "react";
import {AlertTriangle,RefreshCw} from "lucide-react";
import {Button} from "@/components/ui/button";

export default function WealthError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 useEffect(()=>{console.error("My Wealth render failed",error)},[error]);
 return <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center p-6"><div className="w-full rounded-3xl border bg-white p-8 text-center shadow-sm"><div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600"><AlertTriangle className="size-6"/></div><h1 className="text-2xl font-bold text-[#08184A]">My Wealth could not finish loading</h1><p className="mt-2 text-sm text-muted-foreground">Your information is safe. Retry the page; if a deployment changed while this tab was open, reload once to fetch the matching application files.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Button onClick={reset}><RefreshCw className="mr-2 size-4"/>Try again</Button><Button variant="outline" onClick={()=>location.reload()}>Reload application</Button></div></div></div>
}
