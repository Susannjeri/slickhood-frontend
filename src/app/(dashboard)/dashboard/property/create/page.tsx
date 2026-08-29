"use client";

import { useState, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/useApi";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {usePropertyMetadata} from "@/app/(dashboard)/dashboard/property/propertyMetadata";
import { Breadcrumb } from "@/components/ui/breadcrumb";

import {
  CheckCircle2,
  XCircle,
  Upload,
  MapPin,
  Loader2,
} from "lucide-react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  StandaloneSearchBox,
  useLoadScript
  
} from "@react-google-maps/api";
import { useRouter } from "next/navigation";
import { currencyOptions } from "@/lib/actions";
import Can from "@/components/auth/Can";
import { ProfileGateResult } from "@/hooks/useApi"

import ProfileGateModal, { ProfileGateFields } from "@/components/auth/ProfileGateModal";


import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
const CurrencySelect = dynamic(() => import("@/components/util/CurrencySelect"), { ssr: false });
const Select = dynamic(() => import("react-select"), { ssr: false });

type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

// ✅ Validation schema
const propertySchema = z.object({
  name: z.string().min(1, "Property name is required"),
  type: z.string().min(1, "Property type is required"),
  address: z.string().min(1, "Address is required"),
  mapLocation: z
    .string()
    .min(1, "Location is required")
    .regex(/^-?\d+\.?\d*,-?\d+\.?\d*$/, "Invalid coordinates format (lat,lng)"),
  currency: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

const libraries: (
  "places" | "drawing" | "geometry" | "visualization"
)[] = ["places"];


export default function CreatePropertyForm() {
  const router = useRouter();
  const { handleTokenRefresh } = useAuth();
  const { createNewProperty } = useApi();
  const {isLoadingTypes, propertyTypeOptions } = usePropertyMetadata();

  const { isLoaded: isMapsLoaded } = useLoadScript({
      googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
      libraries: ["places"] as any,
    });

  // 🖼️ Image state
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // 📍 Map state
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [mapCenter, setMapCenter] = useState({
    lat: -1.286389,
    lng: 36.817223, // Nairobi
  });

  // Ref for search box
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);

  //Profile Gate
  const [profileGate, setProfileGate] = useState<ProfileGateFields | null>(null);

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
    control,
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
  });

  const mapLocation = watch("mapLocation");

  // 📸 Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // 📍 Handle map click
  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    const lat = e.latLng?.lat();
    const lng = e.latLng?.lng();
    if (lat && lng) {
      setMarker({ lat, lng });
      setValue("mapLocation", `${lat},${lng}`, { shouldValidate: true });
    }
  };

  // ✍️ Manual coordinate entry
  const handleManualLocationChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setValue("mapLocation", value, { shouldValidate: true });

    const coords = value.split(",").map((c) => parseFloat(c.trim()));
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      const [lat, lng] = coords;
      setMarker({ lat, lng });
      setMapCenter({ lat, lng });
    }
  };

  // 🚀 Submit handler
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const onSubmit = async (data: PropertyFormData) => {
    if (!image) {
      toast.error("Please upload a property image");
      setSubmitStatus({
        type: "error",
        message: "Please upload a property image",
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
       const response: any = await createNewProperty({
        image,
        name: data.name,
        type: data.type,
        address: data.address,
        mapLocation: data.mapLocation,
        currency: data.currency || "KES",
      });

      if (response?.profileGate) {
        setProfileGate(response.fields);
        return;
      }

     if (response?.success) {
     const resp = await handleTokenRefresh();
     console.log("Token refresh response:", resp);

     toast.success("Property created successfully!");

      setSubmitStatus({
        type: "success",
        message: "Property created successfully!",
      });

      setTimeout(() => router.push("/dashboard/property/properties"), 1000); 
    }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Failed to create property.  Please try again."
      );

      setSubmitStatus({
        type: "error",
        message:
          error.response?.data?.message ||
          "Failed to create property. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
    if (!isMapsLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2
            className="w-12 h-12 animate-spin mx-auto mb-4"
            style={{ color: "#EF4217" }}
          />
          <p className="text-gray-600">
            {!isMapsLoaded ? "Loading..." : "Google Maps API failed to load."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 p-6">
      {/* Add custom styles for inputs */}
      <style jsx global>
        {`
          input:not(.rs__input):focus,
        textarea:focus {
          outline: none !important;
          border-color: #EF4217 !important;
          box-shadow: 0 0 0 1px #EF4217 !important;
        }

        .rs__control {
          box-shadow: none !important;
        }
        `}
        </style>


      {/* 🏷️ Header */}
      <Breadcrumb items={[
        { label: "Properties", href: "/dashboard/property/properties" },
        { label: "Create New Property" },
      ]} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "#141130" }}>
              Create New Property
            </h1>
            <p className="text-muted-foreground mt-1">
              Add a new property to your portfolio
            </p>
          </div>
          <Can permissions={["view_property"]}>
          <Button
            onClick={() => router.push("/dashboard/property/properties")}
            className="
                group relative flex items-center px-5 py-2.5 
                text-white font-medium rounded-lg
                transition-all duration-300 ease-out
                hover:bg-[#d93712] 
                hover:shadow-[0_0_20px_rgba(239,66,23,0.4)]
                hover:-translate-y-0.5
                active:translate-y-0 active:scale-95
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#EF4217]
              
              "
            style={{ backgroundColor: "#EF4217" }}
          >
            
            View Properties
          </Button>
            </Can>
        </div>

      {/* 🧾 FORM */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* 🖼️ Image + Basic Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Upload */}
          <div className="space-y-3 p-6 border rounded-lg bg-white">
            <Label className="text-base font-semibold" style={{ color: "#141130" }}>
              Property Image *
            </Label>
            <div className="flex flex-col items-center gap-4">
              {imagePreview ? (
                <div
                  className="relative w-full h-64 rounded-lg overflow-hidden border-2"
                  style={{ borderColor: "#EF4217" }}
                >
                  <img
                    src={imagePreview}
                    alt="Property preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImage(null);
                      setImagePreview(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="image-upload"
                  className="w-full h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderColor: "#EF4217" }}
                >
                  <Upload className="w-12 h-12 mb-3" style={{ color: "#EF4217" }} />
                  <span className="text-sm font-medium" style={{ color: "#141130" }}>
                    Click to upload property image
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    PNG, JPG up to 10MB
                  </span>
                </label>
              )}
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-4 p-6 border rounded-lg bg-white">
            <h3 className="text-lg font-semibold" style={{ color: "#141130" }}>
              Basic Information
            </h3>

            <div className="space-y-2">
              <Label htmlFor="name">Property Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Sunset Villa"
                {...register("name")}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Property Type *</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={propertyTypeOptions}
                    isClearable
                    isSearchable
                    isLoading={isLoadingTypes}
                    classNamePrefix="rs"
                    placeholder={isLoadingTypes ? <span><Loader2 className="w-4 h-4 mr-2 animate-spin" />  </span> : "Select property type"}
                    value={propertyTypeOptions.find(opt => opt.value === field.value) || null}
                    onChange={(selectedOption:any) => field.onChange(selectedOption ? selectedOption.value : "")}
                    className={errors.type ? "border-red-500" : ""}

                    // ✅ Custom option renderer to show descriptions
                    formatOptionLabel={(option: any) => (
                      <div>
                        <div className="font-medium">{option.label}</div>
                        {option.description && (
                          <div className="text-xs text-gray-500">{option.description}</div>
                        )}
                      </div>
                    )}
                    styles={{
                      control: (base: any, state: any) => ({
                        ...base,
                        borderColor: errors.type ? '#ef4444' : state.isFocused ? '#EF4217' : base.borderColor,
                        boxShadow: 'none',
                        '&:hover': {
                          borderColor: state.isFocused ? '#EF4217' : base.borderColor,
                        },
                      }),
                      option: (base: any, state: any) => ({
                        ...base,
                        backgroundColor: state.isSelected 
                          ? '#EF4217' 
                          : state.isFocused 
                          ? '#FEE2E2' 
                          : base.backgroundColor,
                        color: state.isSelected ? 'white' : base.color,
                        '&:active': {
                          backgroundColor: '#EF4217',
                        },
                      }),
                      multiValue: (base: any) => ({
                        ...base,
                        backgroundColor: '#FEE2E2',
                      }),
                      multiValueLabel: (base: any) => ({
                        ...base,
                        color: '#EF4217',
                      }),
                      multiValueRemove: (base: any) => ({
                        ...base,
                        color: '#EF4217',
                        '&:hover': {
                          backgroundColor: '#EF4217',
                          color: 'white',
                        },
                      }),
                    }}
                  />
                )}
              />
              {errors.type && (
                <p className="text-sm text-red-600">{errors.type.message}</p>
              )}
          </div>


            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                placeholder="e.g., 123 Main Street, Nairobi"
                {...register("address")}
                className={errors.address ? "border-red-500" : ""}
              />
              {errors.address && (
                <p className="text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>

            {/* Currency Selector */}
            <div className="space-y-2">
              <Label htmlFor="currency">Currency (optional defaults to KES)</Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={currencyOptions}
                    isClearable
                    classNamePrefix="rs"
                    placeholder="Select currency"
                    onChange={(selected: any) =>
                      field.onChange(selected ? selected.value : "")
                    }
                    value={
                      currencyOptions.find(
                        (opt) => opt.value === field.value
                      ) || null
                    }
                    styles={{
                      control: (base: any, state: any) => ({
                        ...base,
                        borderColor: state.isFocused ? '#EF4217' : base.borderColor,
                        boxShadow: state.isFocused ? '0 0 0 1px #EF4217' : base.boxShadow,
                        '&:hover': {
                          borderColor: state.isFocused ? '#EF4217' : base.borderColor,
                        },
                      }),
                      option: (base: any, state: any) => ({
                        ...base,
                        backgroundColor: state.isSelected 
                          ? '#EF4217' 
                          : state.isFocused 
                          ? '#FEE2E2' 
                          : base.backgroundColor,
                        color: state.isSelected ? 'white' : base.color,
                        '&:active': {
                          backgroundColor: '#EF4217',
                        },
                      }),
                    }}
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* 📍 Location Picker */}
        <div className="space-y-4 p-6 border rounded-lg bg-white">
          <div className="flex items-center gap-2">
            <MapPin style={{ color: "#EF4217" }} />
            <h3 className="text-lg font-semibold" style={{ color: "#141130" }}>
              Location *
            </h3>
          </div>

          {/* <LoadScript
            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!}
            libraries={libraries}
          > */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Search Location</Label>
                <StandaloneSearchBox
                  onLoad={(ref) => (searchBoxRef.current = ref)}
                  onPlacesChanged={() => {
                    const places = searchBoxRef.current?.getPlaces();
                    if (places && places.length > 0) {
                      const place = places[0];
                      if (place.geometry?.location) {
                        const lat = place.geometry.location.lat();
                        const lng = place.geometry.location.lng();
                        setMarker({ lat, lng });
                        setMapCenter({ lat, lng });
                        setValue("mapLocation", `${lat},${lng}`, {
                          shouldValidate: true,
                        });
                      }
                    }
                  }}
                >
                  <Input
                    type="text"
                    placeholder="Search for a location..."
                    className="w-full"
                  />
                </StandaloneSearchBox>
                <p className="text-xs text-gray-500">
                  Search or click on the map to pin a location
                </p>
              </div>

              <div
                className="h-[400px] w-full rounded-lg overflow-hidden border-2"
                style={{
                  borderColor: marker ? "#EF4217" : "#e5e7eb",
                }}
              >
                <GoogleMap
                  mapContainerStyle={{ width: "100%", height: "100%" }}
                  center={mapCenter}
                  zoom={marker ? 15 : 10}
                  onClick={handleMapClick}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                  }}
                >
                  {marker && (
                    <Marker
                      position={marker}
                      animation={google.maps.Animation.DROP}
                    />
                  )}
                </GoogleMap>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mapLocation">
                  Coordinates (Latitude, Longitude)
                </Label>
                <Input
                  id="mapLocation"
                  type="text"
                  placeholder="-1.286389, 36.817223"
                  value={mapLocation || ""}
                  onChange={handleManualLocationChange}
                  className={errors.mapLocation ? "border-red-500" : ""}
                  disabled
                />
                {errors.mapLocation && (
                  <p className="text-sm text-red-600">
                    {errors.mapLocation.message}
                  </p>
                )}
              </div>
            </div>
          {/* </LoadScript> */}
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="
            flex-1
            group relative flex items-center px-5 py-2.5 
            font-medium rounded-lg
            transition-all duration-300 ease-out
            hover:bg-[#BFC9D1] 
            hover:shadow-[0_0_20px_rgba(191,201,209,0.1)]
            hover:-translate-y-0.5
            active:translate-y-0 active:scale-95
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#EF4217]
            "
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="
            flex-1 
            group relative flex items-center px-5 py-2.5 
            text-white font-medium rounded-lg
            transition-all duration-300 ease-out
            hover:bg-[#d93712] 
            hover:shadow-[0_0_20px_rgba(239,66,23,0.4)]
            hover:-translate-y-0.5
            active:translate-y-0 active:scale-95
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#EF4217]
            "
            style={{ backgroundColor: "#EF4217" }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Property"
            )}
          </Button>
        </div>
      </form>

    
      {/* {submitStatus.type && (
        <Alert
          className={`relative flex items-start justify-between gap-2 ${
            submitStatus.type === "success"
              ? "border-green-500 bg-green-50"
              : "border-red-500 bg-red-50"
          }`}
        >
          <div className="flex items-center gap-2">
            {submitStatus.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <AlertDescription
              className={`${
                submitStatus.type === "success"
                  ? "text-green-800"
                  : "text-red-800"
              }`}
            >
              {submitStatus.message}
            </AlertDescription>
          </div> */}

          {/* Close button */}
          {/* <button
            type="button"
            onClick={() => setSubmitStatus({ type: null, message: "" })}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </Alert> */}
      {/* )} */}
      <ProfileGateModal
        open={!!profileGate}
        fields={profileGate ?? {}}
        onClose={() => {}} 
      />
    </div>
  );
}
