"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HelpDeskArticle, listGuestHelpArticles, listHelpArticles } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

/** Reload current role-visible guidance; never use the administrative article endpoint. */
export default function HelpArticleReferences({ sourceIds }: { sourceIds?: string | null }) {
  const token = useAuthStore(s => s.token);
  const [open, setOpen] = useState(false);
  const [article, setArticle] = useState<HelpDeskArticle>();
  const [notice, setNotice] = useState("");
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  const ids = [...new Set((sourceIds ?? "").split(",").map(Number).filter(id => Number.isSafeInteger(id) && id > 0))].slice(0, 4);
  const view = async (id: number) => {
    const request = ++generation.current;
    setArticle(undefined); setNotice("Loading current guidance…"); setOpen(true);
    try {
      const response = await (token ? listHelpArticles(false) : listGuestHelpArticles());
      if (request !== generation.current) return;
      if (response.data?.success === false) throw new Error("Guidance unavailable");
      const data = response.data?.data;
      const rows: HelpDeskArticle[] = data == null ? [] : Array.isArray(data) ? data : [data];
      const current = rows.find(a => a.id === id && a.published);
      setArticle(current);
      setNotice(current ? "" : "This article is no longer published or available to your current profile. Ask support for current guidance.");
    } catch {
      if (request === generation.current) setNotice("We could not load this guidance. Close this window and try the article again.");
    }
  };
  if (!ids.length) return null;
  return <>
    <div className="mt-2 flex flex-wrap gap-2" aria-label="Answer sources">
      {ids.map(id => <button key={id} type="button" onClick={() => void view(id)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium text-[#141130] hover:bg-orange-50">
        <BookOpen className="h-3 w-3" />Read article {id}
      </button>)}
    </div>
    <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) generation.current++; }}>
      <DialogContent className="z-[90] max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{article?.title ?? "Help guidance"}</DialogTitle>
          <DialogDescription>Current published guidance—not confirmation of your account, payment or unit status.</DialogDescription>
        </DialogHeader>
        {notice && <p role="status" className="text-sm text-slate-600">{notice}</p>}
        {article && <p className="whitespace-pre-wrap text-sm leading-6">{article.body}</p>}
      </DialogContent>
    </Dialog>
  </>;
}
