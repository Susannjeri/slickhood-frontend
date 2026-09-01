"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { AxiosResponse } from "axios";
import { Bot, ChevronDown, Headphones, Loader2, MessageCircle, Send, ShieldAlert, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/authStore";
import {
  claimGuestHelpConversation, createGuestHelpConversation, createHelpConversation, escalateGuestHelpConversation, escalateHelpConversation,
  getGuestHelpConversation, getHelpConversation, HelpDeskConversation, HelpDeskGuestSession, HelpDeskMessage,
  listHelpConversations, sendGuestHelpMessage, sendHelpMessage,
} from "@/lib/api";

const STORAGE_KEY = "slickhood-help-guest-session";
type ApiEnvelope<T> = { data?: T[]; description?: string };
const unwrapOne = <T,>(response: AxiosResponse<ApiEnvelope<T>>): T | undefined => response.data.data?.[0];
const unwrapMany = <T,>(response: AxiosResponse<ApiEnvelope<T>>): T[] => response.data.data ?? [];

type StoredGuest = { ticketNumber: string; accessToken: string; expiresAt: string };

export default function HelpChatBox() {
  const pathname = usePathname();
  const token = useAuthStore((state) => state.token);
  const sessionReady = useAuthStore((state) => state.sessionReady);
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState<HelpDeskConversation>();
  const [guest, setGuest] = useState<StoredGuest | undefined>(() => readGuestSession());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const endRef = useRef<HTMLDivElement>(null);
  const context = useMemo(() => helpContext(pathname), [pathname]);
  const hidden = pathname === "/dashboard/helpdesk";

  const conversationId = conversation?.id;
  const refresh = useCallback(async () => {
    if (!open) return;
    try {
      if (token && conversationId) {
        const response = await getHelpConversation(conversationId);
        setConversation(unwrapOne<HelpDeskConversation>(response));
      } else if (!token && guest) {
        const response = await getGuestHelpConversation(guest.ticketNumber, guest.accessToken);
        setConversation(unwrapOne<HelpDeskConversation>(response));
      }
    } catch { /* polling must not disrupt the current conversation */ }
  }, [conversationId, guest, open, token]);

  useEffect(() => {
    if (!open) return;
    const initial = window.setTimeout(refresh, 0);
    const timer = window.setInterval(refresh, 15000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [open, refresh]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [conversation?.messages.length, sending]);

  useEffect(() => {
    if (!sessionReady || !token || !guest) return;
    claimGuestHelpConversation(guest.accessToken).then((response) => {
      const claimed = unwrapOne<HelpDeskConversation>(response);
      if (claimed) setConversation(claimed);
      sessionStorage.removeItem(STORAGE_KEY); setGuest(undefined);
    }).catch(() => undefined);
  }, [guest, sessionReady, token]);

  useEffect(() => {
    if (!open || !token || conversation) return;
    listHelpConversations(false).then(async (response) => {
      const latest = unwrapMany<HelpDeskConversation>(response)[0];
      if (!latest) return;
      const detail = await getHelpConversation(latest.id);
      setConversation(unwrapOne<HelpDeskConversation>(detail));
    }).catch(() => undefined);
  }, [conversation, open, token]);

  const send = async (preset?: string) => {
    const text = (preset ?? message).trim();
    if (!text || sending) return;
    setSending(true); setError(undefined);
    try {
      let active = conversation;
      let activeGuest = guest;
      if (!active) {
        if (token) {
          const created = await createHelpConversation(text.slice(0, 120), context.category, pathname);
          active = unwrapOne<HelpDeskConversation>(created);
        } else {
          const created = await createGuestHelpConversation(text.slice(0, 120), context.category, pathname);
          const session = unwrapOne<HelpDeskGuestSession>(created);
          active = session?.conversation;
          if (session) {
            activeGuest = { ticketNumber: session.conversation.ticketNumber, accessToken: session.accessToken, expiresAt: session.expiresAt };
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(activeGuest)); setGuest(activeGuest);
          }
        }
      }
      if (!active) throw new Error("Could not start a help conversation.");
      const response = token
        ? await sendHelpMessage(active.id, text)
        : await sendGuestHelpMessage(active.ticketNumber, activeGuest!.accessToken, text);
      setConversation(unwrapOne<HelpDeskConversation>(response)); setMessage("");
    } catch (caught: unknown) {
      setError(helpError(caught));
    } finally { setSending(false); }
  };

  const humanSupport = async () => {
    if (!conversation) { await send("I would like help from a human support agent."); return; }
    setSending(true);
    try {
      const response = token
        ? await escalateHelpConversation(conversation.id, "Please transfer this conversation to human support.")
        : await escalateGuestHelpConversation(conversation.ticketNumber, guest!.accessToken);
      setConversation(unwrapOne<HelpDeskConversation>(response));
    } catch { setError("Human support could not be requested. Please try again."); }
    finally { setSending(false); }
  };

  if (hidden) return null;
  return <>
    {!open && <button type="button" aria-label="Open Slickhood Help" onClick={() => setOpen(true)}
      className="fixed bottom-5 right-5 z-[70] flex items-center gap-2 rounded-full border border-white/20 bg-[#EF4217] px-4 py-3 font-semibold text-white shadow-[0_14px_36px_rgba(20,17,48,0.28)] transition hover:bg-[#d93a13] focus:outline-none focus:ring-4 focus:ring-[#EF4217]/25">
      <MessageCircle className="h-5 w-5" /><span className="hidden sm:inline">Help</span>
    </button>}
    {open && <section aria-label="Slickhood Help chat" className="fixed inset-x-3 bottom-3 z-[70] flex max-h-[min(720px,calc(100vh-24px))] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl sm:left-auto sm:right-5 sm:w-[390px]">
      <header className="flex items-center justify-between border-b-4 border-[#EF4217] bg-[#141130] px-4 py-3 text-white">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-[#EF4217] p-2 shadow-sm"><Bot className="h-5 w-5" /></span><div><h2 className="font-semibold"><span className="text-white">Slick</span><span className="text-[#EF4217]">Hood</span> Help</h2><p className="text-xs text-white/70">Guidance with human support when needed</p></div></div>
        <div className="flex"><Button size="icon" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setOpen(false)} aria-label="Minimise help"><ChevronDown className="h-5 w-5" /></Button><Button size="icon" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => { setOpen(false); setConversation(undefined); }} aria-label="Close help"><X className="h-5 w-5" /></Button></div>
      </header>
      <div className="border-b bg-orange-50 px-4 py-2 text-xs text-orange-900"><ShieldAlert className="mr-1 inline h-3.5 w-3.5" />Never share passwords, OTPs, PINs or full card details.</div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-[#EF4217]/[0.06] to-slate-50 p-4">
        {!conversation && <div className="space-y-4"><div className="rounded-2xl border border-[#141130]/10 bg-white p-4 shadow-sm"><p className="font-medium text-[#141130]">How can I help with {context.label}?</p><p className="mt-1 text-sm text-slate-600">Choose a common question or type your own. You can ask for a person at any time.</p></div><div className="grid gap-2">{context.prompts.map((prompt) => <button key={prompt} onClick={() => send(prompt)} className="rounded-xl border border-[#141130]/10 bg-white px-3 py-2 text-left text-sm text-[#141130] transition hover:border-[#EF4217] hover:bg-[#EF4217]/5 hover:text-[#EF4217]">{prompt}</button>)}</div></div>}
        <div className="space-y-3">{conversation?.messages.map((item) => <ChatMessage key={item.id} message={item} />)}{sending && <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Slickhood Help is responding…</div>}<div ref={endRef} /></div>
      </div>
      {error && <p role="alert" className="border-t bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>}
      <footer className="border-t bg-white p-3">
        {conversation && <div className="mb-2 flex items-center justify-between text-xs text-slate-500"><span>{conversation.ticketNumber} · {statusLabel(conversation.status)}</span><button onClick={humanSupport} disabled={sending || ["ESCALATED","WAITING_FOR_SUPPORT","ASSIGNED"].includes(conversation.status)} className="flex items-center gap-1 font-medium text-[#EF4217] disabled:text-slate-400"><Headphones className="h-3.5 w-3.5" />Talk to a person</button></div>}
        <div className="flex items-end gap-2"><Textarea aria-label="Message Slickhood Help" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} placeholder="Type your question…" className="min-h-12 max-h-28 resize-none" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} /><Button size="icon" className="h-11 w-11 shrink-0 bg-[#EF4217] hover:bg-[#d93a13]" onClick={() => send()} disabled={!message.trim() || sending}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div>
        <p className="mt-2 text-center text-[11px] text-slate-400">AI guidance may be inaccurate. Important decisions are transferred to authorised staff.</p>
      </footer>
    </section>}
  </>;
}

function ChatMessage({ message }: { message: HelpDeskMessage }) {
  const mine = message.senderType === "USER";
  return <div className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-5 ${mine ? "bg-[#141130] text-white" : "border bg-white text-slate-800"}`}><div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold opacity-70">{message.senderType === "AI" ? <Bot className="h-3.5 w-3.5" /> : message.senderType === "AGENT" ? <Headphones className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}{message.senderType === "USER" ? "You" : message.senderType === "AGENT" ? "Support agent" : message.senderType === "SYSTEM" ? "Slickhood" : "Slickhood Help"}</div><p className="whitespace-pre-wrap">{message.content}</p></div></div>;
}

function helpContext(pathname: string) {
  if (/register|verify-code|auth_select|role/.test(pathname)) return { category: "REGISTRATION", label: "registration", prompts: ["How do I complete registration?", "I did not receive my verification code", "Which role should I choose?"] };
  if (/kyc/.test(pathname)) return { category: "KYC", label: "account verification", prompts: ["Which verification documents are required?", "Why was my document not accepted?", "How is my information protected?"] };
  if (/payment|invoice/.test(pathname)) return { category: "PAYMENTS", label: "payments", prompts: ["Why is my payment still pending?", "Where can I find my receipt?", "Which payment methods can I use?"] };
  if (/insurance/.test(pathname)) return { category: "INSURANCE", label: "insurance", prompts: ["How do I request an insurance quote?", "How can I renew my policy?", "How do I submit a claim?"] };
  if (/wealth/.test(pathname)) return { category: "WEALTH", label: "your wealth workspace", prompts: ["How do I add an asset?", "How are portfolio values calculated?", "Where can I save an asset document?"] };
  if (/affiliate/.test(pathname)) return { category: "AFFILIATE", label: "the affiliate programme", prompts: ["How do referral commissions work?", "When can I request a payout?", "Where can I see my referrals?"] };
  if (/visitor|smart-gate/.test(pathname)) return { category: "VISITORS", label: "visitor access", prompts: ["How do I register a visitor?", "How does gate approval work?", "How do I cancel visitor access?"] };
  if (/sale|buyer|offer/.test(pathname)) return { category: "SALES", label: "property sales", prompts: ["How do I list a property for sale?", "How does the letter of offer work?", "How can I track a sale?"] };
  if (/soko|service/.test(pathname)) return { category: pathname.includes("soko") ? "SOKO" : "SERVICES", label: "this marketplace", prompts: ["How does delivery work?", "How do I report a problem?", "When is payment released?"] };
  if (/lease|tenant|rental/.test(pathname)) return { category: "RENTALS", label: "rentals and leases", prompts: ["How does tenant onboarding work?", "Where are lease documents managed?", "How are rent reminders handled?"] };
  if (/property|unit|estate/.test(pathname)) return { category: "PROPERTY", label: "property management", prompts: ["How do I add a property or unit?", "How do I configure an estate?", "Where can I manage property staff?"] };
  return { category: "GENERAL", label: "Slickhood", prompts: ["Show me how to get started", "Where can I manage my account?", "I would like help from a person"] };
}

function statusLabel(status: HelpDeskConversation["status"]) {
  return ({ OPEN: "Open", ESCALATED: "Waiting for support", ASSIGNED: "Assigned", WAITING_FOR_SUPPORT: "Waiting for support", WAITING_FOR_CUSTOMER: "Waiting for you", RESOLVED: "Resolved" } as const)[status];
}

function readGuestSession(): StoredGuest | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const stored = JSON.parse(raw) as StoredGuest;
    if (new Date(stored.expiresAt).getTime() > Date.now()) return stored;
  } catch { /* discard malformed client state */ }
  sessionStorage.removeItem(STORAGE_KEY);
  return undefined;
}

function helpError(caught: unknown) {
  if (typeof caught === "object" && caught !== null) {
    const error = caught as { message?: string; response?: { data?: { description?: string } } };
    return error.response?.data?.description ?? error.message ?? "Slickhood Help is temporarily unavailable. Please try again.";
  }
  return "Slickhood Help is temporarily unavailable. Please try again.";
}
