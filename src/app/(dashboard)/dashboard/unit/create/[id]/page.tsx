//Create Unit Page
"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Upload,
  Loader2,
  ArrowLeft,
  Home,
  Copy,
  ExternalLink,
  PlusCircle,
} from "lucide-react";
import { currencyOptions } from "@/lib/actions";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {usePropertyMetadata} from "@/app/(dashboard)/dashboard/property/propertyMetadata";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { parseUnitOrigin, unitListHref, unitOriginLabel } from "@/lib/unitNavigation";

const Select = dynamic(() => import("react-select"), { ssr: false });

type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

// Validation schema
const unitSchema = z.object({
  uniqueRef: z.string().min(1, "Unit reference is required"),
  unitTypeId: z.string().min(1, "Unit type is required"),
  size: z.string().min(1, "Size is required").regex(/^\d+\.?\d*$/, "Size must be a valid number"),
  measurementUnits: z.string().min(1, "Measurement unit is required"),
  utilities: z.string().min(1, "At least one utility is required"),
  leaseMode: z.enum(["RENT", "SALE", "SERVICE_CHARGE"]).refine((val) => !!val, { message: "Lease mode is required" }),
  price: z.string().min(1, "Price is required").regex(/^\d+\.?\d*$/, "Price must be a valid number"),
  currency: z.string().optional(),
  templateId: z.string().optional(),
});

type UnitFormData = z.infer<typeof unitSchema>;

export default function CreateUnitForm() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const propertyId = params?.id as string;
  const propertyName = searchParams.get("name")?.replace(/-/g, " ");
  const propertyCurrency = searchParams.get("currency") ?? undefined ;
  const propertyType = searchParams.get("propertyType") as string || "";
  const leaseModeParam = searchParams.get("leaseMode"); // "SALE" | "RENT" | "SERVICE_CHARGE" | null
  const origin = parseUnitOrigin(searchParams.get("from"));
  const backHref = unitListHref(origin, propertyId);
  console.log("PROPERTYNAME: ", propertyName);
  console.log("PROPERTYCURR: ", propertyCurrency);

  // This form's own Lease Mode field only knows "rent"/"lease" (the latter
  // is the sale option — see filteredLeaseTemplates below); there's no
  // SERVICE_CHARGE equivalent yet, so a Homeowners-origin visit can only be
  // flagged, not pre-selected/locked, without inventing unverified backend
  // semantics.
  // const presetFormLeaseMode: "rent" | "lease" | null =
  //   leaseModeParam === "RENT" ? "rent" : leaseModeParam === "SALE" ? "lease" : null;
