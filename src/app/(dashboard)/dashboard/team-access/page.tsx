"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Building2, Check, Clock3, RefreshCw, Search, ShieldCheck, UserPlus, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getTeamWorkspace, inviteTeamMember, resendTeamInvitation, resumeTeamMember, revokeTeamInvitation,
  revokeTeamMember, suspendTeamMember, TeamMember, TeamMembershipStatus, TeamScopeType, TeamWorkspace,
  updateTeamMemberScope,
} from "@/lib/api";

const statusStyle: Record<TeamMembershipStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800", ACCEPTED: "border-blue-200 bg-blue-50 text-blue-800",
  KYC_PENDING: "border-violet-200 bg-violet-50 text-violet-800", ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-800",
  EXPIRED: "border-slate-200 bg-slate-50 text-slate-700", REVOKED: "border-red-200 bg-red-50 text-red-700",
  SUSPENDED: "border-orange-200 bg-orange-50 text-orange-800",
};
const statusLabel = (status: TeamMembershipStatus) => status === "KYC_PENDING" ? "KYC pending" : status.charAt(0) + status.slice(1).toLowerCase();
const errorMessage = (error: unknown, fallback: string) => axios.isAxiosError<{description?: string}>(error) ? error.response?.data?.description ?? fallback : fallback;
type PendingAction = { title: string; description: string; success: string; run: () => Promise<unknown> };

