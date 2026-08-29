// ==================== PART 1 OF 3 ====================
// COPY THIS ENTIRE PART 1 FIRST
// This includes: imports, interfaces, component start, state, and helper functions

"use client";

import {useState, useEffect} from "react";
import {useRouter, useParams} from "next/navigation";
import {useApi} from "@/hooks/useApi";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {usePropertyMetadata} from "@/app/(dashboard)/dashboard/property/propertyMetadata";
import { Breadcrumb } from "@/components/ui/breadcrumb";

import {
    MapPin,
    Loader2,
    ArrowLeft,
    Edit,
    Building2,
    Map,
    Plus,
    Search,
    Home,
    Users,
    UserPlus,
    Mail,
    Send,
    Trash2,
    RefreshCw,
    Copy,
    Clock,
    Eye,
    MessageSquare,
    Wallet
} from "lucide-react";
import {GoogleMap, Marker, useLoadScript} from "@react-google-maps/api";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {Label} from "@/components/ui/label";
import {toast} from "sonner";
import Can from "@/components/auth/Can";
import CanProperty, {usePropertyPermissions} from "@/components/auth/CanProperty";
import PropertyAccountsSheet from "@/components/property/PropertyAccountsSheet";

interface PropertyDetails {
    id: number;
    name: string;
    type: string;
    address: string;
    mapLocation: string;
    currency: string;
    image: string;
    thumbnail?: string;
    imagePathMask?: string;
}

interface UnitType {
    id: number;
    name: string;
}

interface MeasurementUnits {
    id: number;
    name: string;
}

interface Utility {
    id: number;
    name: string;
}

interface Unit {
    propertyId: number;
    ref: string;
    type: UnitType;
    size: number;
    measurementUnits: MeasurementUnits;
    utilities: Utility[];
    leaseMode: string;
    price: number;
    currency: string;
    occupied: boolean;
    advertise: boolean;
    thumbnail: string;
    unitId: number;
}

interface Staff {
    name: string | null;
    type: string;
    email: string;
    staffId: number;
    joinedOn: string;
}

interface Invite {
    id: number;
    link: string;
    type: string;
    validDays: number;
    visits: number;
}

interface StaffAndInvites {
    staff: Staff[];
    invites: Invite[];
}


const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

