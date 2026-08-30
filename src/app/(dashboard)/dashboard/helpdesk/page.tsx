"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, BookOpen, CheckCircle2, CircleHelp, Headphones, Loader2, MessageSquarePlus, Search, Send, ShieldAlert, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/authStore";
import { normalizedRoleTitle } from "@/config/businessAreas";
import {
  createHelpConversation, escalateHelpConversation, HelpDeskArticle, HelpDeskConversation,
  listHelpArticles, listHelpConversations, replyToHelpConversation, resolveHelpConversation,
  saveHelpArticle, sendHelpMessage,
} from "@/lib/api";

type Mode = "mine" | "queue" | "knowledge";
const unwrap = <T,>(response: any): T[] => response?.data?.data ?? [];

export default function HelpDeskPage() {
  const activeRole = useAuthStore((s) => s.activeRole?.title);
  const isAdmin = ["superadmin", "support"].includes(normalizedRoleTitle(activeRole));
  const [mode, setMode] = useState<Mode>("mine");
  const [conversations, setConversations] = useState<HelpDeskConversation[]>([]);
  const [articles, setArticles] = useState<HelpDeskArticle[]>([]);
  const [selectedId, setSelectedId] = useState<number>();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [articleEditor, setArticleEditor] = useState<HelpDeskArticle | null>();

  const selected = conversations.find((c) => c.id === selectedId);
  const filteredArticles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return !q ? articles : articles.filter((a) => `${a.title} ${a.category} ${a.body} ${a.keywords ?? ""}`.toLowerCase().includes(q));
  }, [articles, search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === "knowledge") {
        const res = await listHelpArticles(isAdmin);
        setArticles(unwrap<HelpDeskArticle>(res));
      } else {
        const res = await listHelpConversations(mode === "queue");
        const rows = unwrap<HelpDeskConversation>(res);
        setConversations(rows);
        setSelectedId((current) => rows.some((x) => x.id === current) ? current : rows[0]?.id);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.description ?? "Unable to load the Help Desk.");
    } finally { setLoading(false); }
  }, [mode, isAdmin]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { listHelpArticles(false).then((r) => setArticles(unwrap<HelpDeskArticle>(r))).catch(() => undefined); }, []);

  const startConversation = async () => {
    if (!subject.trim()) return;
    setSending(true);
    try {
      const res = await createHelpConversation(subject.trim());
      const created = unwrap<HelpDeskConversation>(res)[0];
      setSubject(""); setMode("mine");
      if (created) { setConversations((old) => [created, ...old]); setSelectedId(created.id); }
    } catch (e: any) { toast.error(e?.response?.data?.description ?? "Could not start the conversation."); }
    finally { setSending(false); }
  };

  const submitMessage = async () => {
    if (!selected || !message.trim()) return;
    setSending(true);
    try {
      const action = mode === "queue" ? replyToHelpConversation : sendHelpMessage;
      const res = await action(selected.id, message.trim());
      const updated = unwrap<HelpDeskConversation>(res)[0];
      setMessage("");
      if (updated) setConversations((old) => old.map((c) => c.id === updated.id ? updated : c));
    } catch (e: any) { toast.error(e?.response?.data?.description ?? "Message could not be sent."); }
    finally { setSending(false); }
  };

  const escalate = async () => {
    if (!selected) return;
    try {
      const res = await escalateHelpConversation(selected.id, "Please transfer this conversation to human support.");
      const updated = unwrap<HelpDeskConversation>(res)[0];
      if (updated) setConversations((old) => old.map((c) => c.id === updated.id ? updated : c));
      toast.success("A human support agent will review this conversation.");
    } catch { toast.error("Could not escalate this conversation."); }
  };

  const resolve = async () => {
    if (!selected) return;
    const res = await resolveHelpConversation(selected.id);
    const updated = unwrap<HelpDeskConversation>(res)[0];
    if (updated) setConversations((old) => old.map((c) => c.id === updated.id ? updated : c));
  };

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 p-4 pb-10 md:p-6">
      <header className="flex flex-col gap-4 rounded-2xl bg-[#141130] p-5 text-white shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-[#EF4217] p-3"><CircleHelp className="h-7 w-7" /></div>
          <div><h1 className="text-2xl font-bold">Slickhood Help Desk</h1><p className="text-sm text-white/70">Fast guidance, grounded answers, and a clear path to human support.</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={mode === "mine" ? "default" : "secondary"} onClick={() => setMode("mine")}>My help</Button>
          {isAdmin && <Button variant={mode === "queue" ? "default" : "secondary"} onClick={() => setMode("queue")}><Headphones className="mr-2 h-4 w-4" />Support queue</Button>}
          <Button variant={mode === "knowledge" ? "default" : "secondary"} onClick={() => setMode("knowledge")}><BookOpen className="mr-2 h-4 w-4" />Knowledge</Button>
        </div>
      </header>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <ShieldAlert className="mr-2 inline h-4 w-4" />Never share passwords, OTPs, PINs, API keys, identity-document numbers, or full card details here.
      </div>

      {mode === "knowledge" ? (
        <KnowledgeView articles={filteredArticles} search={search} setSearch={setSearch} loading={loading}
          isAdmin={isAdmin} onNew={() => setArticleEditor(emptyArticle())} onEdit={setArticleEditor} />
      ) : (
        <div className="grid min-h-[480px] min-w-0 gap-4 xl:min-h-[650px] xl:grid-cols-[300px_minmax(0,1fr)_320px]">
          <Card className="overflow-hidden">
            <CardHeader className="space-y-3 border-b p-4">
              <CardTitle className="text-base">{mode === "queue" ? "Support queue" : "Conversations"}</CardTitle>
              {mode === "mine" && <div className="flex gap-2"><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What do you need help with?" onKeyDown={(e) => e.key === "Enter" && startConversation()} /><Button size="icon" onClick={startConversation} disabled={sending}><MessageSquarePlus className="h-4 w-4" /></Button></div>}
            </CardHeader>
            <ScrollArea className="h-[570px]">
              {loading ? <Loader /> : conversations.length === 0 ? <Empty text={mode === "queue" ? "No support tickets are waiting." : "Start your first help conversation."} /> : conversations.map((c) => (
                <button key={c.id} onClick={() => setSelectedId(c.id)} className={`w-full border-b p-4 text-left transition hover:bg-slate-50 ${selectedId === c.id ? "bg-orange-50" : ""}`}>
                  <div className="mb-2 flex items-start justify-between gap-2"><span className="line-clamp-2 text-sm font-semibold text-[#141130]">{c.subject}</span><Status status={c.status} /></div>
                  <p className="text-xs text-slate-500">{c.activeRole} · {c.priority.toLowerCase()}</p>
                </button>
              ))}
            </ScrollArea>
          </Card>

          <Card className="flex min-h-[480px] min-w-0 flex-col overflow-hidden sm:min-h-[650px]">
            {selected ? <>
              <CardHeader className="flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><CardTitle className="text-lg">{selected.subject}</CardTitle><p className="mt-1 text-xs text-slate-500">Private conversation · {selected.activeRole}</p></div>
                <div className="flex gap-2">{mode === "mine" && !["ESCALATED","ASSIGNED","RESOLVED"].includes(selected.status) && <Button variant="outline" size="sm" onClick={escalate}><UserRound className="mr-2 h-4 w-4" />Human support</Button>}{mode === "queue" && selected.status !== "RESOLVED" && <Button variant="outline" size="sm" onClick={resolve}><CheckCircle2 className="mr-2 h-4 w-4" />Resolve</Button>}</div>
              </CardHeader>
              <ScrollArea className="flex-1 p-4"><div className="space-y-4 pr-3">{selected.messages.length === 0 && <Empty text="Describe the issue below. Slickhood Help will answer or transfer it safely." />}{selected.messages.map((m) => <MessageBubble key={m.id} message={m} />)}</div></ScrollArea>
              <div className="border-t bg-white p-4"><div className="flex items-end gap-2"><Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={selected.status === "RESOLVED" ? "This conversation is resolved" : mode === "queue" ? "Reply as a support agent…" : "Ask Slickhood Help…"} disabled={selected.status === "RESOLVED" || sending} className="min-h-20 resize-none" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitMessage(); } }} /><Button size="icon" className="h-11 w-11 bg-[#EF4217] hover:bg-[#d93a13]" onClick={submitMessage} disabled={sending || !message.trim() || selected.status === "RESOLVED"}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div><p className="mt-2 text-xs text-slate-500">AI guidance can be inaccurate. Verify financial, legal, KYC, and safety decisions with an authorised person.</p></div>
            </> : <Empty text="Select a conversation or start a new one." />}
          </Card>

          <Card className="overflow-hidden"><CardHeader className="border-b p-4"><CardTitle className="text-base">Popular guidance</CardTitle><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search help" /></div></CardHeader><ScrollArea className="h-[570px]"><div className="space-y-3 p-4">{filteredArticles.slice(0,8).map((a) => <article key={a.id} className="rounded-xl border p-3"><Badge variant="secondary" className="mb-2">{a.category}</Badge><h3 className="text-sm font-semibold text-[#141130]">{a.title}</h3><p className="mt-1 line-clamp-4 text-xs leading-5 text-slate-600">{a.body}</p></article>)}</div></ScrollArea></Card>
        </div>
      )}

      <ArticleDialog article={articleEditor} onClose={() => setArticleEditor(undefined)} onSaved={() => { setArticleEditor(undefined); load(); }} />
    </div>
  );
}

