"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BarChart3, CalendarDays, Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/api-error";
import { exportReport, generateReport, listReportCatalog, OperationalReport, ReportDefinition } from "@/lib/api";

const localIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localIsoDate(date);
};
const today = localIsoDate(new Date());
const historicalFrom = addDays(today, -29);

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

const datesFor = (definition: ReportDefinition) => {
  if (definition.dateMode === "FORWARD") return { from: today, to: addDays(today, 90) };
  if (definition.dateMode === "SNAPSHOT") return { from: today, to: today };
  return { from: historicalFrom, to: today };
};

export default function ReportsPage() {
  const [catalog, setCatalog] = useState<ReportDefinition[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [from, setFrom] = useState(historicalFrom);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<OperationalReport | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogFailed, setCatalogFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const requestId = useRef(0);

  const selected = useMemo(() => catalog.find(item => item.code === selectedCode), [catalog, selectedCode]);
  const groupedCatalog = useMemo(() => {
    const groups = new Map<string, ReportDefinition[]>();
    catalog.forEach(item => groups.set(item.category, [...(groups.get(item.category) ?? []), item]));
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [catalog]);

  const runReport = useCallback(async (code: string, start: string, end: string) => {
    if (!code) return;
    if (!start || !end || start > end || addDays(start, 366) < end) {
      toast.error("Choose a valid date range of no more than 366 days.");
      return;
    }
    const currentRequest = ++requestId.current;
    setLoading(true);
    try {
      const response = await generateReport(code, start, end);
      if (currentRequest !== requestId.current) return;
      const next = response.data?.data as OperationalReport | undefined;
      if (!next || !Array.isArray(next.rows) || !Array.isArray(next.columns)) throw new Error("Invalid report response");
      setReport(next);
    } catch (error: unknown) {
      if (currentRequest !== requestId.current) return;
      setReport(null);
      toast.error(apiErrorMessage(error, "The report could not be generated for this role and date range."));
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    setCatalogFailed(false);
    try {
      const response = await listReportCatalog();
      const items = Array.isArray(response.data?.data) ? response.data.data as ReportDefinition[] : [];
      setCatalog(items);
      if (items.length) {
        const first = items[0];
        const dates = datesFor(first);
        setSelectedCode(first.code);
        setFrom(dates.from);
        setTo(dates.to);
        await runReport(first.code, dates.from, dates.to);
      } else {
        setSelectedCode("");
        setReport(null);
      }
    } catch (error: unknown) {
      setCatalogFailed(true);
      toast.error(apiErrorMessage(error, "The report catalogue could not be loaded."));
    } finally {
      setLoadingCatalog(false);
    }
  }, [runReport]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCatalog(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCatalog]);

  const selectReport = (code: string) => {
    const definition = catalog.find(item => item.code === code);
    if (!definition) return;
    const dates = datesFor(definition);
    setSelectedCode(code);
    setFrom(dates.from);
    setTo(dates.to);
    setReport(null);
    void runReport(code, dates.from, dates.to);
  };

  const reportMatchesFilters = !!report && report.definition.code === selectedCode &&
    (selected?.dateMode === "SNAPSHOT" || (report.from === from && report.to === to));

  const download = async () => {
    if (!selectedCode || !reportMatchesFilters) return;
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
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      if (response.headers["x-report-truncated"] === "true") {
        const limit = Number(response.headers["x-report-row-limit"] ?? 5_000).toLocaleString();
        toast.warning(`The export reached its ${limit}-row safety limit. Narrow the date range for a complete export.`);
      }
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, "The CSV export could not be downloaded."));
    } finally {
      setExporting(false);
    }
  };

  const dateMaximum = selected?.dateMode === "FORWARD" ? addDays(today, 366) : today;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#ef4217]"><BarChart3 className="h-4 w-4" /> Decision-ready reporting</div>
          <h1 className="text-3xl font-bold tracking-tight text-[#08184a] dark:text-white">Reports</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">Operational, financial, property, security and marketplace reports are restricted to records available to your active role.</p>
        </div>
        <Button onClick={() => void download()} disabled={!reportMatchesFilters || exporting || loading} variant="outline" className="gap-2">
          {exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export CSV
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm dark:border-white/10">
        <CardContent className={`grid gap-4 p-5 ${selected?.supportsDateRange ? "lg:grid-cols-[minmax(260px,1fr)_180px_180px_auto]" : "lg:grid-cols-[minmax(260px,1fr)_auto]"} lg:items-end`}>
          <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Report
            <select value={selectedCode} onChange={event => selectReport(event.target.value)} disabled={loadingCatalog || loading}
              className="h-10 w-full rounded-md border border-slate-300 bg-background px-3 font-normal outline-none focus:border-[#ef4217]">
              {groupedCatalog.map(([category, items]) => <optgroup key={category} label={category}>{items.map(item => <option key={item.code} value={item.code}>{item.title}</option>)}</optgroup>)}
            </select>
          </label>
          {selected?.supportsDateRange && <>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">From
              <input type="date" value={from} max={to} onChange={event => { setFrom(event.target.value); setReport(null); }} className="h-10 w-full rounded-md border border-slate-300 bg-background px-3 font-normal" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">To
              <input type="date" value={to} min={from} max={dateMaximum} onChange={event => { setTo(event.target.value); setReport(null); }} className="h-10 w-full rounded-md border border-slate-300 bg-background px-3 font-normal" />
            </label>
          </>}
          <Button onClick={() => void runReport(selectedCode, from, to)} disabled={loading || !selectedCode} className="gap-2 bg-[#08184a] text-white hover:bg-[#11265f]">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />} {selected?.dateMode === "SNAPSHOT" ? "Refresh" : "Generate"}
          </Button>
        </CardContent>
      </Card>

      {loadingCatalog && <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>}
      {catalogFailed && <Card><CardContent className="flex flex-col items-center gap-3 p-8 text-sm text-slate-500"><AlertTriangle className="h-6 w-6 text-amber-500" /><p>The report catalogue could not be loaded.</p><Button variant="outline" onClick={() => void loadCatalog()}>Try again</Button></CardContent></Card>}
      {!loadingCatalog && !catalogFailed && catalog.length === 0 && <Card><CardContent className="flex items-center gap-3 p-6 text-sm text-slate-500"><AlertTriangle className="h-5 w-5 text-amber-500" /> No reports are currently available to the active role.</CardContent></Card>}

      {selected && <Card className="border-l-4 border-l-[#ef4217]">
        <CardHeader className="pb-4"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{selected.category}</Badge><Badge variant="secondary">Role scoped</Badge><Badge variant="secondary">{selected.dateMode === "FORWARD" ? "Forward looking" : selected.dateMode === "SNAPSHOT" ? "Current snapshot" : "Historical"}</Badge></div><CardTitle className="mt-2">{selected.title}</CardTitle><CardDescription>{selected.description}</CardDescription></CardHeader>
      </Card>}

      {loading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}</div>}

      {!loading && report && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Object.entries(report.metrics).map(([label, value]) => <Card key={label} className="border-slate-200 shadow-sm dark:border-white/10"><CardHeader className="pb-2"><CardDescription>{label}</CardDescription></CardHeader><CardContent><div className="break-words text-2xl font-bold text-[#08184a] dark:text-white">{formatValue(value)}</div></CardContent></Card>)}
        </div>

        <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-white/10">
          <CardHeader className="flex-col items-start gap-4 sm:flex-row sm:justify-between"><div><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-[#ef4217]" /> Detail</CardTitle><CardDescription className="mt-1">{report.definition.dateMode === "SNAPSHOT" ? `Snapshot at ${report.from}` : `${report.from} to ${report.to}`} · generated {new Date(report.generatedAt).toLocaleString("en-KE")}</CardDescription></div><Badge variant="outline">{report.rows.length.toLocaleString()} rows</Badge></CardHeader>
          {report.truncated && <div className="mx-6 mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>Showing the first {report.rowLimit.toLocaleString()} rows. Metrics describe these rows only. Narrow the date range for complete totals; CSV export safely supports up to 5,000 rows.</span></div>}
          <CardContent className="p-0">
            {report.rows.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">No records were found for this period.</div> :
              <div className="max-h-[620px] overflow-auto"><table className="min-w-full border-collapse text-sm"><caption className="sr-only">{report.definition.title} detail</caption><thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900"><tr>{report.columns.map(column => <th key={column} scope="col" className="whitespace-nowrap border-b px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">{column}</th>)}</tr></thead><tbody>{report.rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-slate-100 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">{report.columns.map(column => <td key={column} className="max-w-[280px] whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatValue(row[column])}</td>)}</tr>)}</tbody></table></div>}
          </CardContent>
        </Card>
      </>}
    </div>
  );
}
