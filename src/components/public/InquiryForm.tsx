"use client";
import { FormEvent, useState } from "react";
import { apiBase } from "@/lib/property-listings";

export default function InquiryForm({ slug }: { slug: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "limited" | "error">("idle");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState("sending");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    const response = await fetch(`${apiBase()}/public/property-listings/${encodeURIComponent(slug)}/inquiries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, consent: form.get("consent") === "on" }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    setState(response?.ok ? "sent" : response?.status === 429 ? "limited" : "error");
  }
  if (state === "sent") return <div role="status" className="rounded-2xl bg-emerald-50 p-6 text-emerald-900"><p className="font-bold">Your enquiry has been sent.</p><p className="mt-1 text-sm">The property owner or appointed agent will contact you.</p></div>;
  return <form onSubmit={submit} aria-busy={state === "sending"} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Full name<input name="name" required maxLength={120} autoComplete="name" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 outline-none focus:border-[#EF4217]" /></label><label className="text-sm font-medium">Phone<input name="phone" type="tel" maxLength={40} autoComplete="tel" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 outline-none focus:border-[#EF4217]" /></label></div>
    <label className="block text-sm font-medium">Email<input name="email" type="email" required maxLength={180} autoComplete="email" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 outline-none focus:border-[#EF4217]" /></label>
    <label className="block text-sm font-medium">Message<textarea name="message" required maxLength={1000} rows={4} defaultValue="I am interested in this property. Please contact me to arrange a viewing." className="mt-1.5 w-full resize-none rounded-xl border border-slate-300 px-3.5 py-3 outline-none focus:border-[#EF4217]" /></label>
    <label className="hidden" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <label className="flex items-start gap-2.5 text-xs text-slate-600"><input name="consent" type="checkbox" required className="mt-0.5" />I agree that Slickhood may share these details with the property owner or appointed agent for this enquiry.</label>
    {state === "limited" && <p role="alert" className="text-sm text-amber-700">You have sent several enquiries. Please wait a minute before trying again.</p>}
    {state === "error" && <p role="alert" className="text-sm text-red-600">We could not send your enquiry. Check your connection and details, then try again.</p>}
    <button disabled={state === "sending"} className="w-full rounded-xl bg-[#EF4217] px-5 py-3.5 font-bold text-white hover:bg-[#d93612] disabled:opacity-60">{state === "sending" ? "Sending…" : "Request a viewing"}</button>
  </form>;
}