function MessageBubble({ message }: { message: any }) {
  const mine = message.senderType === "USER";
  const icon = message.senderType === "AI" ? <Bot className="h-4 w-4" /> : message.senderType === "AGENT" ? <Headphones className="h-4 w-4" /> : <UserRound className="h-4 w-4" />;
  return <div className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 ${mine ? "bg-[#141130] text-white" : "border bg-white text-slate-800"}`}><div className="mb-1 flex items-center gap-2 text-xs font-semibold opacity-70">{icon}{message.senderType === "AI" ? "Slickhood Help" : message.senderType === "AGENT" ? "Support agent" : message.senderType === "SYSTEM" ? "System" : "You"}</div><p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p></div></div>;
}
function Status({ status }: { status: string }) { const styles: Record<string,string>={OPEN:"bg-blue-100 text-blue-800",ESCALATED:"bg-amber-100 text-amber-800",ASSIGNED:"bg-purple-100 text-purple-800",RESOLVED:"bg-green-100 text-green-800"}; return <Badge className={styles[status] ?? ""}>{status.toLowerCase()}</Badge>; }
function Loader(){return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#EF4217]" /></div>}
function Empty({text}:{text:string}){return <div className="flex h-full min-h-40 flex-col items-center justify-center p-8 text-center text-sm text-slate-500"><CircleHelp className="mb-3 h-9 w-9 text-slate-300" />{text}</div>}

function KnowledgeView({articles,search,setSearch,loading,isAdmin,onNew,onEdit}:{articles:HelpDeskArticle[];search:string;setSearch:(v:string)=>void;loading:boolean;isAdmin:boolean;onNew:()=>void;onEdit:(a:HelpDeskArticle)=>void}) {
  return <Card><CardHeader className="flex-col gap-3 border-b md:flex-row md:items-center md:justify-between"><div><CardTitle>Help knowledge</CardTitle><p className="mt-1 text-sm text-slate-500">Approved guidance used by customers, agents, and Slickhood Help.</p></div><div className="flex gap-2"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search articles" /></div>{isAdmin&&<Button onClick={onNew}>New article</Button>}</div></CardHeader><CardContent className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">{loading?<Loader/>:articles.map((a)=><article key={a.id} className="rounded-2xl border bg-white p-5"><div className="mb-3 flex items-center justify-between"><Badge variant="secondary">{a.category}</Badge>{isAdmin&&<Badge variant={a.published?"default":"outline"}>{a.published?"Published":"Draft"}</Badge>}</div><h2 className="font-semibold text-[#141130]">{a.title}</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{a.body}</p>{isAdmin&&<Button className="mt-4" variant="outline" size="sm" onClick={()=>onEdit(a)}>Edit</Button>}</article>)}</CardContent></Card>;
}
const emptyArticle=():HelpDeskArticle=>({id:0,slug:"",title:"",category:"General",body:"",keywords:"",audienceRoles:"",published:false});
function ArticleDialog({article,onClose,onSaved}:{article:HelpDeskArticle|null|undefined;onClose:()=>void;onSaved:()=>void}){
  const [draft,setDraft]=useState<HelpDeskArticle>(emptyArticle()); const [saving,setSaving]=useState(false);
  useEffect(()=>{if(article)setDraft(article)},[article]);
  const update=(key:keyof HelpDeskArticle,value:any)=>setDraft((d)=>({...d,[key]:value}));
  const save=async()=>{setSaving(true);try{const{id,...payload}=draft;await saveHelpArticle(payload,id||undefined);toast.success("Help article saved.");onSaved()}catch(e:any){toast.error(e?.response?.data?.description??"Article could not be saved.")}finally{setSaving(false)}};
  return <Dialog open={!!article} onOpenChange={(open)=>!open&&onClose()}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{draft.id?"Edit help article":"New help article"}</DialogTitle><DialogDescription>Published content is available to the AI assistant. Keep it factual, current, and free of secrets.</DialogDescription></DialogHeader><div className="grid gap-3"><Input value={draft.title} onChange={(e)=>update("title",e.target.value)} placeholder="Title"/><div className="grid gap-3 md:grid-cols-2"><Input value={draft.slug} onChange={(e)=>update("slug",e.target.value)} placeholder="article-slug"/><Input value={draft.category} onChange={(e)=>update("category",e.target.value)} placeholder="Category"/></div><Textarea className="min-h-48" value={draft.body} onChange={(e)=>update("body",e.target.value)} placeholder="Approved guidance"/><Input value={draft.keywords??""} onChange={(e)=>update("keywords",e.target.value)} placeholder="Keywords"/><Input value={draft.audienceRoles??""} onChange={(e)=>update("audienceRoles",e.target.value)} placeholder="Optional roles, comma-separated"/><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.published} onChange={(e)=>update("published",e.target.checked)}/>Publish for customers and AI grounding</label><Button onClick={save} disabled={saving||!draft.title||!draft.slug||!draft.body}>{saving&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save article</Button></div></DialogContent></Dialog>;
}
