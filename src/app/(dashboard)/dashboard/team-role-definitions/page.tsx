"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Pencil, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTeamRoleDefinition, listTeamRoleDefinitions, listTeamRoleTemplates, setTeamRoleDefinitionStatus, TeamBusinessArea, TeamPermissionTemplate, TeamRoleDefinition, TeamRoleDefinitionPayload, TeamRoleTemplate, updateTeamRoleDefinition } from "@/lib/api";

const businessAreas: Array<{ value: TeamBusinessArea; label: string }> = [
  { value: "LANDLORD", label: "Landlord" }, { value: "ESTATE_MANAGEMENT", label: "Estate Management" }, { value: "PROPERTY_SALE_MANAGEMENT", label: "Property Sale Management" },
];
const blank: TeamRoleDefinitionPayload = { code: "", displayName: "", description: "", businessArea: "LANDLORD", permissionTemplate: "VIEWER" };
const message = (error: unknown) => axios.isAxiosError<{description?: string}>(error) ? error.response?.data?.description ?? "The change could not be saved." : "The change could not be saved.";

export default function TeamRoleDefinitionsPage() {
  const [roles, setRoles] = useState<TeamRoleDefinition[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [templates, setTemplates] = useState<TeamRoleTemplate[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TeamRoleDefinition | null | undefined>(undefined); const [form, setForm] = useState<TeamRoleDefinitionPayload>(blank);
  const load = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try {
      const [definitions, catalogue] = await Promise.all([listTeamRoleDefinitions(), listTeamRoleTemplates()]);
      if (!Array.isArray(definitions.data.data) || !Array.isArray(catalogue.data.data)
        || !catalogue.data.data.length || catalogue.data.data.some(template => !template || !Array.isArray(template.businessAreas))) {
        throw new Error("Invalid team-role catalogue response");
      }
      setRoles(definitions.data.data); setTemplates(catalogue.data.data);
    } catch (error) {
      setRoles([]); setTemplates([]);
      setLoadError(axios.isAxiosError<{description?: string}>(error) ? error.response?.data?.description ?? "Could not load team user types. Please try again." : "Could not load team user types. Please try again.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const grouped = useMemo(() => businessAreas.map(area => ({ ...area, roles: roles.filter(role => role.businessArea === area.value) })), [roles]);
  const availableTemplates = templates.filter(template => template.businessAreas.includes(form.businessArea));
  const templateAreas = (permissionTemplate: TeamPermissionTemplate) => templates.find(template => template.permissionTemplate === permissionTemplate)?.businessAreas.map(area => businessAreas.find(item => item.value === area)?.label ?? area).join(", ");
  const changeBusinessArea = (area: TeamBusinessArea) => setForm(current => ({ ...current, businessArea: area,
    permissionTemplate: templates.some(template => template.permissionTemplate === current.permissionTemplate && template.businessAreas.includes(area)) ? current.permissionTemplate : "VIEWER" }));
  const openNew = () => { setForm(blank); setEditing(null); };
  const openEdit = (role: TeamRoleDefinition) => { setForm({ code: role.code, displayName: role.displayName, description: role.description ?? "", businessArea: role.businessArea, permissionTemplate: role.permissionTemplate }); setEditing(role); };
  const save = async () => { if (!form.code.trim() || !form.displayName.trim()) return toast.error("Code and display name are required."); if (!availableTemplates.some(template => template.permissionTemplate === form.permissionTemplate)) return toast.error("Choose a security template available for this business area."); const payload = { ...form, code: form.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_"), displayName: form.displayName.trim(), description: form.description?.trim() }; try { setBusy(true); editing ? await updateTeamRoleDefinition(editing.id, payload) : await createTeamRoleDefinition(payload); toast.success(editing ? "User type updated." : "User type created."); setEditing(undefined); await load(); } catch (error) { toast.error(message(error)); } finally { setBusy(false); } };
  const toggle = async (role: TeamRoleDefinition) => { try { setBusy(true); await setTeamRoleDefinitionStatus(role.id, !role.active); toast.success(role.active ? "User type disabled." : "User type enabled."); await load(); } catch (error) { toast.error(message(error)); } finally { setBusy(false); } };

  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <section className="rounded-2xl bg-[#071a4f] p-6 text-white shadow-sm lg:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300"><ShieldCheck className="h-4 w-4" /> Superadmin control</p><h1 className="mt-2 text-3xl font-bold">Customer team user types</h1><p className="mt-2 max-w-3xl text-sm text-blue-100">Create the types workspace owners may assign. Shared templates can be configured in multiple business areas; each user type remains tied to its own area and fixed permissions.</p></div><Button onClick={openNew} disabled={loading || Boolean(loadError)} className="bg-orange-600 hover:bg-orange-700"><Plus className="mr-2 h-4 w-4" /> Add user type</Button></div></section>
    {loading ? <div className="flex min-h-60 items-center justify-center"><RefreshCw className="h-7 w-7 animate-spin text-orange-600" /></div> : loadError ? <Card><CardContent className="space-y-4 p-6"><p role="alert">{loadError}</p><Button onClick={() => void load()}>Retry loading user types</Button></CardContent></Card> :
      <div className="grid gap-6 lg:grid-cols-3">{grouped.map(group => <Card key={group.value}>
        <CardHeader><CardTitle>{group.label}</CardTitle><CardDescription>{group.roles.length} controlled user type{group.roles.length === 1 ? "" : "s"}</CardDescription></CardHeader>
        <CardContent className="space-y-3">{group.roles.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No user types configured.</div> : group.roles.map(role =>
          <div key={role.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{role.displayName}</p><Badge variant="outline" className={role.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}>{role.active ? "Active" : "Disabled"}</Badge></div>
            <p className="mt-1 text-xs text-muted-foreground">{role.code}</p><p className="mt-2 text-sm text-muted-foreground">{role.description || "No description"}</p>
            <p className="mt-2 text-xs font-medium text-blue-800">Security template: {templates.find(item => item.permissionTemplate === role.permissionTemplate)?.displayName ?? role.permissionTemplate}</p>
            <p className="mt-1 text-xs text-muted-foreground">Template available in: {templateAreas(role.permissionTemplate)}</p>
          </div><Button size="icon" variant="ghost" onClick={() => openEdit(role)} aria-label={`Edit ${role.displayName}`}><Pencil className="h-4 w-4" /></Button></div>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => toggle(role)} className="mt-4 w-full">{role.active ? "Disable" : "Enable"}</Button>
          </div>)}</CardContent>
      </Card>)}</div>}
    <Dialog open={editing !== undefined} onOpenChange={open => !open && setEditing(undefined)}><DialogContent className="sm:max-w-xl">
      <DialogHeader><DialogTitle>{editing ? "Edit user type" : "Create user type"}</DialogTitle><DialogDescription>The permission template is a fixed security ceiling. Names and descriptions never add authority.</DialogDescription></DialogHeader>
      <div className="grid gap-4 py-2">
        <div className="grid gap-2"><Label htmlFor="team-role-area">Business area</Label><Select value={form.businessArea} onValueChange={value => changeBusinessArea(value as TeamBusinessArea)}><SelectTrigger id="team-role-area"><SelectValue /></SelectTrigger><SelectContent>{businessAreas.map(area => <SelectItem key={area.value} value={area.value}>{area.label}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-2"><Label htmlFor="team-role-template">Security template</Label><Select value={form.permissionTemplate} onValueChange={value => setForm(current => ({ ...current, permissionTemplate: value as TeamPermissionTemplate }))}><SelectTrigger id="team-role-template"><SelectValue /></SelectTrigger><SelectContent>{availableTemplates.map(template => <SelectItem key={template.permissionTemplate} value={template.permissionTemplate}>{template.displayName}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Template available in: {templateAreas(form.permissionTemplate)}</p><p className="text-xs text-muted-foreground">Changing the business area resets an incompatible template to Viewer.</p></div>
        <div className="grid gap-2"><Label htmlFor="role-name">Display name</Label><Input id="role-name" value={form.displayName} onChange={event => setForm(current => ({ ...current, displayName: event.target.value }))} placeholder="e.g. Day Shift Guard" /></div>
        <div className="grid gap-2"><Label htmlFor="role-code">System code</Label><Input id="role-code" value={form.code} disabled={Boolean(editing)} onChange={event => setForm(current => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="DAY_SHIFT_GUARD" /></div>
        <div className="grid gap-2"><Label htmlFor="role-description">Description</Label><Input id="role-description" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="When workspace owners should assign this type" /></div>
      </div><DialogFooter><Button variant="outline" onClick={() => setEditing(undefined)}>Cancel</Button><Button onClick={save} disabled={busy || loading || Boolean(loadError)} className="bg-orange-600 hover:bg-orange-700">Save user type</Button></DialogFooter>
    </DialogContent></Dialog>
  </main>;
}
