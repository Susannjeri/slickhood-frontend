"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Search } from "lucide-react";
import { toast } from "sonner";
import CustomPropertyTypes from "@/components/CustomPropertyTypes";
import RequireRole from "@/components/auth/RequireRole";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUnitTypeCatalog, PropertyUnitTypeCatalog, TypeCatalogOption, UnitTypeCatalog, updateUnitTypeCatalog } from "@/lib/api";

function Catalogue() {
  const [catalog, setCatalog] = useState<PropertyUnitTypeCatalog[]>([]);
  const [availableUnitTypes, setAvailableUnitTypes] = useState<TypeCatalogOption[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selected = catalog.find(item => item.propertyType.id === selectedProperty);
  const [error,setError] = useState<string|null>(null);
  const dirty=!!selected && (enabled.size!==selected.enabledUnitTypeIds.length || selected.enabledUnitTypeIds.some(id=>!enabled.has(id)));
  const unitTypes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return availableUnitTypes.filter(item =>
      !query || item.name.toLowerCase().includes(query) || item.id.toLowerCase().includes(query));
  }, [availableUnitTypes, search]);

  const choose = (propertyType: string, data = catalog) => {
    if(saving)return;
    if(dirty&&propertyType!==selectedProperty&&!window.confirm("Discard unsaved catalogue changes?"))return;
    setSelectedProperty(propertyType);
    const item = data.find(entry => entry.propertyType.id === propertyType);
    setEnabled(new Set(item?.enabledUnitTypeIds ?? []));
    setSearch("");
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getUnitTypeCatalog();
      const data = response.data?.data as UnitTypeCatalog | undefined;
      const properties = data?.propertyTypes ?? [];
      setCatalog(properties);
      setAvailableUnitTypes(data?.availableUnitTypes ?? []);
      if (properties.length > 0) choose(properties.some(p=>p.propertyType.id===selectedProperty)?selectedProperty:properties[0].propertyType.id, properties);
    } catch {
      setError("The property type catalogue could not be loaded. Retry to view its current configuration.");
      toast.error("Could not load the property type catalogue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=""};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn)},[dirty]);

  const toggle = (id: string) => setEnabled(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const save = async () => {
    if (!selected || enabled.size === 0) {
      toast.error("Keep at least one unit type enabled for this property type.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const snapshot=Array.from(enabled);
      await updateUnitTypeCatalog(selected.propertyType.id, snapshot,selected.enabledUnitTypeIds);
      setCatalog(current => current.map(item => item.propertyType.id === selected.propertyType.id
        ? { ...item, enabledUnitTypeIds: snapshot } : item));
      toast.success("Unit type catalogue updated.");
    } catch {
      setError("The catalogue could not be saved. It may have changed in another session. Your selections are preserved; retry or reload the saved catalogue.");
      toast.error("The catalogue could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
    <Breadcrumb items={[{ label: "Administration" }, { label: "Property Type Catalogue" }]} />
    {error&&<div role="alert" className="rounded border border-red-200 bg-red-50 p-4">{error}<Button disabled={loading||saving} variant="outline" onClick={()=>{if(!dirty||window.confirm("Reload the saved catalogue and discard your unsaved selections?"))void load()}} className="ml-3">{catalog.length?"Reload catalogue":"Retry catalogue"}</Button></div>}
    <div>
      <h1 className="text-2xl font-bold text-[#141130]">Property Type Catalogue</h1>
      <p className="mt-1 text-sm text-slate-500">Choose which unit types users can select for each property type. Internal codes are protected so existing records remain valid.</p>
    </div>

    <CustomPropertyTypes unitTypes={availableUnitTypes} disabled={dirty||saving||loading} onChanged={()=>void load()}/>
    {loading ? <div className="flex min-h-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#EF4217]" /></div> :
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="property-type">Property type</label>
          <select id="property-type" disabled={saving||loading} className="mt-2 h-11 w-full rounded-md border bg-white px-3 text-sm" value={selectedProperty} onChange={event => choose(event.target.value)}>
            {catalog.map(item => <option key={item.propertyType.id} value={item.propertyType.id}>{item.propertyType.name} · {item.enabledUnitTypeIds.length} types</option>)}
          </select>
          {selected && <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">{selected.propertyType.category.replaceAll("_", " ")}</div>
            <p className="mt-1">{selected.propertyType.description}</p>
          </div>}
        </section>

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-semibold text-[#141130]">Available unit types</h2><p className="text-xs text-slate-500">{enabled.size} enabled</p></div>
            <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={search} onChange={event => setSearch(event.target.value)} className="pl-9" placeholder="Search unit types" /></div>
          </div>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="w-20 px-4 py-3">Enabled</th><th className="px-4 py-3">Unit type</th><th className="hidden px-4 py-3 md:table-cell">Description</th></tr></thead>
              <tbody className="divide-y">{unitTypes.map(unit => <tr key={unit.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3"><input disabled={saving||loading} aria-label={`Enable ${unit.name}`} type="checkbox" className="h-4 w-4 accent-[#EF4217]" checked={enabled.has(unit.id)} onChange={() => toggle(unit.id)} /></td>
                <td className="px-4 py-3"><div className="font-medium text-slate-900">{unit.name}</div><div className="text-xs text-slate-400">{unit.id}</div></td>
                <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{unit.description}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t p-4"><p className="text-sm text-slate-500">{dirty?"Unsaved changes":"Current saved configuration"}. Disabling a type does not change existing units.</p><Button onClick={save} disabled={saving || loading || !selected || !dirty} className="bg-[#EF4217] text-white hover:bg-[#d93712]">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save catalogue</Button></div>
        </section>
      </div>}
  </div>;
}

export default function PropertyTypeCataloguePage() {
  return <RequireRole roles={["Superadmin"]}><Catalogue /></RequireRole>;
}
