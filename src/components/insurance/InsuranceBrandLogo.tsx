"use client";

import React from "react";
import Image from "next/image";
import {Building2} from "lucide-react";

export function InsuranceBrandLogo({src,name,className="h-16 w-full"}:{src?:string;name:string;className?:string}) {
  if (!src) return <Fallback name={name} className={className}/>;
  return <LogoImage key={src} src={src} name={name} className={className}/>;
}

function LogoImage({src,name,className}:{src:string;name:string;className:string}) {
  const [failed,setFailed]=React.useState(false);
  if (failed) return <Fallback name={name} className={className}/>;
  return <div className={`relative overflow-hidden rounded-xl bg-white ${className}`}>
    <Image unoptimized fill sizes="(max-width: 640px) 70vw, 280px" src={src} alt={`${name} logo`} className="object-contain p-2" onError={()=>setFailed(true)}/>
  </div>;
}

function Fallback({name,className}:{name:string;className:string}) {
  return <div role="img" aria-label={`${name} logo unavailable`} className={`flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 ${className}`}><Building2 className="size-6"/></div>;
}