export default function PropertyDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const propertyId = params?.id as string;
    const {
        viewPropertyDetails,
        getPropertyImage,
        getUnits,
        handleCreateInvite,
        handleGetStaffAndInvites,
        handleShareInvite,
        handleSupportedInvites,
        handleUpdateInvite,
        handleDeleteStaff,
    } = useApi();
    const {getPropertyTypeName, isLoadingTypes, getUnitTypes, resolveUnitTypeLabel } = usePropertyMetadata();

    // Permission checking hook
    const {checkPermissions, getPropertyRoles} = usePropertyPermissions(Number(propertyId));
    const {isLoaded: isMapsLoaded} = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
        libraries: GOOGLE_MAPS_LIBRARIES,
    });

    // Property state
    const [property, setProperty] = useState<PropertyDetails | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mapCenter, setMapCenter] = useState({lat: -1.286389, lng: 36.817223});
    const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);

    // Units state
    const [units, setUnits] = useState([]);
    const [unitsLoading, setUnitsLoading] = useState(false);
    const [unitsPage, setUnitsPage] = useState(0);
    const [unitsPageSize, setUnitsPageSize] = useState(10);
    const [unitsTotalPages, setUnitsTotalPages] = useState(0);
    const [unitsTotalElements, setUnitsTotalElements] = useState(0);
    const [unitsSearch, setUnitsSearch] = useState("");
    const [unitsSortField, setUnitsSortField] = useState("id");
    const [unitsSortOrder, setUnitsSortOrder] = useState<"asc" | "desc">("desc");
    const [debouncedUnitsSearch, setDebouncedUnitsSearch] = useState("");
    const [unitImageCache, setUnitImageCache] = useState<Record<string, string>>({});

    // Staff & Invites state
    const [staffData, setStaffData] = useState<StaffAndInvites | null>(null);
    const [staffLoading, setStaffLoading] = useState(false);
    const [createInviteOpen, setCreateInviteOpen] = useState(false);
    const [shareInviteOpen, setShareInviteOpen] = useState(false);
    const [selectedInviteType, setSelectedInviteType] = useState("");
    const [supportedInviteTypes, setSupportedInviteTypes] = useState<any[]>([]);
    const [createdInviteLink, setCreatedInviteLink] = useState("");
    const [selectedInviteId, setSelectedInviteId] = useState<number | null>(null);
    const [selectedInviteLink, setSelectedInviteLink] = useState("");
    const [shareRecipient, setShareRecipient] = useState("");
    const [shareChannel, setShareChannel] = useState<"EMAIL" | "SMS">("EMAIL");
    const [actionLoading, setActionLoading] = useState(false);

    // Payment Accounts sheet — see components/property/PropertyAccountsSheet.tsx
    const [accountsSheetOpen, setAccountsSheetOpen] = useState(false);

    // Debounce units search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedUnitsSearch(unitsSearch);
            setUnitsPage(0);
        }, 500);
        return () => clearTimeout(timer);
    }, [unitsSearch]);

    // Load property details
    useEffect(() => {
        if (!propertyId) {
            return;
        }
        const initAndLoad = async () => {
            if (!isLoadingTypes) {
                loadPropertyDetails()
                    .then((details) => {
                        console.log("Type details will use: ", details);
                        if (details && details.type) {
                            console.log("Calling endpoint to fetch unit types under : " + details.type);
                            return getUnitTypes(details.type);
                        }
                    })
                    .catch((error) => {
                        console.error("Failed to load property or unit types:", error);
                    });
            } else {
                console.log("Loading Types...")
            }
        };
        initAndLoad();
    }, [propertyId, isLoadingTypes]);

    // Load units
    useEffect(() => {
        if (propertyId) {
            loadUnits();
        }
    }, [propertyId, unitsPage, unitsPageSize, debouncedUnitsSearch, unitsSortField, unitsSortOrder]);

    // Load staff and invites
    useEffect(() => {
        if (propertyId) {
            loadSupportedInviteTypes();

            if (checkPermissions(["view_property_staff"])) {
                loadStaffAndInvites();
            }
        }
    }, [propertyId]);

    // Loading functions
    const loadPropertyDetails = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await viewPropertyDetails(Number(propertyId));

            if (response.success && response.data) {
                const propertyData = response.data[0];
                setProperty(propertyData);
                if (propertyData.mapLocation) {
                    const [lat, lng] = propertyData.mapLocation
                        .split(",")
                        .map((coord: string) => parseFloat(coord.trim()));

                    if (!isNaN(lat) && !isNaN(lng)) {
                        setMapCenter({lat, lng});
                        setMarker({lat, lng});
                    }
                }

                if (propertyData.thumbnail) {
                    // const image = propertyData.imagePathMask + "/" + propertyData.thumbnail;
                    loadPropertyImage(propertyData.thumbnail);
                }
                return propertyData;
            } else {
                setError(response.message || "Failed to load property details");
            }
        } catch (err: any) {
            console.error("Error loading property:", err);
            setError(err.message || "Failed to load property details");
        } finally {
            setLoading(false);
        }
    };

    const loadPropertyImage = async (imagePath: string) => {
        try {
            // const imageBlob = await getPropertyImage(imagePath);
            // const url = URL.createObjectURL(imageBlob);
            setImageUrl(imagePath);
        } catch (err) {
            console.error("Error loading image:", err);
        }
    };

    const loadUnits = async () => {
        try {
            setUnitsLoading(true);

            const response = await getUnits({
                page: unitsPage,
                size: unitsPageSize,
                sort: `${unitsSortField},${unitsSortOrder}`,
                propertyId: Number(propertyId),
            });

            setUnits(response.data || []);
            setUnitsTotalPages(response.totalPages || 0);
            setUnitsTotalElements(response.totalElements || 0);

            if (response.data) {
                response.data.forEach((unit: any) => {
                    if (unit.thumbnail && !unitImageCache[unit.thumbnail]) {
                        loadUnitImage(unit.thumbnail);
                    }
                });
            }
        } catch (err: any) {
            console.error("Error loading units:", err);
        } finally {
            setUnitsLoading(false);
        }
    };

    const loadUnitImage = async (imagePath: string) => {
        try {
            // const imageBlob = await getPropertyImage(imagePath);
            // const url = URL.createObjectURL(imageBlob);
            const url = imagePath
            setUnitImageCache((prev) => ({...prev, [imagePath]: url}));
        } catch (err) {
            console.error("Error loading unit image:", err);
        }
    };

    const loadStaffAndInvites = async () => {
        try {
            setStaffLoading(true);
            const response = await handleGetStaffAndInvites(Number(propertyId));
            if (response.success && response.data && response.data.length > 0) {
                setStaffData(response.data[0]);
            }
        } catch (err) {
            console.error("Error loading staff and invites:", err);
            toast.error("Failed to load staff and invites");
        } finally {
            setStaffLoading(false);
        }
    };

    const loadSupportedInviteTypes = async () => {
        try {
            const response = await handleSupportedInvites();
            if (response.success && response.data) {
                setSupportedInviteTypes(response.data);
            }
        } catch (err) {
            console.error("Error loading supported invite types:", err);
        }
    };

    // Action handlers
    const onCreateInvite = async () => {
        if (!selectedInviteType) {
            toast.error("Please select an invite type");
            return;
        }

        try {
            setActionLoading(true);
            const response = await handleCreateInvite(selectedInviteType, Number(propertyId));
            if (response.success && response.data && response.data.length > 0) {
                setCreatedInviteLink(response.data[0]);
                toast.success("Invite created successfully");
                loadStaffAndInvites();
                setSelectedInviteType("");
            }
        } catch (err) {
            toast.error("Failed to create invite");
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
            const response = await handleShareInvite(
                selectedInviteId,
                shareRecipient,
                shareChannel
            );
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
            const response = await handleUpdateInvite({id: inviteId, active: true});
            if (response.success) {
                toast.success("Invite renewed successfully");
                loadStaffAndInvites();
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
            const response = await handleUpdateInvite({id: inviteId, active: false});
            if (response.success) {
                toast.success("Invite terminated successfully");
                loadStaffAndInvites();
            }
        } catch (err) {
            toast.error("Failed to terminate invite");
        } finally {
            setActionLoading(false);
        }
    };

    const onDeleteStaff = async (staffId: number) => {
        if (!confirm("Are you sure you want to remove this staff member?")) return;

        try {
            setActionLoading(true);
            const response = await handleDeleteStaff(staffId);
            if (response.success) {
                toast.success("Staff member removed successfully");
                loadStaffAndInvites();
            }
        } catch (err) {
            toast.error("Failed to remove staff member");
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

    // Navigation handlers
    const handleAddUnit = () => {
        if (!property) return;
        const nameSlug = property.name.replace(/\s+/g, "-").toLowerCase();
        const currency = property?.currency || "";
        const propertyType = property?.type || "";
        router.push(`/dashboard/unit/create/${propertyId}?name=${nameSlug}&currency=${currency}&propertyType=${propertyType}&from=property`);
    };

    const handleEdit = () => {
        router.push(`/dashboard/property/properties/edit/${propertyId}`);
    };

    const handleBack = () => {
        router.push("/dashboard/property/properties");
    };

    const handleViewUnit = (unitId: number) => {
        router.push(`/dashboard/unit/details/${unitId}?p=${propertyId}&from=property`);
    };

    const handleUnitsSort = (value: string) => {
        const [field, order] = value.split("-");
        setUnitsSortField(field);
        setUnitsSortOrder(order as "asc" | "desc");
        setUnitsPage(0);
    };


    // ==================== END OF PART 1 ====================
    // Now copy PART 2.1 below this
    // ==================== PART 2.1 OF 3 ====================
// COPY THIS ENTIRE PART 2.1 AFTER PART 1
// This includes: Loading states, error states, modals (Create & Share Invite)

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2
                        className="w-12 h-12 animate-spin mx-auto mb-4"
                        style={{color: "#EF4217"}}
                    />
                    <p className="text-gray-600">Loading property details...</p>
                </div>
            </div>
        );
    }

    if (error || !property) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-lg border border-red-200 p-6 text-center">
                    <div
                        className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                        style={{backgroundColor: "#FEE2E2"}}
                    >
                        <MapPin className="w-8 h-8" style={{color: "#EF4217"}}/>
                    </div>
                    <h2 className="text-xl font-bold mb-2" style={{color: "#141130"}}>
                        Property Not Found
                    </h2>
                    <p className="text-gray-600 mb-6">
                        {error || "The property you're looking for doesn't exist."}
                    </p>
                    <Button
                        onClick={handleBack}
                        className="text-white hover:opacity-90 transition"
                        style={{backgroundColor: "#EF4217"}}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2"/>
                        Back to Properties
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="space-y-1.5">
                    <Breadcrumb items={[
                        { label: "Properties", href: "/dashboard/property/properties" },
                        { label: property.name },
                    ]} />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" onClick={handleBack} size="icon"
                                    className="hover:bg-gray-100 transition">
                                <ArrowLeft className="w-4 h-4"/>
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold" style={{color: "#141130"}}>
                                    {property.name}
                                </h1>
                                <p className="text-muted-foreground mt-1">Property Details</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Create Invite Modal */}
                <Dialog open={createInviteOpen} onOpenChange={setCreateInviteOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <UserPlus className="w-5 h-5" style={{color: "#EF4217"}}/>
                                Create New Invite
                            </DialogTitle>
                            <DialogDescription>
                                Generate an invitation link for staff members to join this property.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="invite-type">Invite Type</Label>
                                <Select value={selectedInviteType} onValueChange={setSelectedInviteType}>
                                    <SelectTrigger id="invite-type">
                                        <SelectValue placeholder="Select invite type"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {supportedInviteTypes.filter(type => type.id !== "TENANT" && type.id !== "USER").map((type) => (
                                            <SelectItem key={type.id} value={type.id}>
                                                {type.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {createdInviteLink && (
                                <div className="space-y-2">
                                    <Label>Generated Invite Link</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={createdInviteLink}
                                            readOnly
                                            className="font-mono text-sm"
                                        />
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => copyToClipboard(createdInviteLink)}
                                        >
                                            <Copy className="w-4 h-4"/>
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Copy this link to share with the invitee
                                    </p>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setCreateInviteOpen(false);
                                    setSelectedInviteType("");
                                    setCreatedInviteLink("");
                                }}
                            >
                                {createdInviteLink ? "Close" : "Cancel"}
                            </Button>
                            {!createdInviteLink && (
                                <Button
                                    onClick={onCreateInvite}
                                    disabled={actionLoading || !selectedInviteType}
                                    className="text-white"
                                    style={{backgroundColor: "#EF4217"}}
                                >
                                    {actionLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4 mr-2"/>
                                            Create Invite
                                        </>
                                    )}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Share Invite Modal */}
                <Dialog open={shareInviteOpen} onOpenChange={setShareInviteOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Send className="w-5 h-5" style={{color: "#EF4217"}}/>
                                Share Invite
                            </DialogTitle>
                            <DialogDescription>
                                Send this invitation link to a recipient via email or SMS.
                            </DialogDescription>
                        </DialogHeader>

                        {/* IMPORTANT — wrap EVERYTHING in a FORM */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();

                                // Trigger built-in browser validation UI
                                if (!e.currentTarget.checkValidity()) {
                                    e.currentTarget.reportValidity();
                                    return;
                                }

                                // If validation passes → run your logic
                                onShareInvite();
                            }}
                        >
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Invite Link</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={selectedInviteLink}
                                            readOnly
                                            className="font-mono text-sm"
                                        />
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => copyToClipboard(selectedInviteLink)}
                                        >
                                            <Copy className="w-4 h-4"/>
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="share-channel">Notification Channel</Label>
                                    <Select
                                        value={shareChannel}
                                        onValueChange={(value: "EMAIL" | "SMS") => setShareChannel(value)}
                                    >
                                        <SelectTrigger id="share-channel">
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="EMAIL">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4"/>
                                                    Email
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="SMS">
                                                <div className="flex items-center gap-2">
                                                    <MessageSquare className="w-4 h-4"/>
                                                    SMS
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="recipient">
                                        Recipient {shareChannel === "EMAIL" ? "Email" : "Phone Number"}
                                    </Label>
                                    <Input
                                        id="recipient"
                                        type={shareChannel === "EMAIL" ? "email" : "tel"}
                                        pattern={shareChannel === "SMS" ? "\\+?[0-9]+" : undefined}
                                        placeholder={
                                            shareChannel === "EMAIL"
                                                ? "example@email.com"
                                                : "+1234567890"
                                        }
                                        value={shareRecipient}
                                        onChange={(e) => setShareRecipient(e.target.value)}
                                        required={shareChannel === "EMAIL" || shareChannel === "SMS"}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShareInviteOpen(false);
                                        setShareRecipient("");
                                        setSelectedInviteId(null);
                                        setSelectedInviteLink("");
                                    }}
                                >
                                    Cancel
                                </Button>

                                {/* SUBMIT button = validation will fire */}
                                <Button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="text-white"
                                    style={{backgroundColor: "#EF4217"}}
                                >
                                    {actionLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 mr-2"/>
                                            Send Invite
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Payment Accounts Sheet — attach/detach the landlord's payment accounts to this property */}
                {property && (
                    <PropertyAccountsSheet
                        propertyId={Number(propertyId)}
                        propertyName={property.name}
                        open={accountsSheetOpen}
                        onOpenChange={setAccountsSheetOpen}
                    />
                )}

                {/* Accordion for Property Details */}
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="property-details" className="border rounded-lg bg-white">
                        <AccordionTrigger className="px-6 hover:no-underline">
                            <div className="flex items-center gap-3">
                                <Building2 className="w-5 h-5" style={{color: "#EF4217"}}/>
                                <div className="text-left">
                                    <h2 className="text-xl font-semibold" style={{color: "#141130"}}>
                                        Property Information
                                    </h2>
                                    <p className="text-sm text-gray-500">{getPropertyTypeName(property.type)} • {property.address}</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="px-6 pb-6 pt-2">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Property Image & Map */}
                                    <div className="lg:col-span-2 space-y-6">
                                        {/* Property Image */}
                                        <div className="relative h-96 bg-gray-200 rounded-lg overflow-hidden">
                                            {imageUrl ? (
                                                <img
                                                    src={imageUrl}
                                                    alt={property.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div
                                                    className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                                    <Loader2 className="w-12 h-12 animate-spin text-gray-400"/>
                                                </div>
                                            )}
                                            <div
                                                className="absolute top-4 right-4 px-4 py-2 rounded-full text-sm font-semibold text-white backdrop-blur-sm"
                                                style={{backgroundColor: "#EF4217"}}
                                            >
                                                {getPropertyTypeName(property.type)}
                                            </div>
                                        </div>

                                        {/* Map */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-4">
                                                <Map className="w-5 h-5" style={{color: "#EF4217"}}/>
                                                <h3 className="text-lg font-semibold" style={{color: "#141130"}}>
                                                    Location
                                                </h3>
                                            </div>
                                            <div
                                                className="h-64 w-full rounded-lg overflow-hidden border-2"
                                                style={{borderColor: "#EF4217"}}
                                            >
                                                {isMapsLoaded && (
                                                    <GoogleMap
                                                        mapContainerStyle={{width: "100%", height: "100%"}}
                                                        center={mapCenter}
                                                        zoom={15}
                                                        options={{
                                                            streetViewControl: false,
                                                            mapTypeControl: true,
                                                        }}
                                                    >
                                                        {marker && (
                                                            <Marker
                                                                position={marker}
                                                                animation={google.maps.Animation.DROP}
                                                            />
                                                        )}
                                                    </GoogleMap>
                                                )}
                                            </div>
                                            <div className="mt-4 space-y-2">
                                                <div className="flex items-start gap-2 text-gray-600">
                                                    <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0"/>
                                                    <div>
                                                        <p className="font-medium">Address</p>
                                                        <p className="text-sm">{property.address}</p>
                                                    </div>
                                                </div>
                                                <div className="pt-2 border-t">
                                                    <p className="text-sm text-gray-600">Coordinates</p>
                                                    <p className="font-mono text-sm">{property.mapLocation}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Property Info Sidebar */}
                                    <div className="space-y-4">
                                        <div className="p-4 border rounded-lg space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <span className="text-sm font-medium">Property Type</span>
                                                </div>
                                                <p className="text-md font-semibold pl-0" style={{color: "#141130"}}>
                                                    {getPropertyTypeName(property.type)}
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <span className="text-sm font-medium">Currency</span>
                                                </div>
                                                <p className="text-md font-semibold pl-0" style={{color: "#141130"}}>
                                                    {property.currency}
                                                </p>
                                            </div>

                                            <div className="pt-4 border-t">
                                                <p className="text-sm text-gray-600 mb-1">Property ID</p>
                                                <p className="font-mono text-sm font-medium">#{property.id}</p>
                                            </div>
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="p-4 border rounded-lg space-y-3">
                                            <h3 className="font-semibold" style={{color: "#141130"}}>
                                                Quick Actions
                                            </h3>

                                            <Can permissions={["create_unit"]}>
                                                <Button
                                                    onClick={handleAddUnit}
                                                    className="w-full text-white hover:opacity-90 transition"
                                                    style={{backgroundColor: "#EF4217"}}
                                                >
                                                    <Plus className="w-4 h-4 mr-2"/>
                                                    Add Unit
                                                </Button>
                                            </Can>

                                            <Can permissions={["edit_property"]}>
                                                <Button
                                                    onClick={handleEdit}
                                                    variant="outline"
                                                    className="w-full hover:bg-gray-100 transition"
                                                    style={{borderColor: "#EF4217", color: "#EF4217"}}
                                                >
                                                    <Edit className="w-4 h-4 mr-2"/>
                                                    Edit Property
                                                </Button>
                                            </Can>

                                            
                                        <Can roles={["Landlord"]}>
                                            <Button
                                                onClick={() => setAccountsSheetOpen(true)}
                                                variant="outline"
                                                className="w-full hover:bg-gray-100 transition"
                                                style={{ borderColor: "#EF4217", color: "#EF4217" }}
                                            >
                                                <Wallet className="w-4 h-4 mr-2" />
                                                Payment Accounts
                                            </Button>
                                        </Can>


                                            <Button
                                                onClick={handleBack}
                                                variant="outline"
                                                className="w-full hover:bg-gray-100 transition"
                                            >
                                                <ArrowLeft className="w-4 h-4 mr-2"/>
                                                Back to List
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                {/* ==================== PART 2.2 OF 3 ==================== */}
                {/* Units Section - MOVED UP */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Home className="w-6 h-6" style={{color: "#EF4217"}}/>
                            <div>
                                <h2 className="text-2xl font-bold" style={{color: "#141130"}}>
                                    Units
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {unitsTotalElements} {unitsTotalElements === 1 ? "unit" : "units"} in this property
                                </p>
                            </div>
                        </div>
                        <Can permissions={["create_unit"]}>
                            <Button
                                onClick={handleAddUnit}
                                className="text-white hover:opacity-90 transition"
                                style={{backgroundColor: "#EF4217"}}
                            >
                                <Plus className="w-4 h-4 mr-2"/>
                                Create Unit
                            </Button>
                        </Can>
                    </div>

                    {/* Units Filters */}
                    <div
                        className="bg-white p-4 rounded-lg border space-y-4 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                            <Input
                                type="text"
                                placeholder="Search units..."
                                value={unitsSearch}
                                onChange={(e) => setUnitsSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <Select
                            value={`${unitsSortField}-${unitsSortOrder}`}
                            onValueChange={handleUnitsSort}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Sort by"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="id-desc">Newest First</SelectItem>
                                <SelectItem value="id-asc">Oldest First</SelectItem>
                                <SelectItem value="uniqueRef-asc">Reference (A-Z)</SelectItem>
                                <SelectItem value="price-asc">Price (Low to High)</SelectItem>
                                <SelectItem value="price-desc">Price (High to Low)</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={unitsPageSize.toString()}
                            onValueChange={(value) => {
                                setUnitsPageSize(Number(value));
                                setUnitsPage(0);
                            }}
                        >
                            <SelectTrigger className="w-[100px]">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Units Grid */}
                    {unitsLoading && units.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2
                                className="w-12 h-12 animate-spin mb-4"
                                style={{color: "#EF4217"}}
                            />
                            <p className="text-gray-500">Loading units...</p>
                        </div>
                    ) : units.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border">
                            <div
                                className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                                style={{backgroundColor: "#FEE2E2"}}
                            >
                                <Home className="w-10 h-10" style={{color: "#EF4217"}}/>
                            </div>
                            <h3 className="text-xl font-semibold mb-2" style={{color: "#141130"}}>
                                No units found
                            </h3>
                            <p className="text-gray-500 mb-6 text-center max-w-md">
                                {unitsSearch
                                    ? "No units match your search. Try different keywords."
                                    : "Get started by creating your first unit for this property."}
                            </p>
                            {!unitsSearch && (
                                <Can permissions={["create_unit"]}>
                                    <Button
                                        onClick={handleAddUnit}
                                        className="text-white hover:opacity-90 transition"
                                        style={{backgroundColor: "#EF4217"}}
                                    >
                                        <Plus className="w-4 h-4 mr-2"/>
                                        Create Unit
                                    </Button>
                                </Can>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="bg-white border rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-50 hover:bg-gray-50 border-b">
                                                <TableHead className="w-16 pl-4" />
                                                <TableHead className="font-semibold text-[#141130] min-w-[140px]">Unit Ref</TableHead>
                                                <TableHead className="font-semibold text-[#141130]">Type</TableHead>
                                                <TableHead className="font-semibold text-[#141130]">Size</TableHead>
                                                <TableHead className="font-semibold text-[#141130]">Price</TableHead>
                                                <TableHead className="font-semibold text-[#141130]">Status</TableHead>
                                                <TableHead className="font-semibold text-[#141130] text-right pr-4">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {units.map((unit: any) => (
                                                <TableRow
                                                    key={unit.unitId}
                                                    onClick={() => handleViewUnit(unit.unitId)}
                                                    className="cursor-pointer hover:bg-[#EF4217]/5 border-b last:border-0 group transition-colors"
                                                >
                                                    {/* Thumbnail */}
                                                    <TableCell className="pl-4 py-3">
                                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                            {unitImageCache[unit.thumbnail] ? (
                                                                <img
                                                                    src={unitImageCache[unit.thumbnail]}
                                                                    alt={unit.ref}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    {/* Ref */}
                                                    <TableCell className="py-3">
                                                        <span className="font-bold text-[#141130] group-hover:text-[#EF4217] transition-colors">
                                                            {unit.ref}
                                                        </span>
                                                    </TableCell>

                                                    {/* Type */}
                                                    <TableCell className="py-3">
                                                        <span
                                                            className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap"
                                                            style={{backgroundColor: "#EF4217"}}
                                                        >
                                                            {resolveUnitTypeLabel(unit.unitType)}
                                                        </span>
                                                    </TableCell>

                                                    {/* Size */}
                                                    <TableCell className="py-3">
                                                        <span className="text-sm text-gray-600">
                                                            {unit.size} {unit.measurementUnits?.name || ""}
                                                        </span>
                                                    </TableCell>

                                                    {/* Price */}
                                                    <TableCell className="py-3">
                                                        <span className="text-sm font-semibold" style={{color: "#EF4217"}}>
                                                            {unit.currency} {unit.price}
                                                        </span>
                                                        <span className="text-xs text-gray-400 ml-1">/{unit.leaseMode}</span>
                                                    </TableCell>

                                                    {/* Status */}
                                                    <TableCell className="py-3">
                                                        <span
                                                            className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                                                unit.occupied
                                                                    ? "bg-red-100 text-red-800"
                                                                    : "bg-green-100 text-green-800"
                                                            }`}
                                                        >
                                                            {unit.occupied ? "Occupied" : "Available"}
                                                        </span>
                                                    </TableCell>

                                                    {/* Actions */}
                                                    <TableCell className="py-3 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-sm font-medium"
                                                                style={{color: "#EF4217"}}
                                                                onClick={() => handleViewUnit(unit.unitId)}
                                                            >
                                                                View
                                                            </Button>
                                                            <Can permissions={["edit_unit"]}>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-sm font-medium text-gray-600 hover:text-[#141130]"
                                                                    onClick={() => router.push(`/dashboard/unit/edit/${unit.unitId}`)}
                                                                >
                                                                    Edit
                                                                </Button>
                                                            </Can>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Units Pagination */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t">
                                <div className="text-sm text-gray-600">
                                    Showing{" "}
                                    <span className="font-medium">{unitsPage * unitsPageSize + 1}</span> to{" "}
                                    <span className="font-medium">
                    {Math.min((unitsPage + 1) * unitsPageSize, unitsTotalElements)}
                  </span>{" "}
                                    of <span className="font-medium">{unitsTotalElements}</span> units
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setUnitsPage(0)}
                                        disabled={unitsPage === 0}
                                        className="hover:bg-gray-100 transition"
                                    >
                                        First
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setUnitsPage(unitsPage - 1)}
                                        disabled={unitsPage === 0}
                                        className="hover:bg-gray-100 transition"
                                    >
                                        Previous
                                    </Button>

                                    <span className="px-3 py-1 text-sm">
                    Page <span className="font-medium">{unitsPage + 1}</span> of{" "}
                                        <span className="font-medium">{unitsTotalPages}</span>
                  </span>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setUnitsPage(unitsPage + 1)}
                                        disabled={unitsPage >= unitsTotalPages - 1}
                                        className="hover:bg-gray-100 transition"
                                    >
                                        Next
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setUnitsPage(unitsTotalPages - 1)}
                                        disabled={unitsPage >= unitsTotalPages - 1}
                                        className="hover:bg-gray-100 transition"
                                    >
                                        Last
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Staff & Invites Section - MOVED TO BOTTOM WITH TABS */}
                <CanProperty propertyId={Number(propertyId)} permissions={["view_property_staff"]}>
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="staff-invites" className="border rounded-lg bg-white">
                            <AccordionTrigger className="px-6 hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <Users className="w-5 h-5" style={{color: "#EF4217"}}/>
                                    <div className="text-left">
                                        <h2 className="text-xl font-semibold" style={{color: "#141130"}}>
                                            Staff & Invites Management
                                        </h2>
                                        <p className="text-sm text-gray-500">
                                            {staffData ? `${staffData.staff.length} staff • ${staffData.invites.length} active invites` : "Manage staff members and invitations"}
                                        </p>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="px-6 pb-6 pt-2">
                                    {staffLoading ? (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <Loader2 className="w-10 h-10 animate-spin mb-4"
                                                     style={{color: "#EF4217"}}/>
                                            <p className="text-gray-500">Loading staff and invites...</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Create Invite Button */}
                                            <div className="flex justify-end">
                                                <Button
                                                    onClick={() => setCreateInviteOpen(true)}
                                                    className="text-white hover:opacity-90 transition"
                                                    style={{backgroundColor: "#EF4217"}}
                                                >
                                                    <UserPlus className="w-4 h-4 mr-2"/>
                                                    Create Invite
                                                </Button>
                                            </div>

                                            {/* TABS for Staff and Invites */}
                                            <Tabs defaultValue="staff" className="w-full">
                                                <TabsList className="grid w-full grid-cols-2">
                                                    <TabsTrigger value="staff" className="flex items-center gap-2">
                                                        <Users className="w-4 h-4"/>
                                                        Staff Members
                                                        <span
                                                            className="ml-1 text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                            {staffData?.staff.length || 0}
                          </span>
                                                    </TabsTrigger>
                                                    <TabsTrigger value="invites" className="flex items-center gap-2">
                                                        <Mail className="w-4 h-4"/>
                                                        Active Invites
                                                        <span
                                                            className="ml-1 text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                            {staffData?.invites.length || 0}
                          </span>
                                                    </TabsTrigger>
                                                </TabsList>

                                                {/* Staff Tab Content */}
                                                <TabsContent value="staff" className="mt-6">
                                                    {staffData && staffData.staff.length > 0 ? (
                                                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                                            {staffData.staff.map((staff) => (
                                                                <div
                                                                    key={staff.staffId}
                                                                    className="p-4 border rounded-lg hover:shadow-md transition-all bg-white"
                                                                >
                                                                    <div className="flex items-start justify-between">
                                                                        <div className="flex-1">
                                                                            <div
                                                                                className="flex items-center gap-2 mb-2">
                                                                                <div
                                                                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                                                                                    style={{backgroundColor: "#EF4217"}}
                                                                                >
                                                                                    {staff.email.charAt(0).toUpperCase()}
                                                                                </div>
                                                                                <div>
                                                                                    <p className="font-semibold"
                                                                                       style={{color: "#141130"}}>
                                                                                        {staff.name || "Unnamed"}
                                                                                    </p>
                                                                                    <p className="text-sm text-gray-500">{staff.email}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div
                                                                                className="flex items-center gap-4 mt-3 text-sm">
                                      <span
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
                                        {staff.type.replace(/_/g, " ")}
                                      </span>
                                                                                <span
                                                                                    className="text-gray-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3"/>
                                        Joined {new Date(staff.joinedOn).toLocaleDateString()}
                                      </span>
                                                                            </div>
                                                                        </div>
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            onClick={() => onDeleteStaff(staff.staffId)}
                                                                            disabled={actionLoading}
                                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                        >
                                                                            <Trash2 className="w-4 h-4"/>
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="flex flex-col items-center justify-center py-12 border rounded-lg bg-gray-50">
                                                            <Users className="w-12 h-12 text-gray-400 mb-3"/>
                                                            <p className="text-gray-600 font-medium">No staff members
                                                                yet</p>
                                                            <p className="text-sm text-gray-500 mt-1">
                                                                Create an invite to add staff
                                                            </p>
                                                        </div>
                                                    )}
                                                </TabsContent>

                                                {/* Invites Tab Content */}
                                                <TabsContent value="invites" className="mt-6">
                                                    {staffData && staffData.invites.length > 0 ? (
                                                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                                            {staffData.invites.map((invite) => (
                                                                <div
                                                                    key={invite.id}
                                                                    className="p-4 border rounded-lg hover:shadow-md transition-all bg-white"
                                                                >
                                                                    <div className="space-y-3">
                                                                        <div
                                                                            className="flex items-start justify-between">
                                                                            <div className="flex-1">
                                                                                <div
                                                                                    className="flex items-center gap-2 mb-2">
                                        <span
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-800 font-medium text-sm">
                                          {invite.type}
                                        </span>
                                                                                    <span
                                                                                        className="text-xs text-gray-500">ID: {invite.id}</span>
                                                                                </div>
                                                                                <div
                                                                                    className="flex items-center gap-4 text-sm text-gray-600">
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3"/>
                                            {invite.validDays} days left
                                        </span>
                                                                                    <span
                                                                                        className="flex items-center gap-1">
                                          <Eye className="w-3 h-3"/>
                                                                                        {invite.visits} visits
                                        </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex gap-2">
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                onClick={() => copyToClipboard(invite.link)}
                                                                                className="flex-1"
                                                                            >
                                                                                <Copy className="w-3 h-3 mr-1"/>
                                                                                Copy Link
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                onClick={() => openShareDialog(invite.id, invite.link)}
                                                                                className="flex-1"
                                                                            >
                                                                                <Send className="w-3 h-3 mr-1"/>
                                                                                Share
                                                                            </Button>
                                                                        </div>

                                                                        <div className="flex gap-2 pt-2 border-t">
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                onClick={() => onRenewInvite(invite.id)}
                                                                                disabled={actionLoading}
                                                                                className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                            >
                                                                                <RefreshCw className="w-3 h-3 mr-1"/>
                                                                                Renew
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                onClick={() => onTerminateInvite(invite.id)}
                                                                                disabled={actionLoading}
                                                                                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                            >
                                                                                <Trash2 className="w-3 h-3 mr-1"/>
                                                                                Terminate
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="flex flex-col items-center justify-center py-12 border rounded-lg bg-gray-50">
                                                            <Mail className="w-12 h-12 text-gray-400 mb-3"/>
                                                            <p className="text-gray-600 font-medium">No active
                                                                invites</p>
                                                            <p className="text-sm text-gray-500 mt-1">
                                                                Create your first invite to get started
                                                            </p>
                                                        </div>
                                                    )}
                                                </TabsContent>
                                            </Tabs>
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CanProperty>
            </div>
        </div>
    );
}

// ==================== END OF PART 2.2 ====================
// That's it! Copy Part 1 + Part 2.1 + Part 2.2 to create the complete component
          
