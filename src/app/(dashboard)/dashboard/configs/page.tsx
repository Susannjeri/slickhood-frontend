"use client";

import { useEffect, useRef, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

interface ConfigValue { name: string; stringValue: string | null; intValue: number; encrypted: boolean }
const readable = (key: string) => key.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const raw = (value: ConfigValue) => value.encrypted ? "" : value.stringValue || String(value.intValue ?? "");
const supported = (name: string) => !name.startsWith("GLOBAL_MPESA_") && !name.startsWith("FW_");

export default function ConfigurationSettingsPage() {
  const role = useAuthStore(s => s.activeRole);
  const token = useAuthStore(s => s.token);
  useEffect(() => { try { localStorage.removeItem("config_cache_v1"); } catch { /* Storage may be disabled. */ } }, []);
  if (!role?.permissions.includes("view_config")) return <p role="alert" className="p-6">You do not have permission to view system configuration.</p>;
  return <ConfigurationSettings key={role.title + token} canEdit={role.permissions.includes("edit_config")} />;
}

function ConfigurationSettings({ canEdit }: { canEdit: boolean }) {
  const { fetchConfigNames } = useApi();
  const [names, setNames] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState("");
  useEffect(() => {
    let current = true;
    // Retire the old account-independent browser cache. Never persist configuration values.
    setLoading(true); setError("");
    void fetchConfigNames().then(response => {
      if (!current) return;
      if (!response.success || !Array.isArray(response.data)) throw new Error("Unavailable");
      setNames(response.data.filter((name: unknown): name is string => typeof name === "string" && supported(name)).sort());
    }).catch(() => { if (current) setError("Configuration names could not be loaded. Please retry."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
    // useApi returns uncached wrappers; revision explicitly controls reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);
  return <section className="mx-auto max-w-5xl space-y-5 p-6">
    <h1 className="text-3xl font-bold">Configuration Settings</h1>
    <p className="text-sm text-slate-600">Changes affect the platform. Recipient payment credentials belong in Payment Setup. Encrypted values can be replaced, never revealed here. Values are not saved in browser storage.</p>
    {!canEdit && <p className="rounded-lg bg-blue-50 p-3 text-sm">Read-only access. Configuration changes require edit permission.</p>}
    <div className="flex flex-wrap gap-3"><input aria-label="Search configuration" placeholder="Search configuration" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 rounded-lg border p-2" /><Button variant="outline" disabled={loading} onClick={() => setRevision(v => v + 1)}>Reload catalogue</Button></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {loading ? <p role="status">Loading configurations…</p> : <div className="space-y-3">{names.filter(name => readable(name).toLowerCase().includes(search.trim().toLowerCase()) || name.toLowerCase().includes(search.trim().toLowerCase())).map(name => <ConfigField key={name + revision} name={name} canEdit={canEdit} />)}</div>}
    {!loading && !error && !names.length && <p>No configuration entries are available.</p>}
  </section>;
}

function ConfigField({ name, canEdit }: { name: string; canEdit: boolean }) {
  const { fetchConfigValues, handleEditConfigValue } = useApi();
  const [value, setValue] = useState<ConfigValue | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function read() {
    const response = await fetchConfigValues(name);
    const data = Array.isArray(response.data) ? response.data[0] : response.data;
    if (!response.success || !data || typeof data !== "object") throw new Error("Unavailable");
    return data as ConfigValue;
  }
  async function load() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try { const data = await read(); if (mounted.current) setValue(data); }
    catch { if (mounted.current) setError("Value could not be loaded. Retry to check the current setting."); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  async function save() {
    if (!canEdit || !value || lock.current) return;
    if (!draft.trim()) { setError("Enter a replacement value."); return; }
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const response = await handleEditConfigValue(name, draft);
      if (!response.success) throw new Error("Rejected");
      if (!mounted.current) return;
      setEditing(false); setDraft("");
      setNotice("Configuration saved.");
      try { const data = await read(); if (mounted.current) setValue(data); }
      catch { if (mounted.current) { setValue(null); setNotice("Saved, but the current value could not be reloaded. Load it again to confirm."); } }
    } catch { if (mounted.current) setError("Configuration was not saved. Check the value and retry."); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  return <article aria-label={readable(name)} className="rounded-xl border bg-white p-4">
    <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{readable(name)}</h2><Button variant="outline" disabled={busy || editing} onClick={() => void load()}>{value ? "Refresh value" : "Load value"}</Button></div>
    {value && !editing && <div className="mt-3 flex items-center justify-between gap-3"><p className="break-all">{value.encrypted ? "Encrypted value configured" : raw(value)}</p>{canEdit && <Button variant="outline" disabled={busy} onClick={() => { setDraft(raw(value)); setEditing(true); setError(""); setNotice(""); }}>{value.encrypted ? "Replace secret" : "Edit"}</Button>}</div>}
    {editing && <div className="mt-3 space-y-3"><label className="block text-sm">Replacement value<input aria-label={"Replacement value for " + readable(name)} type={value?.encrypted ? "password" : "text"} autoComplete="off" value={draft} disabled={busy} onChange={e => setDraft(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><div className="flex gap-2"><Button disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</Button><Button variant="outline" disabled={busy} onClick={() => { setEditing(false); setDraft(""); setError(""); }}>Cancel</Button></div></div>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-2 text-sm text-green-700">{notice}</p>}
  </article>;
}
