"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CalendarDays, Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { exportReport, generateReport, listReportCatalog, OperationalReport, ReportDefinition } from "@/lib/api";

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const today = isoDate(new Date());
const initialFrom = (() => { const date = new Date(); date.setDate(date.getDate() - 29); return isoDate(date); })();

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return value.toLocaleString("en-KE", { maximumFractionDigits: 2 });
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const date = new Date(text);
    if (!Number.isNaN(date.valueOf())) return date.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
  }
  return text;
};

export default function ReportsPage() {
  const [catalog, setCatalog] = useState<ReportDefinition[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<OperationalReport | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const selected = useMemo(() => catalog.find(item => item.code === selectedCode), [catalog, selectedCode]);

  useEffect(() => {
    void listReportCatalog().then(response => {
      const items = (response.data?.data ?? []) as ReportDefinition[];
      setCatalog(items);
      if (items.length) setSelectedCode(items[0].code);
    }).catch(() => toast.error("The report catalogue could not be loaded."))
      .finally(() => setLoadingCatalog(false));
  }, []);

  const run = useCallback(async () => {
    if (!selectedCode) return;
    if (!from || !to || from > to) { toast.error("Choose a valid date range."); return; }
    setLoading(true);
    try {
      const response = await generateReport(selectedCode, from, to);
      setReport(response.data?.data as OperationalReport);
    } catch {
      toast.error("The report could not be generated for this role and date range.");
    } finally {
      setLoading(false);
    }
  }, [from, selectedCode, to]);

  useEffect(() => { if (selectedCode) void run(); }, [selectedCode, run]);

  const download = async () => {
    if (!selectedCode) return;
    setExporting(true);
    try {
      const response = await exportReport(selectedCode, from, to);
      const url = URL.createObjectURL(new Blob([response.data], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `slickhood-${selectedCode.toLowerCase().replaceAll("_", "-")}-${today}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("The CSV export could not be downloaded.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#ef4217]"><BarChart3 className="h-4 w-4" /> Decision-ready reporting</div>
          <h1 className="text-3xl font-bold tracking-tight text-[#08184a] dark:text-white">Reports</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">Operational, financial, property, security and marketplace reports are automatically restricted to the information your active role may access.</p>
        </div>
        <Button onClick={() => void download()} disabled={!report || exporting} variant="outline" className="gap-2">
          {exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export CSV
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm dark:border-white/10">
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(260px,1fr)_180px_180px_auto] lg:items-end">
          <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Report
            <select value={selectedCode} onChange={event => setSelectedCode(event.target.value)} disabled={loadingCatalog}
              className="h-10 w-full rounded-md border border-slate-300 bg-background px-3 font-normal outline-none focus:border-[#ef4217]">
              {catalog.map(item => <option key={item.code} value={item.code}>{item.title}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">From
            <input type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-background px-3 font-normal" />
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">To
            <input type="date" value={to} min={from} max={today} onChange={event => setTo(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-background px-3 font-normal" />
          </label>
          <Button onClick={() => void run()} disabled={loading || !selectedCode} className="gap-2 bg-[#08184a] text-white hover:bg-[#11265f]">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />} Generate
          </Button>
        </CardContent>
      </Card>

      {loadingCatalog && <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>}
      {!loadingCatalog && catalog.length === 0 && <Card><CardContent className="flex items-center gap-3 p-6 text-sm text-slate-500"><AlertTriangle className="h-5 w-5 text-amber-500" /> No reports are currently available to the active role.</CardContent></Card>}

      {selected && <Card className="border-l-4 border-l-[#ef4217]">
        <CardHeader className="pb-4"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{selected.category}</Badge><Badge variant="secondary">Role scoped</Badge></div><CardTitle className="mt-2">{selected.title}</CardTitle><CardDescription>{selected.description}</CardDescription></CardHeader>
      </Card>}

      {loading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}</div>}

      {!loading && report && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Object.entries(report.metrics).map(([label, value]) => <Card key={label} className="border-slate-200 shadow-sm dark:border-white/10"><CardHeader className="pb-2"><CardDescription>{label}</CardDescription></CardHeader><CardContent><div className="text-2xl font-bold text-[#08184a] dark:text-white">{formatValue(value)}</div></CardContent></Card>)}
        </div>

        <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-white/10">
          <CardHeader className="flex-row items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-[#ef4217]" /> Detail</CardTitle><CardDescription className="mt-1">{report.from} to {report.to} · generated {new Date(report.generatedAt).toLocaleString("en-KE")}</CardDescription></div><Badge variant="outline">{report.rows.length.toLocaleString()} rows</Badge></CardHeader>
          {report.truncated && <div className="mx-6 mb-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="h-4 w-4" /> The on-screen result reached the safe row limit. Narrow the date range for a complete extract.</div>}
          <CardContent className="p-0">
            {report.rows.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">No records were found for this period.</div> :
              <div className="max-h-[620px] overflow-auto"><table className="min-w-full border-collapse text-sm"><thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900"><tr>{report.columns.map(column => <th key={column} className="whitespace-nowrap border-b px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">{column}</th>)}</tr></thead><tbody>{report.rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-slate-100 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">{report.columns.map(column => <td key={column} className="max-w-[280px] whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatValue(row[column])}</td>)}</tr>)}</tbody></table></div>}
          </CardContent>
        </Card>
      </>}
    </div>
  );
}
