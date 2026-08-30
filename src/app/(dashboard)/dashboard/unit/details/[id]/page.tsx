"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  Edit,
  Building2,
  Zap,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Copy,
  AlertCircle,
  Receipt,
  UserPlus,
  Mail,
  Send,
  Trash2,
  RefreshCw,
  Clock,
  Eye,
  MessageSquare,
  Users,
  CheckCircle2,
  FileText,
  Wrench,
} from "lucide-react";
import CanProperty, { usePropertyPermissions } from "@/components/auth/CanProperty";
import Can from "@/components/auth/Can";
import { useAuthStore } from "@/store/authStore";
import ManageChargesDrawer from "@/components/unit/ManageChargesDrawer";
import { usePropertyMetadata } from "@/app/(dashboard)/dashboard/property/propertyMetadata";
import { parseUnitOrigin, unitListHref, unitOriginLabel } from "@/lib/unitNavigation";
import { createMaintenance, downloadLeaseDocumentPdf, LeaseDocumentView, listLeaseDocuments, listUnitMaintenance, MaintenanceWorkOrder, updateMaintenance } from "@/lib/api";

interface UnitDetail {
  propertyId: number;
  ref: string;
  unitType: string;
  propertyType: string;
  size: number;
  measurementUnits: { id: number; name: string };
  utilities: Array<{ id: number; name: string }>;
  leaseMode: string;
  price: number;
  currency: string;
  occupied: boolean;
  advertise: boolean;
  thumbnail: string;
  images: string[];
  unitId: number;
  templateId: number;
  leaseId?: number;
  tenantSigned?: boolean;
  ownerSigned?: boolean;
}

interface UnitCharge {
  id: number;
  createdOn: string;
  chargeId: number;
  chargeName: string;
  amount: number;
  periodId: string;
  periodName: string;
}

interface Tenant {
  name: string | null;
  id: number;
  email: string;
  userId: number;
  phoneNumber: string | null;
  createdOn: string;
  leaseId: number;
  leaseAccepted: boolean;
  signedByManagerName: string | null;
  tenantSignedDate: string | null;
  managerSignedDate: string | null;
}

interface Manager {
  name: string | null;
  phoneNumber: string | null;
  email: string;
  roleName: string;
}

interface Invite {
  id: number;
  link: string;
  type: string;
  validDays: number;
  visits: number;
}

interface LeaseMessage {
  id: number;
  message: string;
  createdOn: string;
  sentBy: string | null;
  senderRole: "Tenant" | "Landlord" | "Manager";
}

type LeaseSignState =
  | { kind: "both_pending" }
  | { kind: "manager_signed"; managerName: string; date: string }
  | { kind: "waiting_manager"; tenantDate: string }
  | { kind: "fully_signed"; tenantDate: string; managerDate: string };

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function resolveLeaseSignState(tenant: Tenant): LeaseSignState {
  const { tenantSignedDate, managerSignedDate, signedByManagerName } = tenant;
  if (!tenantSignedDate && !managerSignedDate) return { kind: "both_pending" };
  if (!tenantSignedDate && managerSignedDate) return { kind: "manager_signed", managerName: signedByManagerName ?? "Manager", date: managerSignedDate };
  if (tenantSignedDate && !managerSignedDate) return { kind: "waiting_manager", tenantDate: tenantSignedDate };
  return { kind: "fully_signed", tenantDate: tenantSignedDate!, managerDate: managerSignedDate! };
}

