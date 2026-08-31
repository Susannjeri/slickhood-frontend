// app/lease/initialize/page.tsx - PART A
"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  Loader2,
  Home,
  DollarSign,
  Calendar,
  Zap,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  ArrowRight,
  Receipt,
  LogIn,
} from "lucide-react";

import ProfileGateModal, { ProfileGateFields } from "@/components/auth/ProfileGateModal";
import { resumePluginState } from "next/dist/build/build-context";
import {usePropertyMetadata} from "@/app/(dashboard)/dashboard/property/propertyMetadata";


interface UnitDetails {
  propertyId: number;
  ref: string;
  unitType: string;
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

export default function LeaseInitializePage() {
  const router = useRouter();
  const { handleTokenRefresh } = useAuth();
  const { inviteToken, setInviteToken, token: authToken, roleName } = useAuthStore();
  const {
    handleValidateInviteToken,
    getPropertyImage,
    handleViewLeaseTemplatePublic,
    handleCreateLeaseTenant,
    handleGetUnitCharges,
  } = useApi();
  const {resolveUnitTypeLabel, getUnitTypes } = usePropertyMetadata();

  // Check if user is logged in
  const isLoggedIn = !!authToken;

  //Prevent multiple refresh attempts
  const hasAttemptedRefresh = useRef(false);

  // State
  const [loading, setLoading] = useState(true);
  const [unitDetails, setUnitDetails] = useState<UnitDetails | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Charges state
  const [unitCharges, setUnitCharges] = useState<UnitCharge[]>([]);
  const [loadingCharges, setLoadingCharges] = useState(false);

  // Sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [moveInDate, setMoveInDate] = useState("");
  const [moveOutDate, setMoveOutDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // PDF Modal state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  // Profile Gate State
    const [profileGate, setProfileGate] = useState<Record<string, boolean> | null>(null);


  useEffect(() => {
    // Check if user has invite token
    if (!inviteToken) {
      toast.error("No invite token found. Please use your invite link.");
      router.replace("/login");
      return;
    }

    loadData();
  }, [inviteToken]);

 useEffect(() => {
    console.log("Checking tenant role for lease initialization...");
    const ensureTenantRole = async () => {
      // Only run if:
      // 1. User is logged in
      // 2. Data has finished loading
      // 3. Unit details exist
      // 4. Haven't attempted refresh yet
      // if (isLoggedIn && !loading && unitDetails && !hasAttemptedRefresh.current)
      console.log("isLoggedIn:", isLoggedIn);
      if (isLoggedIn) {
        const hasTenantRole = roleName?.includes("Tenant");
        console.log("User roles:", roleName, "Is user tenant? ", hasTenantRole);
        
        
          try {
            console.log("Tenant role not found, refreshing token to add Tenant role...");
            await handleTokenRefresh();
            console.log("Token refreshed successfully, Tenant role should now be available");
            toast.success("Account updated for lease initialization");
          } catch (error) {
            console.error("Failed to refresh token:", error);
            toast.error("Failed to update your account. Please try logging in again.");
          }
        }
      }

    ensureTenantRole();
  }, [isLoggedIn]);



  const loadData = async () => {
    try {
      setLoading(true);

      // Check if invite token exists (TypeScript guard)
      if (!inviteToken) {
        toast.error("No invite token found. Please use your invite link.");
        router.replace("/login");
        return;
      }

      // Re-validate invite token to get fresh unit details
      const response = await handleValidateInviteToken(inviteToken);

      if (response.success && response.code === "S0058" && response.data && response.data.length > 0) {
        const unit = response.data[0];
        setUnitDetails(unit);
        await getUnitTypes(unit.propertyType);
        // Load unit images using inviteToken
        const allImages = [unit.thumbnail, ...(unit.images || [])];
        await loadUnitImages(allImages);

        // Load unit charges using inviteToken
        await loadUnitCharges(unit.unitId);
      } else {
        toast.error("Invalid or expired invite token");
        router.replace("/login");
      }
    } catch (err: any) {
      console.error("Error loading data:", err);
      toast.error("Failed to load unit details");
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadUnitImages = async (imagePaths: string[]) => {
    if (!inviteToken) return;

    const urls: string[] = [];
    for (const imagePath of imagePaths) {
      try {
        // Pass inviteToken to getPropertyImage
        const imageBlob = await getPropertyImage(imagePath, inviteToken);
        urls.push(URL.createObjectURL(imageBlob));
      } catch (err) {
        console.error("Error loading unit image:", err);
      }
    }
    setImageUrls(urls);
  };

  const loadUnitCharges = async (unitId: number) => {
    if (!inviteToken) return;

    try {
      setLoadingCharges(true);
      const response = await handleGetUnitCharges(unitId,inviteToken);
      if (response.success && response.data) {
        console.log("Unit Charges Response:", response.data);
        setUnitCharges(response.data);
      }
    } catch (err: any) {
      console.error("Error loading charges:", err);
    } finally {
      setLoadingCharges(false);
    } 
  };

  const handleViewPdf = async () => {
    if (!unitDetails) return;

    try {
      if(!inviteToken) return;
      const response = await handleViewLeaseTemplatePublic(inviteToken);

      let blob;
      if (response instanceof Blob) {
        blob = response;
      } else {
        const pdfData = response.data || response;
        blob = new Blob([pdfData], { type: "application/pdf" });
      }

      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setIsPdfModalOpen(true);
    } catch (error) {
      console.error("Error viewing PDF:", error);
      toast.error("Failed to load lease template PDF");
    }
  };

  const validateDates = (): boolean => {
    if (!moveInDate || !moveOutDate) {
      toast.error("Please select both move in and move out dates");
      return false;
    }

    const moveIn = new Date(moveInDate);
    const moveOut = new Date(moveOutDate);

    if (moveOut <= moveIn) {
      toast.error("Move out date must be after move in date");
      return false;
    }

    return true;
  };

  const handleSubmitLease = async () => {
    if (!validateDates()) return;

    // Check if invite token exists (TypeScript guard)
    if (!inviteToken) {
      toast.error("Invite token is missing. Please try again.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response:any = await handleCreateLeaseTenant(
        inviteToken,
        moveInDate,
        moveOutDate
      );

      if(response?.profileGate) {
        setProfileGate(response.fields)
        return;
      }


      if (response.success && response.code === "S0162") {
        toast.success("Lease initialized successfully!");
        
        // Clear invite token
        setInviteToken(null);
        
        // Redirect to dashboard
        setTimeout(() => {
          router.push(`/dashboard/unit/details/${unitDetails?.unitId}?p=${unitDetails?.propertyId}`);
        }, 1000);
      } else {
        toast.error(response.description || "Failed to initialize lease");
      }
    } catch (error: any) {
      console.error("Error initializing lease:", error);
      toast.error("Failed to initialize lease. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginRedirect = () => {
    // Show persistent toast
    toast.info("Please click your invite link again after logging in", {
      duration: 10000, // 10 seconds
    });

    // Small delay to ensure toast shows
    setTimeout(() => {
      router.push("/login");
    }, 500);
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? imageUrls.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === imageUrls.length - 1 ? 0 : prev + 1
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // ==================== END OF PART A ====================
  // Continue to PART B below
  // ==================== PART B - Loading, Error & Sheet ====================
  // Paste this after Part A

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: "#EF4217" }} />
          <p className="text-gray-600">Loading your lease details...</p>
        </div>
      </div>
    );
  }

  if (!unitDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg border">
          <Home className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold mb-2" style={{ color: "#141130" }}>
            Unable to Load Details
          </h2>
          <p className="text-gray-600 mb-4">
            We couldn't load your unit details. Please try again or contact support.
          </p>
          <Button
            onClick={() => router.push("/login")}
            className="text-white"
            style={{ backgroundColor: "#EF4217" }}
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: "#EF4217" }}
            >
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "#141130" }}>
                Your Lease Invitation
              </h1>
              <p className="text-gray-600 mt-1">
                Review the unit details and {isLoggedIn ? "initialize your lease" : "login to proceed"}
              </p>
            </div>
          </div>