const presetFormLeaseMode: "RENT" | "SALE" | "SERVICE_CHARGE" | null =
  leaseModeParam === "RENT" || leaseModeParam === "SALE" || leaseModeParam === "SERVICE_CHARGE"
    ? leaseModeParam
    : null;

  const {
    createNewUnit,
    handleCreateSimilarUnits,
    fetchSupportedUtilities,
    fetchMeasurementUnits,
    handleListLeaseTemplates,
  } = useApi();

  // Options state
  const {isLoadingTypes, unitTypeOptions, setCurrentPropertyType } = usePropertyMetadata();
  const [utilityOptions, setUtilityOptions] = useState<SelectOption[]>([]);
  const [measurementOptions, setMeasurementOptions] = useState<SelectOption[]>([]);
  const [leaseTemplateOptions, setLeaseTemplateOptions] = useState<SelectOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  // Image state
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    unitId: number | null;
    unitRef: string;
    unitTypeLabel: string;
    size: string;
    measurementLabel: string;
    price: string;
    currency: string;
    leaseMode: string;
  } | null>(null);

  // Similar units state (mirrors unit details page)
  const [showSimilarSetup, setShowSimilarSetup] = useState(false);
  const [similarUnitsCount, setSimilarUnitsCount] = useState(1);
  const [isCreatingSimilar, setIsCreatingSimilar] = useState(false);

  const incrementCount = () => { if (similarUnitsCount < 49) setSimilarUnitsCount((p) => p + 1); };
  const decrementCount = () => { if (similarUnitsCount > 1) setSimilarUnitsCount((p) => p - 1); };
  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value);
    if (!isNaN(v) && v >= 1 && v <= 49) setSimilarUnitsCount(v);
    else if (e.target.value === "") setSimilarUnitsCount(1);
  };

  const handleCreateSimilar = async () => {
    if (!successData?.unitId) return;
    setIsCreatingSimilar(true);
    try {
      await handleCreateSimilarUnits(successData.unitId, similarUnitsCount);
      toast.success("Similar units creation initiated!");
      setSimilarUnitsCount(1);
      setShowSimilarSetup(false);
      setSuccessData(null);
    } catch {
      toast.error("Failed to create similar units");
    } finally {
      setIsCreatingSimilar(false);
    }
  };
  // const [submitStatus, setSubmitStatus] = useState<{
  //   type: "success" | "error" | null;
  //   message: string;
  // }>({ type: null, message: "" });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    control,
    watch,
  } = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
  });

  const selectedLeaseMode = watch("leaseMode");
  console.log("Selected Lease Mode: ", selectedLeaseMode)
  console.log("All Lease Templates: ", leaseTemplateOptions)

  const filteredLeaseTemplates = leaseTemplateOptions.filter((template: any) => {
  if (!selectedLeaseMode) return true;
  return template.leaseMode === selectedLeaseMode;
});

  //   const templateMode = selectedLeaseMode === "rent" ? "RENT" : "SALE";
  //   return template.leaseMode === templateMode;
    
  // });

  console.log("Filtered Templates: ", filteredLeaseTemplates)

  // Load all options on mount
  useEffect(() => {
    loadAllOptions();
  }, []);

  const loadAllOptions = async () => {
    try {
      setIsLoadingOptions(true);
      setCurrentPropertyType(propertyType);
      setValue("currency", propertyCurrency);
      if (presetFormLeaseMode) setValue("leaseMode", presetFormLeaseMode);
      // Load all options in parallel
      const [utilitiesRes, measurementsRes, leaseTemplateRes] = await Promise.all([
        fetchSupportedUtilities(),
        fetchMeasurementUnits(),
        handleListLeaseTemplates({page: 0, size: 100, sort: 'name,asc'}),
      ]);

      // Transform utilities
      if (utilitiesRes?.success && utilitiesRes.data) {
        const utilities = utilitiesRes.data.map((item: any) => ({
          value: item.id.toString(),
          label: item.name,
        }));
        console.log("Utilities: ", utilities)
        setUtilityOptions(utilities);
        console.log("Utility options: ", utilityOptions)
      }

      // Transform measurements
      if (measurementsRes?.success && measurementsRes.data) {
        const measurements = measurementsRes.data.map((item: any) => ({
          value: item.id.toString(),
          label: item.name,
        }));
        setMeasurementOptions(measurements);
      }
      // Transform lease templates
      if (leaseTemplateRes?.success && leaseTemplateRes.data) {
        const templates = leaseTemplateRes.data.map((item: any) => ({
          value: item.id.toString(),
          label: item.name,
          leaseMode: item.leaseMode,
        }));
        setLeaseTemplateOptions(templates);
      }
    } catch (error: any) {
      console.error("Error loading options:", error);
      toast.error("Failed to load form options. Please refresh the page.");
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: UnitFormData) => {
    if (!image) {
      toast.error("Please upload an image for the unit.");
      return;
    }

    setIsSubmitting(true);
    // setSubmitStatus({ type: null, message: "" });

    try {
      console.log("DAAAATA: ", data)
      const result = await createNewUnit({
        propertyId: Number(propertyId),
        uniqueRef: data.uniqueRef,
        unitTypeId: data.unitTypeId,
        size: data.size,
        measurementUnits: data.measurementUnits,
        utilities: data.utilities,
        leaseMode: data.leaseMode,
        price: data.price,
        image: image,
        currency: data.currency ?? "",
        templateId: Number(data.templateId) ?? ""
      });

      const createdUnitId = result?.data?.id ?? result?.id ?? null;
      const unitTypeLabel = unitTypeOptions.find((o) => o.value === data.unitTypeId)?.label ?? data.unitTypeId ?? "";
      const measurementLabel = measurementOptions.find((o) => o.value === data.measurementUnits)?.label ?? data.measurementUnits ?? "";
      const currencyLabel = currencyOptions.find((o) => o.value === data.currency)?.label ?? data.currency ?? "";
      setSuccessData({
        unitId: createdUnitId,
        unitRef: data.uniqueRef,
        unitTypeLabel,
        size: data.size?.toString() ?? "",
        measurementLabel,
        price: data.price?.toString() ?? "",
        currency: currencyLabel,
        leaseMode: data.leaseMode ?? "",
      });
    } catch (error: any) {
      toast.error("Failed to create unit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingOptions) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2
            className="w-12 h-12 animate-spin mx-auto mb-4"
            style={{ color: "#EF4217" }}
          />
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 p-6">
      <style jsx global>{`
        input:not(.rs__input):focus,
        textarea:focus {
          outline: none !important;
          border-color: #EF4217 !important;
          box-shadow: 0 0 0 1px #EF4217 !important;
        }

        .rs__control {
          box-shadow: none !important;
        }
      `}</style>

      {/* Header */}
      <div className="space-y-1.5">
        <Breadcrumb items={[
          { label: "Properties", href: "/dashboard/property/properties" },
          { label: unitOriginLabel(origin), href: backHref },
          { label: "Create Unit" },
        ]} />
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(backHref)}
            size="icon"
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "#141130" }}>
              Create New Unit
            </h1>
            <p className="text-muted-foreground">Property Name: {propertyName?.toUpperCase()}</p>
          </div>
        </div>
      </div>

      {/* Status Message */}
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
          </div>
          <button
            type="button"
            onClick={() => setSubmitStatus({ type: null, message: "" })}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </Alert>
      )} */}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Image + Basic Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Upload */}
          <div className="space-y-3 p-6 border rounded-lg bg-white">
            <Label className="text-base font-semibold" style={{ color: "#141130" }}>
              Unit Image *
            </Label>
            <div className="flex flex-col items-center gap-4">
              {imagePreview ? (
                <div
                  className="relative w-full h-64 rounded-lg overflow-hidden border-2"
                  style={{ borderColor: "#EF4217" }}
                >
                  <img
                    src={imagePreview}
                    alt="Unit preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 hover:bg-red-700"
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
                    Click to upload unit image
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

          {/* Basic Information */}
          <div className="space-y-4 p-6 border rounded-lg bg-white">
            <div className="flex items-center gap-2 mb-4">
              <Home style={{ color: "#EF4217" }} />
              <h3 className="text-lg font-semibold" style={{ color: "#141130" }}>
                Basic Information
              </h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="uniqueRef">Unit Reference *</Label>
              <Input
                id="uniqueRef"
                placeholder="e.g., A101, B-205"
                {...register("uniqueRef")}
                className={errors.uniqueRef ? "border-red-500" : ""}
              />
              {errors.uniqueRef && (
                <p className="text-sm text-red-600">{errors.uniqueRef.message}</p>
              )}
              <p className="text-xs text-gray-500">Unique identifier for this unit</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitTypeId">Unit Type *</Label>
              <Controller
                name="unitTypeId"
                control={control}
                render={({ field }) => (
                  <Select
                    options={unitTypeOptions}
                    isClearable
                    isSearchable
                    isLoading={isLoadingTypes}
                    classNamePrefix="rs"
                    placeholder="Select unit type"
                    value={unitTypeOptions.find(opt => opt.value === field.value) || null}
                    onChange={(selectedOption: any) =>
                      field.onChange(selectedOption ? selectedOption.value : "")
                    }
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
                        borderColor: errors.unitTypeId ? '#ef4444' : state.isFocused ? '#EF4217' : base.borderColor,
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
              {errors.unitTypeId && (
                <p className="text-sm text-red-600">{errors.unitTypeId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="size">Size *</Label>
                <Input
                  id="size"
                  type="text"
                  placeholder="e.g., 1200"
                  {...register("size")}
                  className={errors.size ? "border-red-500" : ""}
                />
                {errors.size && (
                  <p className="text-sm text-red-600">{errors.size.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="measurementUnits">Unit *</Label>
                <Controller
                  name="measurementUnits"
                  control={control}
                  render={({ field }) => (
                    <Select
                      options={measurementOptions}
                      isClearable
                      isSearchable
                      classNamePrefix="rs"
                      placeholder="Select unit"
                      value={measurementOptions.find(opt => opt.value === field.value) || null}
                      onChange={(selectedOption: any) =>
                        field.onChange(selectedOption ? selectedOption.value : "")
                      }
                      styles={{
                        control: (base: any, state: any) => ({
                          ...base,
                          borderColor: errors.measurementUnits ? '#ef4444' : state.isFocused ? '#EF4217' : base.borderColor,
                          boxShadow: state.isFocused ? '0 0 0 1px #EF4217' : base.boxShadow,
                        }),
                        option: (base: any, state: any) => ({
                          ...base,
                          backgroundColor: state.isSelected ? '#EF4217' : state.isFocused ? '#FEE2E2' : base.backgroundColor,
                          color: state.isSelected ? 'white' : base.color,
                        }),
                      }}
                    />
                  )}
                />
                {errors.measurementUnits && (
                  <p className="text-sm text-red-600">{errors.measurementUnits.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Utilities & Pricing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Utilities */}
          <div className="space-y-4 p-6 border rounded-lg bg-white">
            <h3 className="text-lg font-semibold" style={{ color: "#141130" }}>
              Utilities & Features
            </h3>

            <div className="space-y-2">
              <Label htmlFor="utilities">Included Utilities *</Label>
              <Controller
                name="utilities"
                control={control}
                render={({ field }) => (
                  <Select
                    options={utilityOptions}
                    isMulti
                    placeholder="Select utilities"
                    classNamePrefix="rs"
                    value={utilityOptions.filter(opt => 
                      field.value?.split(',').includes(opt.value)
                    )}
                    onChange={(selectedOptions: any) => {
                      const values = selectedOptions ? selectedOptions.map((opt: any) => opt.value).join(',') : '';
                      field.onChange(values);
                    }}
                    styles={{
                      control: (base: any, state: any) => ({
                        ...base,
                        borderColor: errors.utilities ? '#ef4444' : state.isFocused ? '#EF4217' : base.borderColor,
                        boxShadow: state.isFocused ? '0 0 0 1px #EF4217' : base.boxShadow,
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
              {errors.utilities && (
                <p className="text-sm text-red-600">{errors.utilities.message}</p>
              )}
              <p className="text-xs text-gray-500">Select all utilities included with this unit</p>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4 p-6 border rounded-lg bg-white">
            <div className="flex items-center gap-2 mb-4">
              {/* <DollarSign style={{ color: "#EF4217" }} /> */}
              <h3 className="text-lg font-semibold" style={{ color: "#141130" }}>
                Pricing Information
              </h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaseMode">Lease Mode *</Label>
              <Controller
                name="leaseMode"
                control={control}
                render={({ field }) => (
                  <Select
                    options={[
                      { value: "RENT", label: "Rent" },
                      { value: "SALE", label: "Sale" },
                      { value: "SERVICE_CHARGE", label: "Service Charge" },
                    ]}
                    isClearable={!presetFormLeaseMode}
                    isDisabled={!!presetFormLeaseMode}
                    classNamePrefix="rs"
                    placeholder="Select lease mode"
                    value={
                      field.value
                        ? [
                            { value: "RENT", label: "Rent" },
                            { value: "SALE", label: "Sale" },
                            { value: "SERVICE_CHARGE", label: "Service Charge" },
                          ].find((opt) => opt.value === field.value)
                        : null
                    }
                    onChange={(selectedOption: any) =>
                      field.onChange(selectedOption ? selectedOption.value : "")
                    }
                    styles={{
                      control: (base: any, state: any) => ({
                        ...base,
                        borderColor: errors.leaseMode
                          ? "#ef4444"
                          : state.isFocused
                          ? "#EF4217"
                          : base.borderColor,
                        boxShadow: state.isFocused ? "0 0 0 1px #EF4217" : base.boxShadow,
                        "&:hover": {
                          borderColor: state.isFocused ? "#EF4217" : base.borderColor,
                        },
                      }),
                      option: (base: any, state: any) => ({
                        ...base,
                        backgroundColor: state.isSelected
                          ? "#EF4217"
                          : state.isFocused
                          ? "#FEE2E2"
                          : base.backgroundColor,
                        color: state.isSelected ? "white" : base.color,
                        "&:active": {
                          backgroundColor: "#EF4217",
                        },
                      }),
                    }}
                  />
                )}
              />
              {errors.leaseMode && (
                <p className="text-sm text-red-600">{errors.leaseMode.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency (optional)</Label>
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
            
            {/* After the currency field, before the price field */}

            <div className="space-y-2">
              <Label htmlFor="templateId">Lease Template (optional)</Label>
              <Controller
                name="templateId"
                control={control}
                render={({ field }) => (
                  <Select
                    options={filteredLeaseTemplates}
                    isClearable
                    isSearchable
                    classNamePrefix="rs"
                    placeholder={
                      selectedLeaseMode
                        ? "Select a lease template"
                        : "Select lease mode first"
                    }
                    isDisabled={!selectedLeaseMode}
                    value={
                      filteredLeaseTemplates.find((opt) => opt.value === field.value) || null
                    }
                    onChange={(selectedOption: any) =>
                      field.onChange(selectedOption ? selectedOption.value : "")
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
              <p className="text-xs text-gray-500">
              {selectedLeaseMode
                ? `Showing ${
                    selectedLeaseMode === "RENT"
                      ? "rental"
                      : selectedLeaseMode === "SALE"
                      ? "sale"
                      : "service charge"
                  } templates`
                : "Please select a lease mode to see available templates"}
            </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="text"
                placeholder="e.g., 25000"
                {...register("price")}
                className={errors.price ? "border-red-500" : ""}
              />
              {errors.price && (
                <p className="text-sm text-red-600">{errors.price.message}</p>
              )}
              <p className="text-xs text-gray-500">Enter the rental price for this unit</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(backHref)}
            disabled={isSubmitting}
            className="flex-1 hover:bg-gray-100 transition"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 text-white hover:opacity-90 transition"
            style={{ backgroundColor: "#EF4217" }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Unit"
            )}
          </Button>
        </div>
      </form>

      {/* ── Unit Created Success Modal ── */}
      <Dialog open={!!successData} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md p-0 overflow-hidden"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="flex flex-col items-center px-8 pt-8 pb-6 gap-5">

            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-green-500" />
            </div>

            {/* Text */}
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-[#141130]">Unit Created Successfully</h2>
              <p className="text-sm text-gray-500">
                Unit <span className="font-semibold">{successData?.unitRef}</span> has been created successfully.
              </p>
              {propertyName && (
                <p className="text-sm font-bold text-[#141130] pt-1">
                  Property: {propertyName.toUpperCase()}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="w-full flex flex-col gap-3 pt-1">

              {/* Generate Similar Units */}
              <button
                onClick={() => {
                  setSuccessData(null);
                  setValue("uniqueRef", "");
                  setImage(null);
                  setImagePreview(null);
                }}
                className="w-full flex flex-col items-center justify-center gap-0.5 py-3 px-4 rounded-xl text-white font-semibold transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ backgroundColor: "#EF4217" }}
              >
                <span className="flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  Generate Similar Units
                </span>
                <span className="text-xs font-normal opacity-80">
                  Create additional units using {successData?.unitRef} as a template.
                </span>
              </button>

              {/* View Unit Details */}
              <button
                onClick={() => {
                  if (successData?.unitId) {
                    router.push(`/dashboard/unit/details/${successData.unitId}?p=${propertyId}&from=${origin}`);
                  } else {
                    router.push(backHref);
                  }
                }}
                className="w-full flex flex-col items-center justify-center gap-0.5 py-3 px-4 rounded-xl border-2 border-gray-200 font-semibold text-[#141130] transition-all hover:border-[#EF4217] hover:bg-[#EF4217]/5 active:scale-[0.98]"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  View Unit Details
                </span>
                <span className="text-xs font-normal text-gray-400">
                  Open Unit {successData?.unitRef} and continue setup.
                </span>
              </button>

              {/* Create Another Unit */}
              <button
                onClick={() => {
                  setSuccessData(null);
                  router.push(
                    `/dashboard/unit/create/${propertyId}?name=${searchParams.get("name") ?? ""}&currency=${propertyCurrency ?? ""}&propertyType=${propertyType}&leaseMode=${leaseModeParam ?? ""}&from=${origin}`
                  );
                }}
                className="w-full flex flex-col items-center justify-center gap-0.5 py-3 px-4 rounded-xl border-2 border-gray-200 font-semibold text-[#141130] transition-all hover:border-[#EF4217] hover:bg-[#EF4217]/5 active:scale-[0.98]"
              >
                <span className="flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" />
                  Create Another Unit
                </span>
                <span className="text-xs font-normal text-gray-400">
                  Start a fresh unit with different settings.
                </span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}