function LeaseSignActions({ tenant, actionLoading, onSign, onChat }: { tenant: Tenant; actionLoading: boolean; onSign: (leaseId: number) => void; onChat: (leaseId: number) => void; }) {
  const state = resolveLeaseSignState(tenant);
  if (state.kind === "fully_signed") {
    return (
      <div className="mt-3 pt-3 border-t">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <div className="text-xs text-green-800 space-y-0.5">
            <p className="font-medium">Lease fully signed</p>
            <p>Tenant: {formatDate(state.tenantDate)}</p>
            <p>Manager: {formatDate(state.managerDate)}</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-3 pt-3 border-t">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button onClick={() => onChat(tenant.leaseId)} size="sm" variant="outline" className="w-full border-[#EF4217] text-[#EF4217] hover:text-[#EF4217] hover:bg-[#FEE2E2]">
          <MessageSquare className="w-4 h-4 mr-2" />Messages
        </Button>
        {state.kind === "both_pending" && (
          <Button onClick={() => onSign(tenant.leaseId)} disabled={actionLoading} size="sm" className="w-full text-white hover:opacity-90" style={{ backgroundColor: "#10B981" }}>
            {actionLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing...</> : <><Edit className="w-4 h-4 mr-2" />Sign Lease</>}
          </Button>
        )}
        {state.kind === "manager_signed" && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 border border-blue-200 text-xs text-blue-800">
              <Edit className="w-3 h-3 flex-shrink-0" />
              <span>Signed by <strong>{state.managerName}</strong> on {formatDate(state.date)}</span>
            </div>
            <p className="text-xs text-gray-500 text-center">Awaiting tenant signature</p>
          </div>
        )}
        {state.kind === "waiting_manager" && (
          <div className="flex flex-col gap-1">
            <Button onClick={() => onSign(tenant.leaseId)} disabled={actionLoading} size="sm" className="w-full text-white hover:opacity-90" style={{ backgroundColor: "#10B981" }}>
              {actionLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing...</> : <><Edit className="w-4 h-4 mr-2" />Sign Lease</>}
            </Button>
            <p className="text-xs text-gray-500 text-center">Tenant signed {formatDate(state.tenantDate)}</p>
          </div>
        )}
      </div>
    </div>
  );
}


export default function ViewUnitPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const unitId = params?.id as string;
  const propertyId = searchParams?.get("p") as string;
  const origin = parseUnitOrigin(searchParams?.get("from"));
  const backHref = unitListHref(origin, propertyId);

  const {
    viewUnit,
    getPropertyImage,
    handleToggleAdvert,
    handleCreateSimilarUnits,
    handleGetUnitCharges,
    handleCreateInvite,
    handleGetStaffAndInvites,
    handleShareInvite,
    handleUpdateInvite,
    handleDeleteStaff,
    handleViewLeaseTemplate,
    handleViewLeaseTemplateUnit,
    handleListTenants,
    handleListManagers,
    handlelistUnitInvites,
    handleListLeaseMessages,
    handleLeaseMessage,
    handleSignLease,
  } = useApi();

  const [unit, setUnit] = useState<UnitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isTogglingAdvert, setIsTogglingAdvert] = useState(false);
  const [similarUnitsCount, setSimilarUnitsCount] = useState(1);
  const [isCreatingSimilar, setIsCreatingSimilar] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');

  const [unitCharges, setUnitCharges] = useState<UnitCharge[]>([]);
  const [loadingCharges, setLoadingCharges] = useState(false);
  const [isChargesDrawerOpen, setIsChargesDrawerOpen] = useState(false);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [hasAcceptedLease, setHasAcceptedLease] = useState(false);

  const [unitInvites, setUnitInvites] = useState<Invite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [createInviteOpen, setCreateInviteOpen] = useState(false);
  const [shareInviteOpen, setShareInviteOpen] = useState(false);
  const [createdInviteLink, setCreatedInviteLink] = useState("");
  const [selectedInviteId, setSelectedInviteId] = useState<number | null>(null);
  const [selectedInviteLink, setSelectedInviteLink] = useState("");
  const [shareRecipient, setShareRecipient] = useState("");
  const [shareChannel, setShareChannel] = useState<"EMAIL" | "SMS">("EMAIL");
  const [actionLoading, setActionLoading] = useState(false);

  const [managers, setManagers] = useState<Manager[]>([]);
  const [managersLoading, setManagersLoading] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<LeaseMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [selectedLeaseId, setSelectedLeaseId] = useState<number | null>(null);
  const { isLoadingTypes, resolveUnitTypeLabel, setCurrentPropertyType, getPropertyTypeName } = usePropertyMetadata();

  const { checkPermissions } = usePropertyPermissions(Number(propertyId));
  const activeRole = useAuthStore((state) => state.activeRole);
  const canAdvanceMaintenance = activeRole?.permissions.some(permission => ["manage_estate","edit_unit"].includes(permission)) ?? false;
  const token = useAuthStore((state) => state.token);
  const [maintenance, setMaintenance] = useState<MaintenanceWorkOrder[]>([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({title:"",description:"",category:"OTHER",priority:"MEDIUM"});
  const [documents, setDocuments] = useState<LeaseDocumentView[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  const loadMaintenance = async () => {
    if (!token || !unitId) return;
    setMaintenanceLoading(true);
    try { const response=await listUnitMaintenance(Number(unitId),token); setMaintenance(response.data?.data ?? []); }
    catch { toast.error("Maintenance requests could not be loaded."); }
    finally { setMaintenanceLoading(false); }
  };

  const loadDocuments = async () => {
    if (!token || !unitId) return;
    setDocumentsLoading(true);
    try { const response=await listLeaseDocuments(token); setDocuments((response.data?.data ?? []).filter((d:LeaseDocumentView)=>d.unitId===Number(unitId))); }
    catch { toast.error("Unit documents could not be loaded."); }
    finally { setDocumentsLoading(false); }
  };

  useEffect(()=>{loadMaintenance();loadDocuments();},[token,unitId]);

  const submitMaintenance = async () => {
    if(!token||!maintenanceForm.title.trim()||!maintenanceForm.description.trim())return;
    try{await createMaintenance({unitId:Number(unitId),...maintenanceForm},token);setMaintenanceForm({title:"",description:"",category:"OTHER",priority:"MEDIUM"});setMaintenanceOpen(false);toast.success("Maintenance request created.");await loadMaintenance();}
    catch{toast.error("Maintenance request could not be created.");}
  };

  const advanceMaintenance = async (order:MaintenanceWorkOrder) => {
    if(!token)return;const next:{[key:string]:string}={OPEN:"ACKNOWLEDGED",ACKNOWLEDGED:"IN_PROGRESS",IN_PROGRESS:"COMPLETED"};if(!next[order.status])return;
    try{await updateMaintenance(order.id,{status:next[order.status],currency:order.currency},token);toast.success("Work order updated.");await loadMaintenance();}catch{toast.error("Work order could not be updated.");}
  };

  const openDocument = async (id:number) => {if(!token)return;try{const response=await downloadLeaseDocumentPdf(id,token);const url=URL.createObjectURL(response.data);window.open(url,"_blank","noopener,noreferrer");setTimeout(()=>URL.revokeObjectURL(url),60000);}catch{toast.error("Document could not be opened.");}};

  useEffect(() => {
    if (unitId && propertyId) {
      if (isLoadingTypes) return;
      loadUnitDetails();
      loadUnitCharges();

      const hasViewTenants = checkPermissions(["view_tenants"]);
      const hasViewManagers = checkPermissions(["view_landlord_and_managers"]);

      if (hasViewTenants) loadTenants();
      if (checkPermissions(["view_invite_list"])) loadUnitInvites();
      if (hasViewManagers) {
        loadManagers();
      }
    }
  }, [unitId, propertyId, isLoadingTypes, activeRole]);

  const loadUnitDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await viewUnit(Number(propertyId), Number(unitId));
      if (response.success && response.data) {
        const unitData = response.data[0];
        setUnit(unitData);
        setCurrentPropertyType(unitData.propertyType);
        const allImages = [unitData.thumbnail, ...(unitData.images || [])];
        loadImages(allImages);
      } else {
        setError("Failed to load unit details");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load unit details");
    } finally {
      setLoading(false);
    }
  };

  const loadUnitCharges = async () => {
    try {
      setLoadingCharges(true);
      const response = await handleGetUnitCharges(Number(unitId));
      if (response.success && response.data) {
        setUnitCharges(response.data);
      }
    } catch (err: any) {
      console.error("Error loading charges:", err);
    } finally {
      setLoadingCharges(false);
    }
  };

  const loadTenants = async () => {
    try {
      setTenantsLoading(true);
      const response = await handleListTenants(Number(unitId), {});
      if (response.success && response.data) {
        setTenants(response.data);
        const hasAccepted = response.data.some((tenant: Tenant) => tenant.leaseAccepted);
        setHasAcceptedLease(hasAccepted);
      }
    } catch (err) {
      console.error("Error loading tenants:", err);
      toast.error("Failed to load tenants");
    } finally {
      setTenantsLoading(false);
    }
  };

  const loadUnitInvites = async () => {
    try {
      setInvitesLoading(true);
      const response = await handlelistUnitInvites(Number(unitId));
      if (response.success && response.data) {
        setUnitInvites(response.data);
      }
    } catch (err) {
      console.error("Error loading unit invites:", err);
      toast.error("Failed to load invites");
    } finally {
      setInvitesLoading(false);
    }
  };

  const loadManagers = async () => {
    try {
      setManagersLoading(true);
      const response = await handleListManagers(Number(unitId));
      if (response.success && response.data) {
        const sorted = [...response.data].sort((a: Manager, b: Manager) => {
          if (a.roleName === "Landlord") return -1;
          if (b.roleName === "Landlord") return 1;
          return 0;
        });
        setManagers(sorted);
      }
    } catch (err) {
      console.error("Error loading managers:", err);
      toast.error("Failed to load managers");
    } finally {
      setManagersLoading(false);
    }
  };

  const loadImages = async (imagePaths: string[]) => {
    setImageUrls(imagePaths);
  };

  const handleAdvertiseToggle = async (checked: boolean) => {
    if (!unit) return;
    setIsTogglingAdvert(true);
    try {
      await handleToggleAdvert(Number(unitId));
      setUnit({ ...unit, advertise: checked });
      toast.success(checked ? "Unit is now advertised" : "Unit advertisement disabled");
    } catch (err: any) {
      toast.error("Failed to update advertising status");
    } finally {
      setIsTogglingAdvert(false);
    }
  };

  const handleCreateSimilar = async () => {
    if (!unit) return;
    setIsCreatingSimilar(true);
    try {
      await handleCreateSimilarUnits(Number(unitId), similarUnitsCount);
      toast.success("Similar units creation initiated!");
      setSimilarUnitsCount(1);
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error("Failed to create similar units");
    } finally {
      setIsCreatingSimilar(false);
    }
  };

  const handleChargesSaved = () => {
    loadUnitCharges();
    setIsChargesDrawerOpen(false);
  };

  const onCreateOccupantInvite = async () => {
    const inviteType = unit?.leaseMode === "SERVICE_CHARGE" || origin === "homeowners" ? "HOMEOWNER" : "TENANT";
    const inviteLabel = inviteType === "HOMEOWNER" ? "Homeowner" : "Tenant";
    try {
      setActionLoading(true);
      const response = await handleCreateInvite(inviteType, Number(unitId));
      if (response.success && response.data && response.data.length > 0) {
        setCreatedInviteLink(response.data[0]);
        toast.success(`${inviteLabel} invite created successfully`);
        loadUnitInvites();
      }
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { description?: string } } };
      toast.error(apiError.response?.data?.description || `Failed to create ${inviteLabel.toLowerCase()} invite`);
    } finally {
      setActionLoading(false);
    }
  };

  const onShareInvite = async () => {
    if (!selectedInviteId || !shareRecipient) {
      toast.error("Please provide recipient information");
      return;
    }
    try {
      setActionLoading(true);
      const response = await handleShareInvite(selectedInviteId, shareRecipient, shareChannel);
      if (response.success) {
        toast.success(`Invite sent via ${shareChannel}`);
        setShareInviteOpen(false);
        setShareRecipient("");
        setSelectedInviteId(null);
        setSelectedInviteLink("");
      }
    } catch (err) {
      toast.error("Failed to share invite");
    } finally {
      setActionLoading(false);
    }
  };

  const onRenewInvite = async (inviteId: number) => {
    try {
      setActionLoading(true);
      const response = await handleUpdateInvite({ id: inviteId, active: true });
      if (response.success) {
        toast.success("Invite renewed successfully");
        loadUnitInvites();
      }
    } catch (err) {
      toast.error("Failed to renew invite");
    } finally {
      setActionLoading(false);
    }
  };

  const onTerminateInvite = async (inviteId: number) => {
    try {
      setActionLoading(true);
      const response = await handleUpdateInvite({ id: inviteId, active: false });
      if (response.success) {
        toast.success("Invite terminated successfully");
        loadUnitInvites();
      }
    } catch (err) {
      toast.error("Failed to terminate invite");
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copied to clipboard");
  };

  const openShareDialog = (inviteId: number, inviteLink: string) => {
    setSelectedInviteId(inviteId);
    setSelectedInviteLink(inviteLink);
    setShareInviteOpen(true);
  };

  const incrementCount = () => {
    if (similarUnitsCount < 49) setSimilarUnitsCount((prev) => prev + 1);
  };

  const decrementCount = () => {
    if (similarUnitsCount > 1) setSimilarUnitsCount((prev) => prev - 1);
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= 49) {
      setSimilarUnitsCount(value);
    } else if (e.target.value === "") {
      setSimilarUnitsCount(1);
    }
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => prev === 0 ? imageUrls.length - 1 : prev - 1);
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => prev === imageUrls.length - 1 ? 0 : prev + 1);
  };

  const handleEdit = () => {
    router.push(`/dashboard/unit/edit/${unitId}?p=${propertyId}&from=${origin}`);
  };

  const handleBack = () => {
    router.push(backHref);
  };

  const handleViewPdf = async (unitId: number) => {
    try {
      const response = await handleViewLeaseTemplateUnit(unitId);
      let blob;
      if (response instanceof Blob) {
        blob = response;
      } else {
        const pdfData = response.data || response;
        blob = new Blob([pdfData], { type: 'application/pdf' });
      }
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setIsPdfModalOpen(true);
    } catch (error) {
      console.error('Error viewing PDF:', error);
      toast.error("Failed to load lease template PDF");
    }
  };

  const loadMessages = async (page: number = 0, leaseIdToUse?: number) => {
    const leaseId = leaseIdToUse || selectedLeaseId;
    if (!leaseId) {
      toast.error("No lease associated with this unit");
      return;
    }
    try {
      setMessagesLoading(true);
      const response = await handleListLeaseMessages(leaseId, { page, size: 20, sort: "id,desc" });
      if (response.success && response.data) {
        if (page === 0) {
          setMessages(response.data);
        } else {
          setMessages(prev => [...response.data, ...prev]);
        }
        setCurrentPage(page);
        setTotalPages(response.totalPages || 1);
        setHasMoreMessages(page < (response.totalPages - 1));
      }
    } catch (err) {
      console.error("Error loading messages:", err);
      toast.error("Failed to load messages");
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedLeaseId) return;
    try {
      setSendingMessage(true);
      const response = await handleLeaseMessage(selectedLeaseId, newMessage.trim());
      if (response.success) {
        setNewMessage("");
        await loadMessages(0);
        toast.success("Message sent");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const loadMoreMessages = () => {
    if (hasMoreMessages && !messagesLoading) {
      loadMessages(currentPage + 1);
    }
  };

  const handleChatOpen = (open: boolean, leaseId?: number) => {
    setIsChatOpen(open);
    if (open && leaseId) {
      setSelectedLeaseId(leaseId);
      setMessages([]);
      loadMessages(0, leaseId);
    } else if (!open) {
      setSelectedLeaseId(null);
      setMessages([]);
    }
  };

  const handleSignLeaseAction = async (leaseId: number) => {
    try {
      setActionLoading(true);
      const response = await handleSignLease(leaseId);
      if (response.success) {
        toast.success("Lease signed successfully!");
        await Promise.all([loadTenants(), loadUnitDetails()]);
      }
    } catch (err) {
      console.error("Error signing lease:", err);
      toast.error("Failed to sign lease");
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Loading / Error states ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: "#EF4217" }} />
          <p className="text-gray-600">Loading unit details...</p>
        </div>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg border border-red-200 p-6 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "#FEE2E2" }}>
            <Building2 className="w-8 h-8" style={{ color: "#EF4217" }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "#141130" }}>Unit Not Found</h2>
          <p className="text-gray-600 mb-6">{error || "The unit you're looking for doesn't exist."}</p>
          <Button onClick={handleBack} className="text-white hover:opacity-90 transition" style={{ backgroundColor: "#EF4217" }}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
        </div>
      </div>
    );
  }

  const totalMonthly = unit.price + unitCharges.reduce((sum, c) => sum + c.amount, 0);
  const isHomeownerUnit = unit.leaseMode === "SERVICE_CHARGE" || origin === "homeowners";
  const occupantLabel = isHomeownerUnit ? "Homeowner" : "Tenant";

  // ─── Main Render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">

        {/* ── Modals & Sheets ── */}

        {/* Share Invite Dialog */}
        <Dialog open={shareInviteOpen} onOpenChange={setShareInviteOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" style={{ color: "#EF4217" }} />Share Invite
              </DialogTitle>
              <DialogDescription>Send this invitation link securely via email or SMS.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); if (!e.currentTarget.checkValidity()) { e.currentTarget.reportValidity(); return; } onShareInvite(); }}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Invite Link</Label>
                  <div className="flex gap-2">
                    <Input value={selectedInviteLink} readOnly className="font-mono text-sm" />
                    <Button type="button" size="icon" variant="outline" onClick={() => copyToClipboard(selectedInviteLink)}><Copy className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="share-channel">Notification Channel</Label>
                  <Select value={shareChannel} onValueChange={(value: "EMAIL" | "SMS") => setShareChannel(value)}>
                    <SelectTrigger id="share-channel"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL"><div className="flex items-center gap-2"><Mail className="w-4 h-4" />Email</div></SelectItem>
                      <SelectItem value="SMS"><div className="flex items-center gap-2"><MessageSquare className="w-4 h-4" />SMS</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient {shareChannel === "EMAIL" ? "Email" : "Phone Number"}</Label>
                  <Input id="recipient" type={shareChannel === "EMAIL" ? "email" : "tel"} pattern={shareChannel === "SMS" ? "\\+?[0-9]+" : undefined} placeholder={shareChannel === "EMAIL" ? "tenant@email.com" : "+1234567890"} value={shareRecipient} onChange={(e) => setShareRecipient(e.target.value)} required />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setShareInviteOpen(false); setShareRecipient(""); setSelectedInviteId(null); setSelectedInviteLink(""); }}>Cancel</Button>
                <Button type="submit" disabled={actionLoading} className="text-white" style={{ backgroundColor: "#EF4217" }}>
                  {actionLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Send className="w-4 h-4 mr-2" />Send Invite</>}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Create Invite Dialog */}
        <Dialog open={createInviteOpen} onOpenChange={setCreateInviteOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" style={{ color: "#EF4217" }} />Create {occupantLabel} Invite
              </DialogTitle>
              <DialogDescription>Generate an invitation link for the {occupantLabel.toLowerCase()} of this unit.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {createdInviteLink ? (
                <div className="space-y-2">
                  <Label>Generated Invite Link</Label>
                  <div className="flex gap-2">
                    <Input value={createdInviteLink} readOnly className="font-mono text-sm" />
                    <Button size="icon" variant="outline" onClick={() => copyToClipboard(createdInviteLink)}><Copy className="w-4 h-4" /></Button>
                  </div>
                  <p className="text-xs text-gray-500">Copy this link to share with the {occupantLabel.toLowerCase()}</p>
                </div>
              ) : (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-700">This will create a unique invitation link for the {occupantLabel.toLowerCase()} of Unit {unit.ref}.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreateInviteOpen(false); setCreatedInviteLink(""); }}>
                {createdInviteLink ? "Close" : "Cancel"}
              </Button>
              {!createdInviteLink && (
                <Button onClick={onCreateOccupantInvite} disabled={actionLoading} className="text-white" style={{ backgroundColor: "#EF4217" }}>
                  {actionLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : <><UserPlus className="w-4 h-4 mr-2" />Create Invite</>}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Chat Sheet */}
        <Sheet open={isChatOpen} onOpenChange={handleChatOpen}>
          <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
            <SheetHeader className="px-6 py-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" style={{ color: "#EF4217" }} />Lease Messages
              </SheetTitle>
              <SheetDescription>
                {checkPermissions(['view_tenants']) ? "Discuss lease details with your tenant" : `Chat with the landlord about Unit ${unit.ref}`}
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1 px-6 py-4">
              {messagesLoading && messages.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#EF4217" }} />
                </div>
              ) : messages.length > 0 ? (
                <div className="space-y-4">
                  {hasMoreMessages && (
                    <div className="flex justify-center pb-4">
                      <Button size="sm" variant="outline" onClick={loadMoreMessages} disabled={messagesLoading}>
                        {messagesLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading...</> : "Load older messages"}
                      </Button>
                    </div>
                  )}
                  {[...messages].reverse().map((msg) => {
                    const isFromTenant = msg.senderRole === "Tenant";
                    return (
                      <div key={msg.id} className={`flex ${isFromTenant ? "justify-start" : "justify-end"}`}>
                        <div className="max-w-[80%] space-y-1">
                          <div className="flex items-center gap-2 px-1">
                            <span className="text-xs font-medium text-gray-600">{msg.senderRole}</span>
                            <span className="text-xs text-gray-400">{new Date(msg.createdOn).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <div className={`px-4 py-2 rounded-lg ${isFromTenant ? "bg-gray-100 text-gray-900" : "text-white"}`} style={{ backgroundColor: isFromTenant ? undefined : "#EF4217" }}>
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-600 font-medium">No messages yet</p>
                  <p className="text-sm text-gray-500 mt-1">Start the conversation</p>
                </div>
              )}
            </ScrollArea>
            <div className="border-t p-4 bg-gray-50">
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
                <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type your message..." className="resize-none min-h-[60px] flex-1" disabled={sendingMessage} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
                <Button type="submit" size="icon" disabled={sendingMessage || !newMessage.trim()} className="text-white h-[60px] w-[60px]" style={{ backgroundColor: "#EF4217" }}>
                  {sendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </form>
              <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
            </div>
          </SheetContent>
        </Sheet>

        {/* ── Header ── */}
        <div>
          <Breadcrumb
            className="mb-2"
            items={[
              { label: "Properties", href: "/dashboard/property/properties" },
              { label: unitOriginLabel(origin), href: backHref },
              { label: `Unit ${unit.ref}` },
            ]}
          />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleBack} size="icon" className="hover:bg-gray-100 transition">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#141130" }}>Unit Details</h1>
                <p className="text-sm text-gray-500 mt-0.5">Unit {unit.ref}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <CanProperty propertyId={Number(propertyId)} permissions={["edit_unit"]}>
                <Button onClick={handleEdit} className="text-white hover:opacity-90 transition" style={{ backgroundColor: "#EF4217" }}>
                  <Edit className="w-4 h-4 mr-2" />Edit Unit
                </Button>
              </CanProperty>
              {!unit.advertise && (
                <CanProperty propertyId={Number(propertyId)} permissions={["advertise_unit"]}>
                  <Button onClick={() => handleAdvertiseToggle(true)} disabled={isTogglingAdvert} variant="outline" className="border-[#EF4217] text-[#EF4217] hover:bg-[#EF4217]/5">
                    {isTogglingAdvert ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                    Advertise
                  </Button>
                </CanProperty>
              )}
              <Can permissions={["create_invite"]}>
                {!unit.occupied && tenants.length === 0 && (
                  <Button onClick={() => setCreateInviteOpen(true)} variant="outline">
                    <UserPlus className="w-4 h-4 mr-2" />Assign {occupantLabel}
                  </Button>
                )}
              </Can>
            </div>
          </div>
        </div>

        {/* ── Summary Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Unit */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unit</p>
              <p className="text-xl font-bold" style={{ color: "#141130" }}>{unit.ref}</p>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${unit.occupied ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-700"}`}>
                {unit.occupied ? "Occupied" : "Vacant"}
              </span>
            </CardContent>
          </Card>
          {/* Type */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</p>
              <p className="text-base font-bold leading-tight" style={{ color: "#141130" }}>{resolveUnitTypeLabel(unit.unitType)}</p>
              <p className="text-xs text-gray-400">{getPropertyTypeName(unit.propertyType)}</p>
            </CardContent>
          </Card>
          {/* Rent */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rent</p>
              <p className="text-xl font-bold" style={{ color: "#EF4217" }}>{unit.currency} {unit.price.toLocaleString()}</p>
              <p className="text-xs text-gray-400 capitalize">{unit.leaseMode}</p>
            </CardContent>
          </Card>
          {/* Listing */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Listing</p>
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${unit.advertise ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-700"}`}>
                {unit.advertise ? "Listed" : "Not Listed"}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* ── Image Carousel ── */}
        <Card className="overflow-hidden">
          <div className="relative h-64 sm:h-80 bg-gray-200">
            {imageUrls.length > 0 ? (
              <>
                <img src={imageUrls[currentImageIndex]} alt={`Unit ${unit.ref} - Image ${currentImageIndex + 1}`} className="w-full h-full object-cover" />
                {imageUrls.length > 1 && (
                  <>
                    <button onClick={handlePreviousImage} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={handleNextImage} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-xs">
                      {currentImageIndex + 1} / {imageUrls.length}
                    </div>
                  </>
                )}
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: unit.occupied ? "#6B7280" : "#10B981" }}>
                  {unit.occupied ? "Occupied" : "Available"}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
              </div>
            )}
          </div>
          {imageUrls.length > 1 && (
            <div className="bg-gray-50 p-3 flex gap-2 overflow-x-auto border-t">
              {imageUrls.map((url, index) => (
                <button key={index} onClick={() => setCurrentImageIndex(index)} className={`h-14 w-14 rounded-md overflow-hidden flex-shrink-0 transition ${currentImageIndex === index ? "ring-2 ring-offset-1 ring-[#EF4217]" : "opacity-60 hover:opacity-100"}`}>
                  <img src={url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* ── Tab Bar ── */}
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex w-auto h-auto p-1 gap-1">
              <TabsTrigger value="overview" className="text-sm px-4">Overview</TabsTrigger>
              <TabsTrigger value="financials" className="text-sm px-4">Financials</TabsTrigger>
              <TabsTrigger value="tenant" className="text-sm px-4">Tenant</TabsTrigger>
              <TabsTrigger value="lease" className="text-sm px-4">Lease</TabsTrigger>
              <TabsTrigger value="maintenance" className="text-sm px-4">Maintenance</TabsTrigger>
              <TabsTrigger value="documents" className="text-sm px-4">Documents</TabsTrigger>
              <TabsTrigger value="listing" className="text-sm px-4">Listing</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Overview Tab ── */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            {/* Row 1: Unit Info + Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Unit Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold" style={{ color: "#141130" }}>Unit Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-3 text-sm">
                    {[
                      ["Unit Reference", unit.ref],
                      ["Unit Type", resolveUnitTypeLabel(unit.unitType)],
                      ["Property Type", getPropertyTypeName(unit.propertyType)],
                      ["Size", `${unit.size} ${unit.measurementUnits.name}`],
                      ["Lease Mode", unit.leaseMode],
                      ["Unit ID", `#${unit.unitId}`],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-4 py-1 border-b border-gray-50 last:border-0">
                        <dt className="text-gray-500 shrink-0">{label}</dt>
                        <dd className="font-semibold text-right capitalize" style={{ color: "#141130" }}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold" style={{ color: "#141130" }}>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-1 border-b border-gray-50">
                      <span className="text-gray-500">Base Rent</span>
                      <span className="font-semibold" style={{ color: "#141130" }}>{unit.currency} {unit.price.toLocaleString()}</span>
                    </div>
                    {loadingCharges ? (
                      <div className="flex items-center gap-2 py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        <span className="text-gray-400">Loading charges…</span>
                      </div>
                    ) : unitCharges.length > 0 ? (
                      unitCharges.map((charge) => (
                        <div key={charge.id} className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-gray-500">{charge.chargeName}</span>
                          <span className="font-semibold" style={{ color: "#141130" }}>{unit.currency} {charge.amount.toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 py-1">No additional charges</p>
                    )}
                    {/* Total box */}
                    <div className="mt-2 rounded-lg p-3" style={{ backgroundColor: "rgba(239,66,23,0.06)", border: "1px solid rgba(239,66,23,0.18)" }}>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold" style={{ color: "#141130" }}>Total</span>
                        <span className="text-xl font-bold" style={{ color: "#EF4217" }}>{unit.currency} {totalMonthly.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">per {unit.leaseMode}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Utilities */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: "#141130" }}>
                  <Zap className="w-4 h-4" style={{ color: "#EF4217" }} />Utilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {unit.utilities.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {unit.utilities.map((u) => (
                      <div key={u.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-sm font-medium text-green-800">{u.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No utilities included in this unit.</p>
                )}
              </CardContent>
            </Card>

            {/* Action cards row: Tenant · Lease · Listing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Tenant card */}
              <CanProperty propertyId={Number(propertyId)} permissions={["view_tenants"]}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold" style={{ color: "#141130" }}>Tenant</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tenantsLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#EF4217" }} />
                      </div>
                    ) : tenants.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0" style={{ backgroundColor: "#EF4217" }}>
                            {tenants[0].email.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate" style={{ color: "#141130" }}>{tenants[0].name || "Unnamed Tenant"}</p>
                            <p className="text-xs text-gray-500 truncate">{tenants[0].email}</p>
                          </div>
                        </div>
                        {hasAcceptedLease && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium text-xs">
                            ✓ Lease Signed
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-4 text-center">
                        <Users className="w-8 h-8 text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500 mb-3">No Tenant Assigned</p>
                        <Button size="sm" onClick={() => setCreateInviteOpen(true)} className="text-white text-xs" style={{ backgroundColor: "#EF4217" }}>
                          <UserPlus className="w-3 h-3 mr-1" />Assign Tenant
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CanProperty>

              {/* Lease card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold" style={{ color: "#141130" }}>Lease</CardTitle>
                </CardHeader>
                <CardContent>
                  {tenants.length > 0 && hasAcceptedLease ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <div className="text-xs text-green-800">
                        <p className="font-medium">Lease fully signed</p>
                        <p>Lease ID #{tenants[0].leaseId}</p>
                      </div>
                    </div>
                  ) : tenants.length > 0 ? (
                    <LeaseSignActions tenant={tenants[0]} actionLoading={actionLoading} onSign={handleSignLeaseAction} onChat={(leaseId) => handleChatOpen(true, leaseId)} />
                  ) : (
                    <div className="flex flex-col items-center py-4 text-center">
                      <Receipt className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">No Active Lease</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Listing card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold" style={{ color: "#141130" }}>Listing</CardTitle>
                </CardHeader>
                <CardContent>
                  {unit.advertise ? (
                    <div className="space-y-2">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Listed</span>
                      <p className="text-xs text-gray-500 pt-1">This unit is published and visible to potential tenants.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4 text-center">
                      <Eye className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500 mb-3">Not yet advertised</p>
                      <CanProperty propertyId={Number(propertyId)} permissions={["advertise_unit"]}>
                        <Button size="sm" onClick={() => handleAdvertiseToggle(true)} disabled={isTogglingAdvert} className="text-white text-xs" style={{ backgroundColor: "#EF4217" }}>
                          {isTogglingAdvert && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                          Publish Listing
                        </Button>
                      </CanProperty>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Financials Tab ── */}
          <TabsContent value="financials" className="space-y-4 mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: "#141130" }}>
                  <Receipt className="w-5 h-5" style={{ color: "#EF4217" }} />Supplementary Charges
                  {unitCharges.length > 0 && <span className="text-xs text-gray-400 font-normal ml-1">({unitCharges.length})</span>}
                </CardTitle>
                <CanProperty propertyId={Number(propertyId)} permissions={["edit_unit_charges"]}>
                  <Button onClick={() => setIsChargesDrawerOpen(true)} size="sm" className="text-white" style={{ backgroundColor: "#EF4217" }}>
                    <Edit className="w-4 h-4 mr-2" />Manage
                  </Button>
                </CanProperty>
              </CardHeader>
              <CardContent>
                {loadingCharges ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#EF4217" }} />
                  </div>
                ) : unitCharges.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left py-2.5 px-4 font-semibold text-gray-600">Charge</th>
                          <th className="text-left py-2.5 px-4 font-semibold text-gray-600">Amount</th>
                          <th className="text-left py-2.5 px-4 font-semibold text-gray-600">Period</th>
                          <th className="text-left py-2.5 px-4 font-semibold text-gray-600 hidden sm:table-cell">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unitCharges.map((charge) => (
                          <tr key={charge.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium" style={{ color: "#141130" }}>{charge.chargeName}</td>
                            <td className="py-3 px-4 font-semibold" style={{ color: "#EF4217" }}>{unit.currency} {charge.amount.toLocaleString()}</td>
                            <td className="py-3 px-4"><span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">{charge.periodName}</span></td>
                            <td className="py-3 px-4 text-gray-500 hidden sm:table-cell">{formatDate(charge.createdOn)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 mx-4 p-3 rounded-lg" style={{ backgroundColor: "rgba(239,66,23,0.06)", border: "1px solid rgba(239,66,23,0.18)" }}>
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold" style={{ color: "#141130" }}>Total Monthly</span>
                        <span className="text-lg font-bold" style={{ color: "#EF4217" }}>{unit.currency} {totalMonthly.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 mb-4">No charges configured for this unit</p>
                    <CanProperty propertyId={Number(propertyId)} permissions={["edit_unit_charges"]}>
                      <Button onClick={() => setIsChargesDrawerOpen(true)} variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />Add Charges
                      </Button>
                    </CanProperty>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tenant Tab ── */}
          <TabsContent value="tenant" className="space-y-6 mt-0">
            {/* Tenants & Invites */}
            <CanProperty propertyId={Number(propertyId)} permissions={["view_tenants"]}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: "#141130" }}>
                    <Users className="w-5 h-5" style={{ color: "#EF4217" }} />
                    Tenants & Invites
                    <span className="text-xs text-gray-400 font-normal">
                      {tenants.length} tenant{tenants.length !== 1 ? "s" : ""} · {unitInvites.length} invite{unitInvites.length !== 1 ? "s" : ""}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tenantsLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: "#EF4217" }} />
                      <p className="text-gray-500">Loading tenants...</p>
                    </div>
                  ) : hasAcceptedLease ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <p className="text-sm font-medium text-green-700">Active Lease</p>
                      </div>
                      {tenants.map((tenant) => (
                        <div key={tenant.id} className="p-4 border-2 rounded-lg bg-gradient-to-r from-green-50 to-white" style={{ borderColor: "#10B981" }}>
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ backgroundColor: "#EF4217" }}>
                              {tenant.email.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-base" style={{ color: "#141130" }}>{tenant.name || "Unnamed Tenant"}</p>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium text-xs">✓ Lease Signed</span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{tenant.email}</p>
                              {tenant.phoneNumber && <p className="text-sm text-gray-600 mb-2">Cell: {tenant.phoneNumber}</p>}
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Joined {formatDate(tenant.createdOn)}</span>
                                <span className="font-mono">Lease #{tenant.leaseId}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Tabs defaultValue="tenants" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="tenants" className="flex items-center gap-2">
                          <Users className="w-4 h-4" />Tenants
                          <span className="ml-1 text-xs bg-gray-200 px-2 py-0.5 rounded-full">{tenants.length}</span>
                        </TabsTrigger>
                        <TabsTrigger value="invites" className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />Invites
                          <span className="ml-1 text-xs bg-gray-200 px-2 py-0.5 rounded-full">{unitInvites.length}</span>
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="tenants" className="mt-0">
                        {tenants.length > 0 ? (
                          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                            {tenants.map((tenant) => (
                              <div key={tenant.id} className="p-4 border rounded-lg bg-white">
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0" style={{ backgroundColor: "#EF4217" }}>{tenant.email.charAt(0).toUpperCase()}</div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <p className="font-semibold" style={{ color: "#141130" }}>{tenant.name || "Unnamed"}</p>
                                      <span className="inline-flex px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium text-xs">Pending</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{tenant.email}</p>
                                    {tenant.phoneNumber && <p className="text-sm text-gray-600 mb-2">📱 {tenant.phoneNumber}</p>}
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Applied {formatDate(tenant.createdOn)}</span>
                                      <span className="font-mono">Lease #{tenant.leaseId}</span>
                                    </div>
                                    <LeaseSignActions tenant={tenant} actionLoading={actionLoading} onSign={handleSignLeaseAction} onChat={(leaseId) => handleChatOpen(true, leaseId)} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-gray-50">
                            <Users className="w-12 h-12 text-gray-400 mb-3" />
                            <p className="text-gray-600 font-medium">No potential tenants yet</p>
                            <p className="text-sm text-gray-500 mt-1 text-center max-w-md">Create an invite to attract tenants to this unit</p>
                          </div>
                        )}
                      </TabsContent>
                      <TabsContent value="invites" className="mt-0">
                        <div className="space-y-4">
                          <div className="flex justify-end">
                            <Button onClick={() => setCreateInviteOpen(true)} size="sm" className="text-white" style={{ backgroundColor: "#EF4217" }}>
                              <UserPlus className="w-4 h-4 mr-2" />Create Tenant Invite
                            </Button>
                          </div>
                          {invitesLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#EF4217" }} />
                            </div>
                          ) : unitInvites.length > 0 ? (
                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                              {unitInvites.map((invite) => (
                                <div key={invite.id} className="p-4 border rounded-lg bg-white">
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex px-2 py-1 rounded-full bg-purple-100 text-purple-800 font-medium text-xs">{invite.type}</span>
                                      <span className="text-xs text-gray-500">ID: {invite.id}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-600">
                                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{invite.validDays} days left</span>
                                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{invite.visits} visits</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(invite.link)} className="flex-1 text-xs"><Copy className="w-3 h-3 mr-1" />Copy</Button>
                                      <Button size="sm" variant="outline" onClick={() => openShareDialog(invite.id, invite.link)} className="flex-1 text-xs"><Send className="w-3 h-3 mr-1" />Share</Button>
                                    </div>
                                    <div className="flex gap-2 pt-2 border-t">
                                      <Button size="sm" variant="outline" onClick={() => onRenewInvite(invite.id)} disabled={actionLoading} className="flex-1 text-xs text-green-600 hover:bg-green-50"><RefreshCw className="w-3 h-3 mr-1" />Renew</Button>
                                      <Button size="sm" variant="outline" onClick={() => onTerminateInvite(invite.id)} disabled={actionLoading} className="flex-1 text-xs text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3 mr-1" />Terminate</Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-gray-50">
                              <Mail className="w-12 h-12 text-gray-400 mb-3" />
                              <p className="text-gray-600 font-medium">No active invites</p>
                              <p className="text-sm text-gray-500 mt-1">Create your first invite to get started</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            </CanProperty>

            {/* Landlords & Managers */}
            <CanProperty propertyId={Number(propertyId)} permissions={["view_landlord_and_managers"]}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: "#141130" }}>
                    <Building2 className="w-5 h-5" style={{ color: "#EF4217" }} />Landlords & Managers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {managersLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: "#EF4217" }} />
                      <p className="text-gray-500">Loading managers...</p>
                    </div>
                  ) : managers.length > 0 ? (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {managers.map((manager, index) => (
                        <div key={index} className="p-4 border rounded-lg bg-white">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0" style={{ backgroundColor: manager.roleName === "Landlord" ? "#141130" : "#EF4217" }}>
                              {manager.email.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p className="font-semibold" style={{ color: "#141130" }}>{manager.name || "Unnamed"}</p>
                                <span className="inline-flex px-2 py-0.5 rounded-full font-medium text-xs" style={{ backgroundColor: manager.roleName === "Landlord" ? "#141130" : "#FEE2E2", color: manager.roleName === "Landlord" ? "#FFFFFF" : "#EF4217" }}>
                                  {manager.roleName}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">✉️ {manager.email}</p>
                              {manager.phoneNumber && <p className="text-sm text-gray-600">📱 {manager.phoneNumber}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-gray-50">
                      <Building2 className="w-12 h-12 text-gray-400 mb-3" />
                      <p className="text-gray-600 font-medium">No managers assigned</p>
                      <p className="text-sm text-gray-500 mt-1 text-center max-w-md">This unit doesn't have any landlords or managers assigned yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CanProperty>
          </TabsContent>

          {/* ── Lease Tab ── */}
          <TabsContent value="lease" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lease Agreement */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold" style={{ color: "#141130" }}>Lease Agreement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CanProperty propertyId={Number(propertyId)} permissions={["view_lease_template"]}>
                    <Button onClick={() => handleViewPdf(unit.unitId)} variant="outline" className="w-full border-[#EF4217] text-[#EF4217] hover:bg-[#EF4217]/5">
                      <Eye className="w-4 h-4 mr-2" />View Lease Agreement (PDF)
                    </Button>
                  </CanProperty>
                  {/* Tenant-perspective signing */}
                  <CanProperty propertyId={Number(propertyId)} permissions={["view_landlord_and_managers"]}>
                    {unit.leaseId && !unit.occupied && (
                      <div className="space-y-2 pt-2 border-t">
                        <Button onClick={() => handleChatOpen(true, unit.leaseId)} variant="outline" className="w-full border-[#EF4217] text-[#EF4217]">
                          <MessageSquare className="w-4 h-4 mr-2" />Messages
                          {messages.length > 0 && <span className="ml-auto bg-[#EF4217] text-white text-xs px-2 py-0.5 rounded-full">{messages.length}</span>}
                        </Button>
                        {unit.tenantSigned && unit.ownerSigned ? (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <p className="text-xs text-green-800 font-medium">Lease fully signed</p>
                          </div>
                        ) : unit.ownerSigned && !unit.tenantSigned ? (
                          <Button onClick={() => { if (!unit.leaseId) return; handleSignLeaseAction(unit.leaseId); }} disabled={actionLoading} className="w-full text-white" style={{ backgroundColor: "#10B981" }}>
                            {actionLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing...</> : <><Edit className="w-4 h-4 mr-2" />Sign Lease Agreement</>}
                          </Button>
                        ) : unit.tenantSigned && !unit.ownerSigned ? (
                          <Button disabled variant="outline" className="w-full text-gray-400 border-gray-200 cursor-not-allowed">
                            <Clock className="w-4 h-4 mr-2" />Waiting for Owner Signature
                          </Button>
                        ) : (
                          <Button onClick={() => { if (!unit.leaseId) return; handleSignLeaseAction(unit.leaseId); }} disabled={actionLoading} className="w-full text-white" style={{ backgroundColor: "#10B981" }}>
                            {actionLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing...</> : <><Edit className="w-4 h-4 mr-2" />Sign Lease Agreement</>}
                          </Button>
                        )}
                      </div>
                    )}
                  </CanProperty>
                </CardContent>
              </Card>

              {/* Lease Status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold" style={{ color: "#141130" }}>Lease Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {tenants.length > 0 ? (
                    <div className="space-y-3">
                      {tenants.map((tenant) => (
                        <div key={tenant.id} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium text-sm" style={{ color: "#141130" }}>{tenant.name || tenant.email}</p>
                            <span className="font-mono text-xs text-gray-400">#{tenant.leaseId}</span>
                          </div>
                          <LeaseSignActions tenant={tenant} actionLoading={actionLoading} onSign={handleSignLeaseAction} onChat={(leaseId) => handleChatOpen(true, leaseId)} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-8 text-center">
                      <Receipt className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">No Active Lease</p>
                      <p className="text-sm text-gray-400 mt-1">Assign a tenant to create a lease</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Maintenance Tab ── */}
          <TabsContent value="maintenance" className="mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Maintenance work orders</CardTitle><p className="mt-1 text-sm text-gray-500">Report, schedule and track repairs for this unit.</p></div><Button onClick={()=>setMaintenanceOpen(v=>!v)}><Plus className="mr-2 h-4 w-4"/>New request</Button></CardHeader>
              <CardContent className="space-y-4">
                {maintenanceOpen&&<div className="grid gap-3 rounded-xl border bg-gray-50 p-4 md:grid-cols-2"><Input value={maintenanceForm.title} onChange={e=>setMaintenanceForm({...maintenanceForm,title:e.target.value})} placeholder="Issue title"/><Select value={maintenanceForm.priority} onValueChange={priority=>setMaintenanceForm({...maintenanceForm,priority})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["LOW","MEDIUM","HIGH","EMERGENCY"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><Select value={maintenanceForm.category} onValueChange={category=>setMaintenanceForm({...maintenanceForm,category})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["PLUMBING","ELECTRICAL","APPLIANCE","STRUCTURAL","SECURITY","CLEANING","PEST_CONTROL","OTHER"].map(v=><SelectItem key={v} value={v}>{v.replaceAll("_"," ")}</SelectItem>)}</SelectContent></Select><Textarea value={maintenanceForm.description} onChange={e=>setMaintenanceForm({...maintenanceForm,description:e.target.value})} placeholder="Describe the problem and access considerations" className="md:col-span-2"/><div className="flex gap-2 md:col-span-2"><Button onClick={submitMaintenance}>Submit request</Button><Button variant="outline" onClick={()=>setMaintenanceOpen(false)}>Cancel</Button></div></div>}
                {maintenanceLoading?<div className="py-10 text-center text-sm text-gray-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin"/>Loading work orders…</div>:maintenance.length===0?<div className="flex flex-col items-center py-12 text-center"><Wrench className="mb-3 h-10 w-10 text-gray-300"/><p className="font-medium text-gray-600">No maintenance requests</p><p className="mt-1 text-sm text-gray-400">Create the first work order when something needs attention.</p></div>:<div className="space-y-3">{maintenance.map(order=><div key={order.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><b>{order.title}</b><Badge variant="outline">{order.priority}</Badge></div><p className="mt-1 text-sm text-gray-500">{order.workOrderNumber} · {order.category.replaceAll("_"," ")} · {formatDate(order.createdOn)}</p><p className="mt-2 text-sm">{order.description}</p></div><div className="text-right"><Badge>{order.status.replaceAll("_"," ")}</Badge>{canAdvanceMaintenance&&["OPEN","ACKNOWLEDGED","IN_PROGRESS"].includes(order.status)&&<button onClick={()=>advanceMaintenance(order)} className="mt-3 block text-xs font-semibold text-[#EF4217]">Advance status</button>}</div></div></div>)}</div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Documents Tab ── */}
          <TabsContent value="documents" className="mt-0">
            <Card>
              <CardHeader><CardTitle>Lease and property documents</CardTitle><p className="text-sm text-gray-500">Documents generated for this unit, including agreements and notices.</p></CardHeader>
              <CardContent>
                {documentsLoading?<div className="py-10 text-center text-sm text-gray-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin"/>Loading documents…</div>:documents.length===0?<div className="flex flex-col items-center py-12 text-center"><FileText className="mb-3 h-10 w-10 text-gray-300"/><p className="font-medium text-gray-600">No documents for this unit</p><p className="mt-1 text-sm text-gray-400">Generated agreements and notices will appear here.</p></div>:<div className="divide-y rounded-xl border">{documents.map(document=><div key={document.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><b>{document.name}</b><p className="mt-1 text-xs text-gray-500">{document.documentType.replaceAll("_"," ")} · Version {document.templateVersion} · {document.status}</p></div><Button variant="outline" size="sm" onClick={()=>openDocument(document.id)}><Eye className="mr-2 h-4 w-4"/>Open PDF</Button></div>)}</div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Listing Tab ── */}
          <TabsContent value="listing" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Advertisement */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold" style={{ color: "#141130" }}>Advertisement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm" style={{ color: "#141130" }}>Advertise Unit</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {unit.advertise ? "Currently listed for tenants" : "Not visible to potential tenants"}
                      </p>
                    </div>
                    <CanProperty propertyId={Number(propertyId)} permissions={["advertise_unit"]}>
                      <Switch checked={unit.advertise} onCheckedChange={handleAdvertiseToggle} disabled={isTogglingAdvert} className="data-[state=unchecked]:bg-gray-400 data-[state=checked]:bg-[#EF4217]" />
                    </CanProperty>
                  </div>
                  {unit.advertise ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <p className="text-sm text-green-800 font-medium">Unit is live and visible to potential tenants</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 border border-orange-200">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <p className="text-sm text-orange-800 font-medium">Unit is not advertised</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Create Similar Units */}
              <CanProperty propertyId={Number(propertyId)} permissions={["create_unit"]}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold" style={{ color: "#141130" }}>Similar Units</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-500">Create multiple units with the same specifications as Unit {unit.ref}.</p>
                    <div className="p-3 bg-gray-50 rounded-lg border text-sm space-y-1.5">
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Template</p>
                      <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium" style={{ color: "#141130" }}>{resolveUnitTypeLabel(unit.unitType)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Size</span><span className="font-medium" style={{ color: "#141130" }}>{unit.size} {unit.measurementUnits.name}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="font-medium" style={{ color: "#EF4217" }}>{unit.currency} {unit.price.toLocaleString()}</span></div>
                    </div>
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full border-[#EF4217] text-[#EF4217] hover:bg-[#EF4217]/5">
                          <Copy className="w-4 h-4 mr-2" />Create Similar Units
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle style={{ color: "#141130" }}>Create Similar Units</DialogTitle>
                          <DialogDescription>Create multiple units with the same specifications as Unit {unit.ref}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                          <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-700">Action will run in the background and a notification will be sent to your email once completed.</p>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-sm font-medium" style={{ color: "#141130" }}>Number of Units (1-49)</Label>
                            <div className="flex items-center gap-3">
                              <Button variant="outline" size="icon" onClick={decrementCount} disabled={similarUnitsCount <= 1 || isCreatingSimilar} className="h-12 w-12">
                                <Minus className="w-5 h-5" />
                              </Button>
                              <Input type="number" min="1" max="49" value={similarUnitsCount} onChange={handleCountChange} disabled={isCreatingSimilar} className="h-12 text-center text-2xl font-bold" style={{ color: "#141130" }} />
                              <Button variant="outline" size="icon" onClick={incrementCount} disabled={similarUnitsCount >= 49 || isCreatingSimilar} className="h-12 w-12">
                                <Plus className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2 p-4 bg-gray-50 rounded-lg border">
                            <p className="text-xs font-semibold text-gray-500 uppercase">Template Unit</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div><span className="text-gray-600">Type:</span><span className="ml-2 font-medium" style={{ color: "#141130" }}>{resolveUnitTypeLabel(unit.unitType)}</span></div>
                              <div><span className="text-gray-600">Size:</span><span className="ml-2 font-medium" style={{ color: "#141130" }}>{unit.size} {unit.measurementUnits.name}</span></div>
                              <div><span className="text-gray-600">Price:</span><span className="ml-2 font-medium" style={{ color: "#EF4217" }}>{unit.currency} {unit.price.toLocaleString()}</span></div>
                              <div><span className="text-gray-600">Lease:</span><span className="ml-2 font-medium capitalize" style={{ color: "#141130" }}>{unit.leaseMode}</span></div>
                            </div>
                          </div>
                        </div>
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isCreatingSimilar} className="w-full sm:w-auto">Cancel</Button>
                          <Button type="button" onClick={handleCreateSimilar} disabled={isCreatingSimilar} className="w-full sm:w-auto text-white hover:opacity-90" style={{ backgroundColor: "#EF4217" }}>
                            {isCreatingSimilar ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : <><Copy className="w-4 h-4 mr-2" />Create {similarUnitsCount} Unit{similarUnitsCount > 1 ? "s" : ""}</>}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              </CanProperty>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* PDF Viewer Modal */}
      <Dialog open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle style={{ color: "#141130" }}>Lease Template Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full h-full p-4">
            {pdfUrl ? (
              <iframe src={pdfUrl} className="w-full h-full border rounded" title="Lease Template PDF" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Loading PDF...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Charges Drawer */}
      <ManageChargesDrawer isOpen={isChargesDrawerOpen} onClose={() => setIsChargesDrawerOpen(false)} unitId={Number(unitId)} currency={unit.currency} onSave={handleChargesSaved} />
    </div>
  );
}
