// app/lease/initialize/page.tsx - PART A
"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  FileText,
  ArrowRight,
  Receipt,
  LogIn,
  UserPlus,
} from "lucide-react";

import ProfileGateModal from "@/components/auth/ProfileGateModal";
import {usePropertyMetadata} from "@/app/(dashboard)/dashboard/property/propertyMetadata";
import { invitationUrl } from "@/lib/invitation-navigation";


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
  return (
    <Suspense
      fallback={(
        <div className="flex min-h-[50vh] items-center justify-center" aria-live="polite">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading your lease invitation</span>
        </div>
      )}
    >
      <LeaseInitializeContent />
    </Suspense>
  );
}

function LeaseInitializeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { inviteToken, setInviteToken, setStep, token: authToken } = useAuthStore();
  const urlInviteToken = searchParams.get("token")?.trim() || null;
  const effectiveInviteToken = urlInviteToken || inviteToken;
  const {
    handleValidateInviteToken,
    getPropertyImage,
    handleCreateLeaseTenant,
    handleGetUnitCharges,
  } = useApi();
  const {resolveUnitTypeLabel, getUnitTypes } = usePropertyMetadata();

  // Check if user is logged in
  const isLoggedIn = !!authToken;

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
  const [leaseStartDate, setLeaseStartDate] = useState("");
  const [leaseEndDate, setLeaseEndDate] = useState("");
  const [firstRentDueDate, setFirstRentDueDate] = useState("");
  const [depositDueDate, setDepositDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile Gate State
    const [profileGate, setProfileGate] = useState<Record<string, boolean> | null>(null);


  useEffect(() => {
    if (urlInviteToken && inviteToken !== urlInviteToken) {
      setInviteToken(urlInviteToken);
    }
    // Check if user has invite token
    if (!effectiveInviteToken) {
      toast.error("No invite token found. Please use your invite link.");
      router.replace("/login");
      return;
    }

    loadData(effectiveInviteToken);
  }, [effectiveInviteToken, inviteToken, urlInviteToken]);

  const loadData = async (token: string) => {
    try {
      setLoading(true);

      // Check if invite token exists (TypeScript guard)
      // Re-validate invite token to get fresh unit details
      const response = await handleValidateInviteToken(token);

      if (response.success && response.code === "S0058" && response.data) {
        // Tenant invite validation returns one UnitDTO object.  Older
        // clients/tests represented it as a one-item array, so keep the
        // compatibility branch without requiring a fictitious array shape.
        const invitation = Array.isArray(response.data) ? response.data[0] : response.data;
        const unit = invitation?.unit ?? invitation;
        if (!unit) {
          toast.error("Invalid or expired invite token");
          router.replace("/login");
          return;
        }
        setUnitDetails(unit);
        setLeaseStartDate(invitation?.leaseStartDate ?? "");
        setLeaseEndDate(invitation?.leaseEndDate ?? "");
        setFirstRentDueDate(invitation?.firstRentDueDate ?? invitation?.leaseStartDate ?? "");
        setDepositDueDate(invitation?.depositDueDate ?? invitation?.leaseStartDate ?? "");
        await getUnitTypes(unit.propertyType);
        // Load unit images using inviteToken
        // Legacy invitations can contain an empty thumbnail. Skipping blank
        // storage keys prevents the tenant journey waiting on an invalid file.
        const allImages = [unit.thumbnail, ...(unit.images || [])]
          .filter((imagePath): imagePath is string => Boolean(imagePath?.trim()));
        await loadUnitImages(allImages, token);

        // Load unit charges using inviteToken
        await loadUnitCharges(unit.unitId, token);
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

  const loadUnitImages = async (imagePaths: string[], token: string) => {
    const urls: string[] = [];
    for (const imagePath of imagePaths) {
      try {
        // Pass inviteToken to getPropertyImage
        const imageBlob = await getPropertyImage(imagePath, token);
        urls.push(URL.createObjectURL(imageBlob));
      } catch (err) {
        console.error("Error loading unit image:", err);
      }
    }
    setImageUrls(urls);
  };

  const loadUnitCharges = async (unitId: number, token: string) => {
    try {
      setLoadingCharges(true);
      const response = await handleGetUnitCharges(unitId, token);
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

  const handleSubmitLease = async () => {
    if (!leaseStartDate || !leaseEndDate) {
      toast.error("This invitation does not contain a lease period. Ask the landlord to send a new assignment.");
      return;
    }

    // Check if invite token exists (TypeScript guard)
    if (!effectiveInviteToken) {
      toast.error("Invite token is missing. Please try again.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response:any = await handleCreateLeaseTenant(effectiveInviteToken);

      if(response?.profileGate) {
        setProfileGate(response.fields)
        return;
      }


      if (response.success && response.code === "S0162") {
        toast.success("Lease initialized successfully!");
        
        const result = Array.isArray(response.data) ? response.data[0] : response.data;
        // Clear invite token
        setInviteToken(null);
        
        // Redirect to dashboard
        setTimeout(() => {
          router.push(result?.leaseId ? `/dashboard/documents?leaseId=${result.leaseId}` : "/dashboard/lease/operations");
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
    if (!effectiveInviteToken) return;
    router.push(`/login?invitation=tenant&token=${encodeURIComponent(effectiveInviteToken)}&returnTo=${encodeURIComponent("/lease/initialize")}`);
  };

  const handleRegistrationRedirect = () => {
    if (!effectiveInviteToken) return;
    setStep("account");
    router.push(invitationUrl("/register", effectiveInviteToken, "/lease/initialize"));
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
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
    const value = dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
      : new Date(dateString);
    return value.toLocaleDateString("en-US", {
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

  const depositCharge = unitCharges.find((charge) =>
    charge.chargeName?.toLowerCase().includes("deposit"));

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
                  click "Initialize Lease" to accept the landlord-defined lease period and create your agreement.
                </>
              ) : (
                <>
                  <strong>Login Required:</strong> You need to be logged in to initialize this lease. 
                  Sign in or create an account with the invited email. SlickHood will return you here automatically.
                </>
              )}
            </p>
          </div>
        </div>

        {!isLoggedIn && (
          <section aria-labelledby="tenant-account-choice" className="rounded-xl border border-orange-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#EF4217]">Choose how to continue</p>
              <h2 id="tenant-account-choice" className="mt-1 text-2xl font-bold text-[#141130]">Do you already use SlickHood?</h2>
              <p className="mt-2 text-sm text-gray-600">Use the same email address that received this invitation. Your unit and lease details will remain attached throughout.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-5">
                <LogIn className="mb-3 h-7 w-7 text-[#EF4217]" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-[#141130]">I already have an account</h3>
                <p className="mt-1 min-h-10 text-sm text-gray-600">Sign in, return directly to this unit, and initialize the lease.</p>
                <Button onClick={handleLoginRedirect} variant="outline" className="mt-4 w-full border-[#EF4217] text-[#EF4217] hover:bg-orange-50">
                  Sign in and continue
                </Button>
              </div>
              <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-5">
                <UserPlus className="mb-3 h-7 w-7 text-[#EF4217]" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-[#141130]">I am new to SlickHood</h3>
                <p className="mt-1 min-h-10 text-sm text-gray-600">Create your tenant account, complete the required checks, and return here automatically.</p>
                <Button onClick={handleRegistrationRedirect} className="mt-4 w-full bg-[#EF4217] text-white hover:bg-[#d63a14]">
                  Create tenant account
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Initialize Lease Sheet (Only for logged-in users) */}
        {isLoggedIn && (
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6">
              <SheetHeader className="mb-6">
                <SheetTitle className="text-[#141130]">Initialize Your Lease</SheetTitle>
                <SheetDescription>
                  Confirm the landlord-defined lease period for Unit {unitDetails.ref}. These dates cannot be changed here.
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-white p-3">
                    <p className="text-xs text-gray-500">Lease starts</p>
                    <p className="mt-1 font-semibold text-[#141130]">{leaseStartDate ? formatDate(leaseStartDate) : "Missing from invitation"}</p>
                  </div>
                  <div className="rounded-lg border bg-white p-3">
                    <p className="text-xs text-gray-500">Lease ends</p>
                    <p className="mt-1 font-semibold text-[#141130]">{leaseEndDate ? formatDate(leaseEndDate) : "Missing from invitation"}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <h3 className="font-semibold text-[#141130]">Payment timing</h3>
                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div><p className="text-gray-600">First rent due</p><p className="font-semibold">{firstRentDueDate ? formatDate(firstRentDueDate) : "Missing from invitation"}</p></div>
                    <div><p className="text-gray-600">Deposit due</p><p className="font-semibold">{depositCharge ? `${unitDetails.currency} ${depositCharge.amount.toLocaleString()} on ${depositDueDate ? formatDate(depositDueDate) : "the lease start date"}` : "No deposit configured"}</p></div>
                  </div>
                  <p className="mt-3 text-xs text-orange-900">The initial invoice is issued after both parties sign. Rent and any configured deposit must be paid by the stated due date.</p>
                </div>

                {/* Duration Display */}
                {leaseStartDate && leaseEndDate && new Date(leaseEndDate) > new Date(leaseStartDate) && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Lease Duration:</strong>{" "}
                      {Math.ceil(
                        (new Date(leaseEndDate).getTime() - new Date(leaseStartDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{" "}
                      days
                    </p>
                  </div>
                )}

                {/* Important Notice */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    <strong>Important:</strong> Initializing creates the lease and an immutable agreement from these terms. Review the PDF before signing. You may reject it if the terms are not correct.
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
                    disabled={isSubmitting || !leaseStartDate || !leaseEndDate}
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
                  <div className="text-center text-gray-500">
                    <Home className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                    <p className="text-sm font-medium">No unit image provided</p>
                  </div>
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

        <section className="rounded-lg border border-blue-200 bg-blue-50 p-5" aria-labelledby="invited-lease-period">
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-700" />
            <h2 id="invited-lease-period" className="text-lg font-semibold text-[#141130]">
              Landlord-defined lease period
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-blue-100 bg-white p-3">
              <p className="text-xs text-gray-500">Lease starts</p>
              <p className="mt-1 font-semibold text-[#141130]">
                {leaseStartDate ? formatDate(leaseStartDate) : "Missing from invitation"}
              </p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-white p-3">
              <p className="text-xs text-gray-500">Lease ends</p>
              <p className="mt-1 font-semibold text-[#141130]">
                {leaseEndDate ? formatDate(leaseEndDate) : "Missing from invitation"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-blue-900">
            These dates were set by the landlord. You can review them before initializing; reject the generated agreement if its terms are not correct.
          </p>
        </section>

        <section className="rounded-lg border border-orange-200 bg-orange-50 p-5" aria-labelledby="initial-payment-timing">
          <div className="mb-3 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-700" />
            <h2 id="initial-payment-timing" className="text-lg font-semibold text-[#141130]">Initial payment timing</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-orange-100 bg-white p-3">
              <p className="text-xs text-gray-500">First rent due</p>
              <p className="mt-1 font-semibold text-[#141130]">{firstRentDueDate ? formatDate(firstRentDueDate) : "Missing from invitation"}</p>
            </div>
            <div className="rounded-lg border border-orange-100 bg-white p-3">
              <p className="text-xs text-gray-500">Deposit due</p>
              <p className="mt-1 font-semibold text-[#141130]">{depositCharge ? `${unitDetails.currency} ${depositCharge.amount.toLocaleString()} · ${depositDueDate ? formatDate(depositDueDate) : "lease start"}` : "No deposit configured"}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-orange-900">Your first invoice is created only after both parties sign. It is payable by the lease start date; future rent follows the agreed monthly rent-due day.</p>
        </section>

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
            ) : null}
          </div>

          {/* Info text for not logged in users */}
          {!isLoggedIn && (
            <p className="text-xs text-center text-gray-500 pt-2">
              Choose the existing-account or new-account path above. Your invitation will remain attached throughout.
            </p>
          )}
        </div>

        {/* CTA Banner - Only for logged-in users */}
        {isLoggedIn && (
          <div className="bg-gradient-to-r from-[#EF4217] to-[#d63a14] rounded-lg p-6 sm:p-8 text-white">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold">Ready to Initialize Your Lease?</h2>
              <p className="text-white/90">
                Review the unit and landlord-defined lease period. Initializing creates the agreement for you to review, accept and sign.
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

    </div>
    
  );
  
}

// ==================== END OF PART D ====================
// Complete! Part A + Part B + Part C + Part D = Full Revamped Initialize Page