          {/* Info Banner */}
          <div className={`border rounded-lg p-4 ${isLoggedIn ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <p className="text-sm" style={{ color: isLoggedIn ? '#1e40af' : '#92400e' }}>
              {isLoggedIn ? (
                <>
                  <strong>Next Steps:</strong> Review the unit details below. When ready, 
                  click "Initialize Lease" to set your move-in and move-out dates.
                </>
              ) : (
                <>
                  <strong>Login Required:</strong> You need to be logged in to initialize this lease. 
                  Please login or create an account, then click your invite link again.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Initialize Lease Sheet (Only for logged-in users) */}
        {isLoggedIn && (
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6">
              <SheetHeader className="mb-6">
                <SheetTitle className="text-[#141130]">Initialize Your Lease</SheetTitle>
                <SheetDescription>
                  Select your move-in and move-out dates to initialize your lease for Unit {unitDetails.ref}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6">
                {/* Unit Summary */}
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <h3 className="font-semibold mb-3" style={{ color: "#141130" }}>
                    Lease Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unit:</span>
                      <span className="font-semibold">{unitDetails.ref}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-semibold">{resolveUnitTypeLabel(unitDetails.unitType)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-semibold" style={{ color: "#EF4217" }}>
                        {unitDetails.currency} {unitDetails.price.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lease Mode:</span>
                      <span className="font-semibold capitalize">{unitDetails.leaseMode}</span>
                    </div>
                  </div>
                </div>

                {/* Date Inputs */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="moveInDate" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" style={{ color: "#EF4217" }} />
                      Move In Date *
                    </Label>
                    <Input
                      id="moveInDate"
                      type="date"
                      value={moveInDate}
                      onChange={(e) => setMoveInDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      required
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Select your preferred move-in date
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="moveOutDate" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" style={{ color: "#EF4217" }} />
                      Move Out Date *
                    </Label>
                    <Input
                      id="moveOutDate"
                      type="date"
                      value={moveOutDate}
                      onChange={(e) => setMoveOutDate(e.target.value)}
                      min={moveInDate || new Date().toISOString().split("T")[0]}
                      required
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Must be after your move-in date
                    </p>
                  </div>
                </div>

                {/* Duration Display */}
                {moveInDate && moveOutDate && new Date(moveOutDate) > new Date(moveInDate) && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Lease Duration:</strong>{" "}
                      {Math.ceil(
                        (new Date(moveOutDate).getTime() - new Date(moveInDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{" "}
                      days
                    </p>
                  </div>
                )}

                {/* Important Notice */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    <strong>Important:</strong> By initializing this lease, you're declaring your interest 
                    in this unit. The landlord will review your application and the lease terms will be 
                    finalized upon approval.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsSheetOpen(false)}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitLease}
                    disabled={isSubmitting || !moveInDate || !moveOutDate}
                    className="flex-1 text-white"
                    style={{ backgroundColor: "#EF4217" }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Initializing...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Initialize Lease
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* ==================== END OF PART B ==================== */}
        {/* Continue to PART C below */}
        {/* ==================== PART C - Unit Details Section ==================== */}
        {/* Paste this after Part B */}

        {/* Unit Details Section */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <Home className="w-6 h-6" style={{ color: "#EF4217" }} />
              <div>
                <h2 className="text-2xl font-bold" style={{ color: "#141130" }}>
                  Unit {unitDetails.ref}
                </h2>
                <p className="text-sm text-gray-600">{resolveUnitTypeLabel(unitDetails.unitType)}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Image Carousel */}
            <div className="relative h-64 sm:h-96 bg-gray-200 rounded-lg overflow-hidden">
              {imageUrls.length > 0 ? (
                <>
                  <img
                    src={imageUrls[currentImageIndex]}
                    alt={`Unit ${unitDetails.ref} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {imageUrls.length > 1 && (
                    <>
                      <button
                        onClick={handlePreviousImage}
                        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                        {currentImageIndex + 1} / {imageUrls.length}
                      </div>
                    </>
                  )}
                  <div
                    className="absolute top-4 right-4 px-4 py-2 rounded-full text-sm font-semibold text-white backdrop-blur-sm"
                    style={{ backgroundColor: unitDetails.occupied ? "#6B7280" : "#10B981" }}
                  >
                    {unitDetails.occupied ? "Occupied" : "Available"}
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {imageUrls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {imageUrls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`h-16 w-16 rounded-md overflow-hidden flex-shrink-0 transition ${
                      currentImageIndex === index
                        ? "ring-2 ring-offset-2 ring-[#EF4217]"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Specifications Grid */}
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: "#141130" }}>
                Specifications
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Home className="w-5 h-5" style={{ color: "#EF4217" }} />
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="font-semibold" style={{ color: "#141130" }}>
                      {resolveUnitTypeLabel(unitDetails.unitType)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <FileText className="w-5 h-5" style={{ color: "#EF4217" }} />
                  <div>
                    <p className="text-xs text-gray-500">Size</p>
                    <p className="font-semibold" style={{ color: "#141130" }}>
                      {unitDetails.size} {unitDetails.measurementUnits.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <DollarSign className="w-5 h-5" style={{ color: "#EF4217" }} />
                  <div>
                    <p className="text-xs text-gray-500">Price</p>
                    <p className="font-semibold" style={{ color: "#EF4217" }}>
                      {unitDetails.currency} {unitDetails.price.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5" style={{ color: "#EF4217" }} />
                  <div>
                    <p className="text-xs text-gray-500">Lease Mode</p>
                    <p className="font-semibold capitalize" style={{ color: "#141130" }}>
                      {unitDetails.leaseMode}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Utilities */}
            {unitDetails.utilities && unitDetails.utilities.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5" style={{ color: "#EF4217" }} />
                  <h3 className="text-lg font-semibold" style={{ color: "#141130" }}>
                    Utilities Included
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {unitDetails.utilities.map((utility) => (
                    <span
                      key={utility.id}
                      className="px-3 py-1 rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: "#EF4217" }}
                    >
                      {utility.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ==================== END OF PART C ==================== */}
        {/* Continue to PART D below */}
        {/* ==================== PART D - Charges & Actions ==================== */}
        {/* Paste this after Part C */}

        {/* Charges Accordion */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="charges" className="border rounded-lg bg-white">
            <AccordionTrigger className="px-4 sm:px-6 hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" style={{ color: "#EF4217" }} />
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: "#141130" }}>
                    Supplementary Charges
                  </h2>
                </div>
                {unitCharges.length > 0 && (
                  <span className="text-xs sm:text-sm text-gray-500 mr-2">
                    {unitCharges.length} charge{unitCharges.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-4 sm:px-6 pb-4">
                {loadingCharges ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#EF4217" }} />
                  </div>
                ) : unitCharges.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-white border-b">
                          <tr>
                            <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-600">
                              Charge
                            </th>
                            <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-600">
                              Amount
                            </th>
                            <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-600">
                              Period
                            </th>
                            <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-600 hidden sm:table-cell">
                              Created
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {unitCharges.map((charge) => (
                            <tr key={charge.id} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="py-3 px-2 sm:px-4">
                                <span className="font-medium text-xs sm:text-sm" style={{ color: "#141130" }}>
                                  {charge.chargeName}
                                </span>
                              </td>
                              <td className="py-3 px-2 sm:px-4">
                                <span className="font-semibold text-xs sm:text-sm" style={{ color: "#EF4217" }}>
                                  {unitDetails.currency} {charge.amount.toLocaleString()}
                                </span>
                              </td>
                              <td className="py-3 px-2 sm:px-4">
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">
                                  {charge.periodName}
                                </span>
                              </td>
                              <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600 hidden sm:table-cell">
                                {formatDate(charge.createdOn)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 text-sm">No supplementary charges for this unit</p>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Action Buttons Section */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h3 className="text-lg font-semibold" style={{ color: "#141130" }}>
            Actions
          </h3>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* View Lease Agreement - Always visible */}
            <Button
              onClick={handleViewPdf}
              variant="outline"
              className="flex-1 border-[#141130] text-[#141130] hover:bg-[#141130] hover:text-white"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Lease Agreement
            </Button>

            {/* Conditional Initialize/Login Button */}
            {isLoggedIn ? (
              <Button
                onClick={() => setIsSheetOpen(true)}
                className="flex-1 text-white"
                style={{ backgroundColor: "#EF4217" }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Initialize Lease
              </Button>
            ) : (
              <Button
                onClick={handleLoginRedirect}
                className="flex-1 text-white"
                style={{ backgroundColor: "#EF4217" }}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login to Initialize Lease
              </Button>
            )}
          </div>

          {/* Info text for not logged in users */}
          {!isLoggedIn && (
            <p className="text-xs text-center text-gray-500 pt-2">
              💡 After logging in, click your invite link again to return to this page
            </p>
          )}
        </div>

        {/* CTA Banner - Only for logged-in users */}
        {isLoggedIn && (
          <div className="bg-gradient-to-r from-[#EF4217] to-[#d63a14] rounded-lg p-6 sm:p-8 text-white">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold">Ready to Initialize Your Lease?</h2>
              <p className="text-white/90">
                Review all the details above and click the button below to set your move-in and move-out dates. 
                Once you submit, the landlord will review your application.
              </p>
              <Button
                onClick={() => setIsSheetOpen(true)}
                size="lg"
                className="bg-white text-[#EF4217] hover:bg-gray-100 font-semibold"
              >
                <FileText className="w-5 h-5 mr-2" />
                Initialize Lease
              </Button>
            </div>
          </div>
        )}
      </div>

      <ProfileGateModal
          open={!!profileGate}
          fields={profileGate ?? {}}
          onClose={() => {}} 
        />

      {/* PDF Viewer Modal */}
      <Dialog open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-[#141130]">Lease Agreement Template</DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full h-full p-4">
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full border rounded"
                title="Lease Agreement Template PDF"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#EF4217" }} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    
  );
  
}

// ==================== END OF PART D ====================
// Complete! Part A + Part B + Part C + Part D = Full Revamped Initialize Page
