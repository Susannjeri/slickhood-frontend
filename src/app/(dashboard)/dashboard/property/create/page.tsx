"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Check, Home, Landmark, Loader2, MapPin, Navigation, Upload, X } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

import Can from "@/components/auth/Can";
import ProfileGateModal, { ProfileGateFields } from "@/components/auth/ProfileGateModal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi, ProfileGateResult } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { currencyOptions } from "@/lib/actions";
import { usePropertyMetadata } from "@/app/(dashboard)/dashboard/property/propertyMetadata";
import {
  managementJourneys,
  parseCoordinates,
  PropertyFormData,
  PropertyManagementMode,
  propertySchema,
  validatePropertyImage,
} from "./propertyCreation";

const PropertyLocationPicker = dynamic(() => import("./PropertyLocationPicker"), {
  ssr: false,
  loading: () => <div className="flex h-48 items-center justify-center rounded-lg border bg-slate-50"><Loader2 className="size-6 animate-spin text-[#EF4217]" /></div>,
});

const journeyIcons = {
  RENTAL: Home,
  SALE: Landmark,
  SERVICE_CHARGE: Building2,
} satisfies Record<PropertyManagementMode, typeof Home>;

const DEFAULT_LOCATION = { lat: -1.286389, lng: 36.817223 };

type CreatePropertyResponse = ProfileGateResult | {
  success: boolean;
  description?: string;
  message?: string;
  data?: unknown[];
};

