"use client";

import { useEffect, useState } from "react";
import { Radio, ShieldCheck, ShieldX } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { AccessEvent, GateDevice, getGateDevices, getGateEvents, registerGateDevice, setGateDeviceEnabled } from "@/services/smart-gates.service";

export default function SmartGateOperations() {
  const { token, permissions, propertyIds, propertyNames } = useAuthStore();
  const [propertyId, setPropertyId] = useState(propertyIds[0] ?? 0);
  const [devices, setDevices] = useState<GateDevice[]>([]);
  const [events, setEvents] = useState<AccessEvent[]>([]);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ displayName: "", gateName: "", laneName: "", ed25519PublicKey: "" });
  const canManage = permissions.includes("manage_gate_devices");

  const load = async () => {
    if (!token || !propertyId) return;
    setError("");
    const [deviceResult, eventResult] = await Promise.allSettled([
      canManage ? getGateDevices(propertyId, token) : Promise.resolve({ data: [] }), getGateEvents(propertyId, token),
    ]);
    if (deviceResult.status === "fulfilled") setDevices(deviceResult.value.data as GateDevice[]);
    if (eventResult.status === "fulfilled") setEvents(eventResult.value.data?.content ?? []);
    else setError("Gate activity could not be loaded for this property.");
  };

  useEffect(() => { load(); }, [token, propertyId, canManage]);

  const addDevice = async () => {
    if (!token || !propertyId || !form.displayName.trim() || !form.ed25519PublicKey.trim()) return;
    try {
      await registerGateDevice({ propertyId, ...form }, token);
      setForm({ displayName: "", gateName: "", laneName: "", ed25519PublicKey: "" }); setShowAdd(false); await load();
    } catch { setError("Device registration failed. Confirm that the key is a Base64 X.509 Ed25519 public key."); }
  };

  if (!propertyIds.length) return <div className="rounded-2xl border bg-white p-8 text-sm text-gray-500">No property is assigned to the active role.</div>;

  return <div className="space-y-5 px-2 py-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-[#020B2D]">Smart Gate Operations</h1><p className="text-sm text-gray-500">Secure device inventory and an auditable access trail.</p></div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><select value={propertyId} onChange={e => setPropertyId(Number(e.target.value))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm sm:w-auto">
        {propertyIds.map((id, index) => <option key={id} value={id}>{propertyNames[index] || `Property ${id}`}</option>)}
      </select>{canManage && <button onClick={() => setShowAdd(v => !v)} className="rounded-xl bg-[#FF4B1F] px-4 py-2 text-sm font-semibold text-white">Add controller</button>}</div>
    </div>
    {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    {showAdd && <section className="grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-2">
      <input placeholder="Controller name" value={form.displayName} onChange={e => setForm({...form, displayName:e.target.value})} className="rounded-xl border px-3 py-2 text-sm" />
      <input placeholder="Gate name" value={form.gateName} onChange={e => setForm({...form, gateName:e.target.value})} className="rounded-xl border px-3 py-2 text-sm" />
      <input placeholder="Lane name" value={form.laneName} onChange={e => setForm({...form, laneName:e.target.value})} className="rounded-xl border px-3 py-2 text-sm" />
      <textarea placeholder="Base64 X.509 Ed25519 public key" value={form.ed25519PublicKey} onChange={e => setForm({...form, ed25519PublicKey:e.target.value})} className="min-h-24 rounded-xl border px-3 py-2 font-mono text-xs" />
      <button onClick={addDevice} className="rounded-xl bg-[#020B2D] px-4 py-2 text-sm font-semibold text-white md:col-span-2">Register controller</button>
    </section>}
    {canManage && <section className="rounded-2xl border bg-white p-5"><h2 className="mb-4 font-semibold text-[#020B2D]">Controllers</h2><div className="grid gap-3 md:grid-cols-2">
      {devices.length ? devices.map(device => <div key={device.deviceCode} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 gap-3"><Radio className={`shrink-0 ${device.enabled ? "text-emerald-600" : "text-gray-400"}`}/><div className="min-w-0"><p className="break-words font-medium">{device.displayName}</p><p className="text-xs text-gray-500">{device.gateName || "Gate"} · {device.laneName || "Default lane"}</p><p className="mt-1 break-all font-mono text-[10px] text-gray-400">{device.deviceCode}</p></div></div><button onClick={async () => { if(token){await setGateDeviceEnabled(device.deviceCode,!device.enabled,token); await load();}}} className={`w-full rounded-lg px-3 py-1.5 text-xs font-semibold sm:w-auto ${device.enabled ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{device.enabled ? "Disable" : "Enable"}</button></div>) : <p className="text-sm text-gray-500">No gate controllers registered.</p>}
    </div></section>}
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="border-b px-5 py-4"><h2 className="font-semibold text-[#020B2D]">Recent access decisions</h2></div><div className="overflow-x-auto"><table className="min-w-[720px] text-sm"><thead><tr className="text-left text-xs uppercase text-gray-500"><th className="px-5 py-3">Time</th><th className="px-5 py-3">Direction</th><th className="px-5 py-3">Decision</th><th className="px-5 py-3">Reason</th><th className="px-5 py-3">Vehicle</th></tr></thead><tbody>
      {events.map(event => <tr key={event.id} className="border-t"><td className="px-5 py-3">{new Date(event.occurredAt).toLocaleString("en-KE")}</td><td className="px-5 py-3">{event.direction}</td><td className="px-5 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${event.outcome === "GRANTED" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{event.outcome === "GRANTED" ? <ShieldCheck className="h-3 w-3"/> : <ShieldX className="h-3 w-3"/>}{event.outcome}</span></td><td className="px-5 py-3">{event.reasonCode.replaceAll("_", " ")}</td><td className="px-5 py-3">{event.vehiclePlate || "—"}</td></tr>)}
      {!events.length && <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-500">No access decisions recorded.</td></tr>}
    </tbody></table></div></section>
  </div>;
}