function ScopePicker({ workspace, scopeType, resourceIds, onScope, onResources }: { workspace: TeamWorkspace; scopeType: TeamScopeType; resourceIds: number[]; onScope: (v: TeamScopeType) => void; onResources: (v: number[]) => void }) {
  const [search, setSearch] = useState("");
  const toggle = (id: number) => onResources(resourceIds.includes(id) ? resourceIds.filter(value => value !== id) : [...resourceIds, id]);
  const filteredResources = workspace.resources.filter(resource => `${resource.name} ${resource.description ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const areaLabel = workspace.businessArea === "LANDLORD" ? "rental properties" : workspace.businessArea === "ESTATE_MANAGEMENT" ? "estates and properties" : "sale properties and developments";
  return <div className="space-y-3">
    <Label>Areas of responsibility</Label>
    <Select value={scopeType} onValueChange={value => onScope(value as TeamScopeType)}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>{workspace.canGrantEntireWorkspace && <SelectItem value="ENTIRE_WORKSPACE">All {areaLabel}</SelectItem>}<SelectItem value="SELECTED_RESOURCES">Selected {areaLabel}</SelectItem></SelectContent>
    </Select>
    {scopeType === "SELECTED_RESOURCES" && <div className="space-y-2 rounded-lg border p-3">
      <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={event=>setSearch(event.target.value)} className="pl-9" placeholder={`Search ${areaLabel}...`} /></div>
      <div className="max-h-52 space-y-2 overflow-y-auto">
      {workspace.resources.length === 0 ? <p className="p-2 text-sm text-muted-foreground">No eligible responsibility areas are available yet.</p> : filteredResources.length === 0 ? <p className="p-2 text-sm text-muted-foreground">No responsibility areas match your search.</p> : filteredResources.map(resource => <label key={resource.id} className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted/60">
        <Checkbox checked={resourceIds.includes(resource.id)} onCheckedChange={() => toggle(resource.id)} />
        <span><span className="block text-sm font-medium">{resource.name}</span>{resource.description && <span className="block text-xs text-muted-foreground">{resource.description}</span>}</span>
      </label>)}
      </div>
    </div>}
  </div>;
}

export default function TeamAccessPage() {
  const [workspace, setWorkspace] = useState<TeamWorkspace | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(""); const [roleDefinitionId, setRoleDefinitionId] = useState("");
  const [scopeType, setScopeType] = useState<TeamScopeType>("ENTIRE_WORKSPACE"); const [resourceIds, setResourceIds] = useState<number[]>([]);
  const [editing, setEditing] = useState<TeamMember | null>(null); const [editScope, setEditScope] = useState<TeamScopeType>("ENTIRE_WORKSPACE"); const [editResources, setEditResources] = useState<number[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await getTeamWorkspace();
      // ResponseDTO always wraps a single workspace in its data list.
      const data = response.data.data;
      const value = Array.isArray(data) && data.length === 1 ? data[0] : null;
      if (!response.data.success || !value || typeof value.id !== "number"
        || typeof value.canGrantEntireWorkspace !== "boolean"
        || !Array.isArray(value.roles) || !Array.isArray(value.resources)
        || !Array.isArray(value.members) || !Array.isArray(value.invitations)
        || value.roles.some(role => !role || typeof role.id !== "number")
        || value.resources.some(resource => !resource || typeof resource.id !== "number")
        || value.members.some(member => !member || !Array.isArray(member.resourceIds) || !(member.status in statusStyle))
        || value.invitations.some(invitation => !invitation || !Array.isArray(invitation.resourceIds) || !(invitation.status in statusStyle))) {
        throw new Error("Invalid team workspace response");
      }
      setRoleDefinitionId(current => value.roles.some(role => String(role.id) === current) ? current : String(value.roles[0]?.id ?? ""));
      if (!value.canGrantEntireWorkspace) setScopeType("SELECTED_RESOURCES");
      const propertyId = Number(new URLSearchParams(window.location.search).get("propertyId"));
      if (propertyId && value.resources.some(resource => resource.id === propertyId)) {
        setScopeType("SELECTED_RESOURCES");
        setResourceIds([propertyId]);
      }
      // Never commit an invalid response to render state.
      setWorkspace(value);
    } catch (error) {
      setWorkspace(null);
      setLoadError(errorMessage(error, "We could not load your internal team. Please try again. If this continues, contact support."));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const seats = useMemo(() => workspace ? `${workspace.seatsUsed} / ${workspace.seatLimit < 0 ? "Unlimited" : workspace.seatLimit}` : "—", [workspace]);
  const selectedRole = workspace?.roles.find(role=>String(role.id)===roleDefinitionId);
  const responsibilityText = (assignedIds: number[], assignedScope: TeamScopeType) => {
    if (!workspace) return "";
    if (assignedScope === "ENTIRE_WORKSPACE") return "All responsibility areas";
    const names = assignedIds.map(id=>workspace.resources.find(resource=>resource.id===id)?.name).filter(Boolean);
    return names.length ? names.join(", ") : `${assignedIds.length} selected responsibility area${assignedIds.length===1?"":"s"}`;
  };

  const invite = async () => { if (!workspace || !email.trim() || !roleDefinitionId) return toast.error("Enter an email and select a team role."); if (scopeType === "SELECTED_RESOURCES" && resourceIds.length === 0) return toast.error("Select at least one resource."); try { setBusy(true); await inviteTeamMember({email:email.trim(),roleDefinitionId:Number(roleDefinitionId),scopeType,resourceIds}); toast.success("One-time invitation sent."); setEmail(""); setResourceIds([]); setScopeType("ENTIRE_WORKSPACE"); await load(); } catch(error) { toast.error(errorMessage(error,"The invitation could not be sent.")); } finally { setBusy(false); } };
  const action = async (run: () => Promise<unknown>, success: string) => { try { setBusy(true); await run(); toast.success(success); await load(); } catch(error) { toast.error(errorMessage(error,"The action could not be completed.")); } finally { setBusy(false); } };
  const confirmAction = async () => { if (!pendingAction) return; const selected = pendingAction; setPendingAction(null); await action(selected.run, selected.success); };
  const openScope = (member: TeamMember) => { setEditing(member); setEditScope(member.scopeType); setEditResources(member.resourceIds); };
  const saveScope = async () => { if (!editing) return; if (editScope === "SELECTED_RESOURCES" && editResources.length === 0) return toast.error("Select at least one resource."); await action(() => updateTeamMemberScope(editing.id,{scopeType:editScope,resourceIds:editResources}),"Access scope updated."); setEditing(null); };

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><RefreshCw className="h-7 w-7 animate-spin text-orange-600" /></div>;
  if (!workspace) return <main className="mx-auto max-w-2xl p-6"><Card><CardHeader><CardTitle><h2>Internal Team could not be loaded</h2></CardTitle></CardHeader><CardContent className="space-y-4"><p role="alert" className="text-sm text-muted-foreground">{loadError}</p><Button onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" /> Retry loading team</Button></CardContent></Card></main>;

  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <section className="overflow-hidden rounded-2xl bg-[#071a4f] text-white shadow-sm"><div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between lg:p-8"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300"><ShieldCheck className="h-4 w-4" /> Secure delegated access</div><h1 className="text-3xl font-bold">Internal Team</h1><p className="mt-2 max-w-2xl text-sm text-blue-100">Invite your staff into {workspace.name}, choose an approved Customer Team User Type and assign only the properties or estates they are responsible for.</p></div><div className="rounded-xl border border-white/20 bg-white/10 px-5 py-4"><p className="text-xs uppercase tracking-wide text-blue-100">Team seats used</p><p className="mt-1 text-2xl font-bold">{seats}</p></div></div></section>

    <Card><CardContent className="grid gap-4 p-5 md:grid-cols-3"><div className="flex gap-3"><UserPlus className="mt-0.5 h-5 w-5 text-orange-600" /><div><p className="font-semibold">1. Invite staff</p><p className="text-sm text-muted-foreground">Existing users sign in; new users create an account from the same secure link.</p></div></div><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-orange-600" /><div><p className="font-semibold">2. Assign user type</p><p className="text-sm text-muted-foreground">User types are governed centrally and carry only their approved permissions.</p></div></div><div className="flex gap-3"><Building2 className="mt-0.5 h-5 w-5 text-orange-600" /><div><p className="font-semibold">3. Limit responsibility</p><p className="text-sm text-muted-foreground">Choose all eligible properties or select the exact areas this person should access.</p></div></div></CardContent></Card>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
      <Card className="h-fit"><CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-orange-600" /> Invite an internal user</CardTitle><CardDescription>The one-time invitation is email-bound, expires automatically and is recorded in the audit trail.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="space-y-2"><Label htmlFor="team-email">Work email</Label><Input id="team-email" type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="name@company.com" autoComplete="email" /></div><div className="space-y-2"><Label>Customer Team User Type</Label><Select value={roleDefinitionId} onValueChange={setRoleDefinitionId}><SelectTrigger><SelectValue placeholder="Select a user type" /></SelectTrigger><SelectContent>{workspace.roles.map(role=><SelectItem value={String(role.id)} key={role.id}>{role.name}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">{selectedRole?.description || "User types are created and security-bounded by SlickHood Superadmin."}</p></div><ScopePicker workspace={workspace} scopeType={scopeType} resourceIds={resourceIds} onScope={setScopeType} onResources={setResourceIds} /><Button onClick={invite} disabled={busy || workspace.roles.length===0} className="w-full bg-orange-600 hover:bg-orange-700"><UserPlus className="mr-2 h-4 w-4" /> Send secure invitation</Button></CardContent></Card>

      <div className="space-y-6">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-orange-600" /> Internal users</CardTitle><CardDescription>Common account KYC is reused. Access becomes active only after the applicable account controls pass.</CardDescription></CardHeader><CardContent className="space-y-3">{workspace.members.length===0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No internal users yet.</div> : workspace.members.map(member=><div key={member.id} className="rounded-xl border p-4"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold">{member.name || member.email}</p><Badge variant="outline" className={statusStyle[member.status]}>{statusLabel(member.status)}</Badge></div><p className="truncate text-sm text-muted-foreground">{member.email}</p><p className="mt-2 text-sm"><span className="font-medium">{member.roleName}</span></p><p className="mt-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">Responsibilities:</span> {responsibilityText(member.resourceIds,member.scopeType)}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={()=>openScope(member)} disabled={busy || member.status==="REVOKED"}>Edit responsibilities</Button>{member.status==="SUSPENDED"?<Button variant="outline" size="sm" onClick={()=>action(()=>resumeTeamMember(member.id),"Internal user resumed.")} disabled={busy}>Resume</Button>:<Button variant="outline" size="sm" onClick={()=>setPendingAction({title:"Suspend internal user?",description:`${member.name || member.email} will immediately lose access to assigned responsibility areas until resumed.`,success:"Internal user suspended.",run:()=>suspendTeamMember(member.id)})} disabled={busy || member.status!=="ACTIVE"}>Suspend</Button>}<Button variant="destructive" size="sm" onClick={()=>setPendingAction({title:"Revoke membership?",description:`This permanently removes ${member.name || member.email} from this workspace and revokes all assigned access.`,success:"Membership revoked.",run:()=>revokeTeamMember(member.id)})} disabled={busy || member.status==="REVOKED"}>Revoke</Button></div></div></div>)}</CardContent></Card>

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-orange-600" /> Invitations</CardTitle><CardDescription>Pending, expired and revoked invitations are retained for accountability.</CardDescription></CardHeader><CardContent className="space-y-3">{workspace.invitations.length===0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No invitations yet.</div> : workspace.invitations.map(invite=><div key={invite.id} className="rounded-xl border p-4"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold">{invite.email}</p><Badge variant="outline" className={statusStyle[invite.status]}>{statusLabel(invite.status)}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{invite.roleName}</p><p className="mt-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">Responsibilities:</span> {responsibilityText(invite.resourceIds,invite.scopeType)}</p><p className="mt-1 text-xs text-muted-foreground">Expires {new Date(invite.expiresAt).toLocaleString()}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={()=>action(()=>resendTeamInvitation(invite.id),"A new one-time invitation was sent.")} disabled={busy || !(invite.status==="PENDING"||invite.status==="EXPIRED")}><RefreshCw className="mr-1 h-3.5 w-3.5" /> Resend</Button><Button variant="destructive" size="sm" onClick={()=>setPendingAction({title:"Revoke invitation?",description:`The one-time link sent to ${invite.email} will stop working immediately.`,success:"Invitation revoked.",run:()=>revokeTeamInvitation(invite.id)})} disabled={busy || !(invite.status==="PENDING"||invite.status==="EXPIRED")}><XCircle className="mr-1 h-3.5 w-3.5" /> Revoke</Button></div></div></div>)}</CardContent></Card>
        <div className="grid grid-cols-2 gap-2 rounded-xl border bg-white p-4 sm:grid-cols-4">{["Pending","Accepted","KYC pending","Active"].map((label,index)=><div key={label} className="flex items-center gap-2 text-xs sm:text-sm"><span className={`flex h-6 w-6 items-center justify-center rounded-full ${index===3?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-600"}`}>{index===3?<Check className="h-3.5 w-3.5" />:index+1}</span>{label}</div>)}</div>
      </div>
    </div>
    <Dialog open={Boolean(editing)} onOpenChange={open=>!open&&setEditing(null)}><DialogContent><DialogHeader><DialogTitle>Edit areas of responsibility</DialogTitle><DialogDescription>Changes take effect immediately and are recorded in the audit trail.</DialogDescription></DialogHeader>{editing&&<ScopePicker workspace={workspace} scopeType={editScope} resourceIds={editResources} onScope={setEditScope} onResources={setEditResources} />}<DialogFooter><Button variant="outline" onClick={()=>setEditing(null)}>Cancel</Button><Button onClick={saveScope} disabled={busy} className="bg-orange-600 hover:bg-orange-700">Save responsibilities</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(pendingAction)} onOpenChange={open=>!open&&setPendingAction(null)}><DialogContent><DialogHeader><DialogTitle>{pendingAction?.title}</DialogTitle><DialogDescription>{pendingAction?.description}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={()=>setPendingAction(null)}>Cancel</Button><Button variant="destructive" onClick={confirmAction} disabled={busy}>Confirm</Button></DialogFooter></DialogContent></Dialog>
  </main>;
}