export default function CreatePropertyPage() {
  const router = useRouter();
  const imageInput = useRef<HTMLInputElement>(null);
  const { handleTokenRefresh } = useAuth();
  const { createNewProperty } = useApi();
  const { isLoadingTypes, propertyTypeOptions } = usePropertyMetadata();
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY?.trim() ?? "";

  const [step, setStep] = useState<"journey" | "details">("journey");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_LOCATION);
  const [profileGate, setProfileGate] = useState<ProfileGateFields | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: { currency: "KES", mapLocation: "" },
  });

  const managementMode = watch("managementMode");
  const mapLocation = watch("mapLocation");

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const selectJourney = (mode: PropertyManagementMode) => {
    setValue("managementMode", mode, { shouldValidate: true });
    setStep("details");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const chooseImage = async (file?: File) => {
    if (!file) return;
    setImageError(null);
    const validationError = await validatePropertyImage(file);
    if (validationError) {
      setImageError(validationError);
      if (imageInput.current) imageInput.current.value = "";
      return;
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    setImageError(null);
    if (imageInput.current) imageInput.current.value = "";
  };

  const setCoordinates = ({ lat, lng }: { lat: number; lng: number }) => {
    const coordinates = { lat, lng };
    setMarker(coordinates);
    setMapCenter(coordinates);
    setValue("mapLocation", `${lat.toFixed(6)},${lng.toFixed(6)}`, { shouldValidate: true });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location services are not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setCoordinates({ lat: coords.latitude, lng: coords.longitude }),
      () => toast.error("We could not access your location. Enter the coordinates manually."),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const onSubmit = async (data: PropertyFormData) => {
    if (!image) {
      setImageError("Upload a property image before continuing.");
      return;
    }
    setSubmitError(null);
    try {
      const response = await createNewProperty({ ...data, image }) as CreatePropertyResponse;
      if ("profileGate" in response) {
        setProfileGate(response.fields);
        return;
      }
      if (!response?.success) throw new Error(response?.description || response?.message || "The property could not be created.");

      try {
        await handleTokenRefresh();
      } catch {
        // Property creation has already succeeded. Token refresh must not turn
        // that success into a retryable-looking error and create duplicates.
      }
      toast.success("Property created successfully.");
      const propertyId = Array.isArray(response.data) ? response.data[0] : undefined;
      router.push(propertyId ? `/dashboard/property/properties/details/${propertyId}` : "/dashboard/property/properties");
    } catch (error: unknown) {
      const responseData = axios.isAxiosError(error) ? error.response?.data as { description?: string; message?: string } | undefined : undefined;
      const message = responseData?.description || responseData?.message || (error instanceof Error ? error.message : null) || "Failed to create property. Please try again.";
      setSubmitError(message);
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <Breadcrumb items={[{ label: "Properties", href: "/dashboard/property/properties" }, { label: "Create property" }]} />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#EF4217]">Step {step === "journey" ? "1" : "2"} of 5</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#141130]">{step === "journey" ? "Create property" : "Create new property"}</h1>
          <p className="mt-1 text-slate-600">{step === "journey" ? "Choose the workflow this property needs." : "Add the core property details to your portfolio."}</p>
        </div>
        <Can permissions={["view_property"]}>
          <Button type="button" onClick={() => router.push("/dashboard/property/properties")} className="bg-[#EF4217] hover:bg-[#d93712]">View properties</Button>
        </Can>
      </header>

      {step === "journey" ? (
        <section aria-labelledby="journey-heading" className="rounded-2xl border bg-white p-5 shadow-sm sm:p-8">
          <h2 id="journey-heading" className="text-2xl font-semibold text-[#141130]">What do you want to manage?</h2>
          <p className="mt-1 text-sm text-slate-600">This choice configures the right downstream workflow. You can still manage mixed portfolios.</p>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {managementJourneys.map(journey => {
              const Icon = journeyIcons[journey.value];
              return (
                <button key={journey.value} type="button" onClick={() => selectJourney(journey.value)} className="group rounded-xl border-2 border-slate-200 p-5 text-left transition hover:border-[#EF4217] hover:bg-orange-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4217] focus-visible:ring-offset-2">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-orange-50 text-[#EF4217]"><Icon className="size-6" /></span>
                  <span className="mt-4 block text-lg font-semibold text-[#141130]">{journey.title}</span>
                  <span className="mt-2 block text-sm leading-6 text-slate-600">{journey.description}</span>
                  <span className="mt-4 block text-xs font-medium text-slate-500">{journey.capabilities}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3">
            <div className="flex items-center gap-3 text-sm"><Check className="size-5 text-emerald-600" /><span className="font-medium text-[#141130]">{managementJourneys.find(item => item.value === managementMode)?.title}</span></div>
            <Button type="button" variant="ghost" onClick={() => setStep("journey")}>Change</Button>
          </div>

          {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}

          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <Label htmlFor="image-upload" className="text-base font-semibold text-[#141130]">Property image *</Label>
            <div className="mt-3 overflow-hidden rounded-lg border-2 border-dashed border-[#EF4217] bg-orange-50/20" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void chooseImage(event.dataTransfer.files[0]); }}>
              {imagePreview ? (
                <div className="relative h-64">
                  <Image src={imagePreview} alt="Selected property" fill sizes="(max-width: 768px) 100vw, 1152px" unoptimized className="object-cover" />
                  <Button type="button" size="icon" variant="destructive" className="absolute right-3 top-3" onClick={removeImage} aria-label="Remove property image"><X className="size-4" /></Button>
                </div>
              ) : (
                <label htmlFor="image-upload" className="flex h-44 cursor-pointer flex-col items-center justify-center px-4 text-center">
                  <Upload className="size-9 text-[#EF4217]" />
                  <span className="mt-3 text-sm font-medium text-[#141130]">Choose an image or drag it here</span>
                  <span className="mt-1 text-xs text-slate-500">JPG, PNG or WebP · up to 10 MB · at least 300 × 200 px</span>
                </label>
              )}
              <Input ref={imageInput} id="image-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void chooseImage(event.target.files?.[0])} className="sr-only" />
            </div>
            {imageError && <p className="mt-2 text-sm text-red-600" role="alert">{imageError}</p>}
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="space-y-5 rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#141130]">Basic information</h2>
              <Field htmlFor="name" label="Property name" required error={errors.name?.message}><Input id="name" autoComplete="organization" maxLength={160} placeholder="e.g., Sunset Villa" aria-invalid={!!errors.name} {...register("name")} /></Field>
              <Field htmlFor="type" label="Property type" required error={errors.type?.message}>
                <select id="type" disabled={isLoadingTypes} aria-invalid={!!errors.type} {...register("type")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="">{isLoadingTypes ? "Loading property types…" : "Select property type"}</option>
                  {propertyTypeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
              <Field htmlFor="address" label="Address" required error={errors.address?.message}><Input id="address" autoComplete="street-address" maxLength={500} placeholder="e.g., 123 Main Street, Nairobi" aria-invalid={!!errors.address} {...register("address")} /></Field>
              <Field htmlFor="currency" label="Operating currency" required error={errors.currency?.message}>
                <select id="currency" aria-invalid={!!errors.currency} {...register("currency")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {currencyOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
            </section>

            <section className="space-y-5 rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2"><MapPin className="size-5 text-[#EF4217]" /><h2 className="text-lg font-semibold text-[#141130]">Location</h2></div>
              {googleMapsKey ? <PropertyLocationPicker apiKey={googleMapsKey} center={mapCenter} marker={marker} onCoordinatesSelected={setCoordinates} /> : <Alert className="border-amber-300 bg-amber-50"><AlertDescription className="text-amber-900">Map search is temporarily unavailable. Enter coordinates manually or use your current location.</AlertDescription></Alert>}
              <Field htmlFor="mapLocation" label="Coordinates (Latitude, Longitude)" required error={errors.mapLocation?.message}>
                <Input id="mapLocation" inputMode="decimal" placeholder="-1.286389, 36.817223" value={mapLocation || ""} aria-invalid={!!errors.mapLocation} onChange={event => {
                  const value = event.target.value;
                  setValue("mapLocation", value, { shouldValidate: true });
                  const coordinates = parseCoordinates(value);
                  if (coordinates) { setMarker(coordinates); setMapCenter(coordinates); }
                }} />
              </Field>
              <Button type="button" variant="outline" onClick={useCurrentLocation}><Navigation className="mr-2 size-4" />Use current location</Button>
            </section>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => router.push("/dashboard/property/properties")}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || isLoadingTypes} className="min-w-44 bg-[#EF4217] hover:bg-[#d93712]">{isSubmitting ? <><Loader2 className="mr-2 size-4 animate-spin" />Creating property…</> : "Create property"}</Button>
          </div>
        </form>
      )}

      <ProfileGateModal open={!!profileGate} fields={profileGate ?? {}} onClose={() => {}} />
    </div>
  );
}

function Field({ htmlFor, label, required, error, children }: { htmlFor: string; label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}{required && <span aria-hidden="true"> *</span>}</Label>
      {children}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
}
