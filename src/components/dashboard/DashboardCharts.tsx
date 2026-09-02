"use client";

import { cn } from "@/lib/utils";

export type ChartDatum = { label: string; value: number; color?: string };

const PALETTE = ["#EF4217", "#2563EB", "#10B981", "#8B5CF6", "#F59E0B", "#64748B"];

export function ProgressDonut({ value, label, detail, className }: { value: number; label: string; detail?: string; className?: string }) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  return <div className={cn("flex flex-col items-center gap-3 sm:flex-row", className)} role="img" aria-label={`${label}: ${Math.round(safe)} percent`}>
    <div className="relative size-32 shrink-0">
      <svg viewBox="0 0 104 104" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="52" cy="52" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-100 dark:text-white/10" />
        <circle cx="52" cy="52" r={radius} fill="none" stroke="#EF4217" strokeLinecap="round" strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={circumference * (1-safe/100)} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center"><span className="text-2xl font-bold text-slate-950 dark:text-white">{Math.round(safe)}%</span></div>
    </div>
    <div className="text-center sm:text-left"><p className="font-semibold text-slate-950 dark:text-white">{label}</p>{detail&&<p className="mt-1 text-sm text-muted-foreground">{detail}</p>}</div>
  </div>;
}

export function DistributionChart({ data, ariaLabel, emptyText="No activity is available for this period." }: { data: ChartDatum[]; ariaLabel: string; emptyText?: string }) {
  const clean = data.filter(item => Number.isFinite(item.value) && item.value >= 0);
  const max = Math.max(1, ...clean.map(item => item.value));
  if (!clean.length) return <p className="py-10 text-center text-sm text-muted-foreground">{emptyText}</p>;
  return <div className="space-y-4" role="img" aria-label={ariaLabel}>
    {clean.map((item,index)=><div key={item.label}>
      <div className="mb-1.5 flex items-center justify-between gap-4 text-sm"><span className="truncate font-medium text-slate-700 dark:text-slate-200">{item.label}</span><span className="tabular-nums font-semibold text-slate-950 dark:text-white">{item.value.toLocaleString()} items</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full min-w-1 rounded-full transition-all duration-700" style={{width:`${item.value===0?0:Math.max(3,item.value/max*100)}%`,backgroundColor:item.color??PALETTE[index%PALETTE.length]}} /></div>
    </div>)}
  </div>;
}

export function TrendChart({ data, ariaLabel, valueFormatter=(value)=>value.toLocaleString() }: { data: ChartDatum[]; ariaLabel: string; valueFormatter?: (value:number)=>string }) {
  const clean = data.filter(item => Number.isFinite(item.value));
  if (clean.length < 2) return <p className="py-10 text-center text-sm text-muted-foreground">At least two data points are needed to show a trend.</p>;
  const width=640,height=210,padX=24,padY=24;
  const min=Math.min(...clean.map(d=>d.value)),max=Math.max(...clean.map(d=>d.value));
  const range=Math.max(1,max-min);
  const points=clean.map((d,i)=>({ ...d, x:padX+i*(width-padX*2)/(clean.length-1), y:height-padY-(d.value-min)*(height-padY*2)/range }));
  const line=points.map(p=>`${p.x},${p.y}`).join(" ");
  const area=`${padX},${height-padY} ${line} ${width-padX},${height-padY}`;
  return <div role="img" aria-label={ariaLabel}>
    <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="slickhood-trend" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#EF4217" stopOpacity=".24"/><stop offset="1" stopColor="#EF4217" stopOpacity="0"/></linearGradient></defs>
      {[0,.5,1].map(t=><line key={t} x1={padX} x2={width-padX} y1={padY+t*(height-padY*2)} y2={padY+t*(height-padY*2)} stroke="currentColor" className="text-slate-200 dark:text-white/10" strokeDasharray="4 6" />)}
      <polygon points={area} fill="url(#slickhood-trend)"/><polyline points={line} fill="none" stroke="#EF4217" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
      {points.map(p=><circle key={p.label} cx={p.x} cy={p.y} r="5" fill="white" stroke="#EF4217" strokeWidth="3" vectorEffect="non-scaling-stroke"/>)}
    </svg>
    <div className="mt-1 flex justify-between gap-2 text-xs text-muted-foreground"><span>{clean[0].label}<strong className="mt-0.5 block text-slate-700 dark:text-slate-200">{valueFormatter(clean[0].value)}</strong></span><span className="text-right">{clean.at(-1)?.label}<strong className="mt-0.5 block text-slate-700 dark:text-slate-200">{valueFormatter(clean.at(-1)?.value??0)}</strong></span></div>
  </div>;
}
