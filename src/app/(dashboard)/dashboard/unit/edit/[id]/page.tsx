//Edit Unit Page

"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {usePropertyMetadata} from "@/app/(dashboard)/dashboard/property/propertyMetadata";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { parseUnitOrigin, unitListHref, unitOriginLabel } from "@/lib/unitNavigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  XCircle,
  Upload,
  Loader2,
  ArrowLeft,
  ImagePlus,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { currencyOptions } from "@/lib/actions";
import dynamic from "next/dynamic";
import { toast } from "sonner";

const Select = dynamic(() => import("react-select"), { ssr: false });

type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

const unitSchema = z.object({
  uniqueRef: z.string().min(1, "Unit reference is required"),
  unitTypeId: z.string().min(1, "Unit type is required"),
  size: z.string().min(1, "Size is required").regex(/^\d+\.?\d*$/, "Must be a valid number"),
  measurementUnits: z.string().min(1, "Measurement unit is required"),
  utilities: z.string().min(1, "At least one utility is required"),
  leaseMode: z.enum(["Rent", "Lease"]).refine((val) => !!val, { message: "Lease mode is required" }),
  price: z.string().min(1, "Price is required").regex(/^\d+\.?\d*$/, "Must be a valid number"),
  currency: z.string().optional(),
  templateId: z.string().optional(),

});

type UnitFormData = z.infer<typeof unitSchema>;

export default function EditUnitPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const unitId = params?.id as string;
  const propertyId = searchParams?.get("p") as string;
  const origin = parseUnitOrigin(searchParams?.get("from"));
  const detailsHref = `/dashboard/unit/details/${unitId}?p=${propertyId}&from=${origin}`;
  const originListHref = unitListHref(origin, propertyId);

  const {
    viewUnit,
    getPropertyImage,
    handleEditUnit,
    fetchSupportedUtilities,
    fetchMeasurementUnits,
    addUnitImages,
    handleListLeaseTemplates,
  } = useApi();

  const [unit, setUnit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const [submitStatus, setSubmitStatus] = useState<{
  //   type: "success" | "error" | null;
  //   message: string;
  // }>({ type: null, message: "" });

  // Options
  const [utilityOptions, setUtilityOptions] = useState<SelectOption[]>([]);
  const [measurementOptions, setMeasurementOptions] = useState<SelectOption[]>([]);
  const [leaseTemplateOptions, setLeaseTemplateOptions] = useState<SelectOption[]>([]);

  // Image state
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [existingImagePreviews, setExistingImagePreviews] = useState<string[]>([]);
  const [existingImageBlobs, setExistingImageBlobs] = useState<Blob[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [removedImageIndices, setRemovedImageIndices] = useState<number[]>([]);

  // Image upload modal state
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const {isLoadingTypes, unitTypeOptions, setCurrentPropertyType } = usePropertyMetadata();

  // Form
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

  const filteredLeaseTemplates = leaseTemplateOptions.filter((template: any) => {
    if (!selectedLeaseMode) return true;
    const templateMode = selectedLeaseMode === "Rent" ? "RENT" : "SALE";
    return template.leaseMode === templateMode;
  });

  // Load initial data
  useEffect(() => {
    if (unitId && propertyId) {
      loadAllData();
    }
  }, [unitId, propertyId]);

  const loadAllData = async () => {
    try {
      setLoading(true);

      const [unitRes, utilitiesRes, measurementsRes, leaseTemplatesRes] = await Promise.all([
        viewUnit(Number(propertyId), Number(unitId)),
        fetchSupportedUtilities(),
        fetchMeasurementUnits(),
        handleListLeaseTemplates({ page: 0, size: 100, sort: 'name,asc'}),
      ]);

      // Set unit data
      if (unitRes.success && unitRes.data) {
        const unitData = unitRes.data[0];
        
        setUnit(unitData);
        setCurrentPropertyType(unitData.propertyType);
        console.log("Unit Data: ", unitData)
        setValue("uniqueRef", unitData.ref);
        setValue("unitTypeId", unitData.unitType);
        setValue("size", unitData.size.toString());
        setValue("measurementUnits", unitData.measurementUnits.id.toString());
        setValue("utilities", unitData.utilities.map((u: any) => u.id).join(","));
        const leaseModeVal = unitData.leaseMode.charAt(0).toUpperCase() + unitData.leaseMode.slice(1)
        console.log("Lease Mode Value: ", leaseModeVal)
        setValue("leaseMode", leaseModeVal);
        setValue("price", unitData.price.toString());
        setValue("currency", unitData.currency)

        if(unitData.templateId) {
          setValue("templateId", unitData.templateId.toString());
        }

        // Load existing images
        const allImagePaths: string[] = [];
        if (unitData.thumbnail) {
          allImagePaths.push(unitData.thumbnail);
        }
        if (unitData.images && Array.isArray(unitData.images)) {
          allImagePaths.push(...unitData.images);
        }
        
        setExistingImages(allImagePaths);
        await loadExistingImages(allImagePaths);
      }

      if (utilitiesRes?.success) {
        const utilities = utilitiesRes.data.map((item: any) => ({
          value: item.id.toString(),
          label: item.name,
        }));
        setUtilityOptions(utilities);
      }

      if (measurementsRes?.success) {
        const measurements = measurementsRes.data.map((item: any) => ({
          value: item.id.toString(),
          label: item.name,
        }));
        setMeasurementOptions(measurements);
      }

      if (leaseTemplatesRes?.success && leaseTemplatesRes.data) {
        const templates = leaseTemplatesRes.data.map((item: any) => ({
          value: item.id.toString(),
          label: item.name,
          leaseMode: item.leaseMode,
        }));
        setLeaseTemplateOptions(templates);
      }

    } catch (err: any) {
      setError(err.message || "Failed to load unit data");
    } finally {
      setLoading(false);
    }
  };

  const loadExistingImages = async (imagePaths: string[]) => {
    const previews: string[] = [];
    const blobs: Blob[] = [];
    for (const path of imagePaths) {
      try {
        // const imageBlob = await getPropertyImage(path);

        // const url = URL.createObjectURL(imageBlob);
        previews.push(path);
        // blobs.push(imageBlob)
      } catch (err) {
        console.error("Error loading image:", err);
      }
    }
    setExistingImagePreviews(previews);
    // setExistingImageBlobs(blobs);
  };

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewImages([...newImages, ...files]);
  };

  const removeNewImage = (index: number) => {
    setNewImages(newImages.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    if (!removedImageIndices.includes(index)) {
      setRemovedImageIndices([...removedImageIndices, index]);
    }
    // Move to next image if we're viewing the removed one
    const remainingCount = existingImages.length - removedImageIndices.length - 1;
    if (currentImageIndex >= remainingCount && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const handleUploadImages = async () => {
    if (newImages.length === 0) return;

    try {
      setIsUploadingImages(true);
      const existingImageBlobswithoutThumbnail = existingImageBlobs.slice(1)
      const allImages = [
        ...existingImageBlobswithoutThumbnail.map(
          (blob, i) => new File([blob], `existing_${i}.jpg`, {type: blob.type})
        ), 
        ...newImages,
      ];
      console.log("New Images: ", allImages)
      await addUnitImages({
        unitId: Number(unitId),
        images: allImages,
      });

   
      toast.success(`${newImages.length} image(s) uploaded successfully! Reloading data...`);

      setNewImages([]);
      setIsImageModalOpen(false);

      // Reload unit data to get updated images
      await loadAllData();

      setTimeout(() => {
        ;
      }, 3000);
    } catch (err: any) {
      // setSubmitStatus({
      //   type: "error",
      //   message: err.message || "Failed to upload images",
      // });
      toast.error(err.message || "Failed to upload images");
    } finally {
      setIsUploadingImages(false);
    }
  };

  const getVisibleImages = () => {
    return existingImagePreviews.filter((_, i) => !removedImageIndices.includes(i));
  };

  const visibleImages = getVisibleImages();
  const displayedImage = visibleImages[currentImageIndex];

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const handleNextImage = () => {
    if (currentImageIndex < visibleImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const onSubmit = async (data: UnitFormData) => {
    // Check if at least one image remains
    if (visibleImages.length === 0) {
      // setSubmitStatus({
      //   type: "error",
      //   message: "Please keep at least one image",
      // });
      toast.error("Please keep at least one image.");
      return;
    }

    setIsSubmitting(true);
    // setSubmitStatus({ type: null, message: "" });

    try {
      await handleEditUnit({
        propertyId: Number(propertyId),
        unitId: Number(unitId),
        uniqueRef: data.uniqueRef,
        unitTypeId: data.unitTypeId,
        size: data.size,
        measurementUnits: data.measurementUnits,
        utilities: data.utilities,
        leaseMode: data.leaseMode,
        price: data.price,
        images: [], // Backend handles existing images
        templateId: data.templateId ? Number(data.templateId) : undefined
      });

      // setSubmitStatus({
      //   type: "success",
      //   message: "Unit updated successfully!",
      // });
      toast.success("Unit updated successfully!");

      setTimeout(() => {
        router.push(detailsHref);
      }, 2000);
    } catch (err: any) {
      // setSubmitStatus({
      //   type: "error",
      //   message: err.response.data.description || "Failed to update unit",
      // });
      toast.error(err.response.data.description || "Failed to update unit");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2
            className="w-12 h-12 animate-spin mx-auto mb-4"
            style={{ color: "#EF4217" }}
          />
          <p className="text-gray-600">Loading unit data...</p>
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
          { label: unitOriginLabel(origin), href: originListHref },
          { label: `Unit ${unit?.ref ?? ""}`, href: detailsHref },
          { label: "Edit" },
        ]} />
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(detailsHref)}
            size="icon"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "#141130" }}>
              Edit Unit {unit?.ref}
            </h1>
            <p className="text-muted-foreground">Update unit information</p>
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
          {/* Images Section */}
          <div className="space-y-3 p-6 border rounded-lg bg-white">
            <Label className="text-base font-semibold" style={{ color: "#141130" }}>
              Unit Images 
            </Label>
            <div className="flex flex-col items-center gap-4">
              {displayedImage ? (
                <div
                  className="relative w-full h-64 rounded-lg overflow-hidden border-2"
                  style={{ borderColor: "#EF4217" }}
                >
                  <img
                    src={displayedImage}
                    alt="Unit preview"
                    className="w-full h-full object-cover"
                  />

                  {/* Image Navigation */}
                  {visibleImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrevImage}
                        disabled={currentImageIndex === 0}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-1 rounded transition disabled:opacity-50"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextImage}
                        disabled={currentImageIndex === visibleImages.length - 1}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-1 rounded transition disabled:opacity-50"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>

                      {/* Image Counter */}
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded">
                        {currentImageIndex + 1} / {visibleImages.length}
                      </div>
                    </>
                  )}

                  {/* Remove Button */}
                  {/* <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      const originalIndex = existingImagePreviews.findIndex(
                        (_, i) => !removedImageIndices.includes(i) && existingImagePreviews[i] === displayedImage
                      );
                      removeExistingImage(originalIndex);
                    }}
                  >
                    Remove
                  </Button> */}
                  {/*Add Image Button*/}
                  {/* <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={}
                  >
                    Remove
                  </Button> */}
                  {/* Image Upload Modal */}
                  <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                       type="button"
                       className="absolute top-2 right-2"
                       variant="destructive"
                       size="sm"
                       style={{ backgroundColor: "#EF4217" }}>
                        <ImagePlus className="w-1 h-1 mr-1" />
                        Add Images
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add Unit Images</DialogTitle>
                        <DialogDescription>
                          Upload additional images for this unit. You can select multiple images at once.
                        </DialogDescription>
                      </DialogHeader>
                      
                      {previewImage && (
                      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                        <div className="relative max-w-2xl w-full">
                          <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-8 right-0 text-white hover:text-gray-300"
                          >
                            <X className="w-6 h-6" />
                          </button>
                          <img
                            src={previewImage}
                            alt="Preview"
                            className="w-full h-auto rounded-lg"
                          />
                        </div>
                      </div>
                    )}

                      <div className="space-y-4">
                        {/* Upload Input */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition cursor-pointer">
                          <label htmlFor="image-input" className="cursor-pointer">
                            <div className="space-y-2">
                              <Upload className="w-8 h-8 mx-auto text-gray-400" />
                              <div>
                                <p className="text-sm font-medium text-gray-700">
                                  Click to upload 
                                </p>
                                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                              </div>
                            </div>
                            <Input
                              id="image-input"
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleAddImages}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Image Previews */}
                        {newImages.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-gray-700">
                                Selected Images ({newImages.length})
                              </p>
                              <button
                                type="button"
                                onClick={() => setNewImages([])}
                                className="text-xs text-red-600 hover:text-red-700 font-medium"
                              >
                                Clear all
                              </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {newImages.map((file, index) => (
                                <div key={index} className="relative group">
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={`Preview ${index}`}
                                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                                  />
                                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 rounded-lg transition" />

                                  {/* Remove Button */}
                                  <button
                                    type="button"
                                    onClick={() => removeNewImage(index)}
                                    className="absolute top-1 right-1 bg-red-600 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition"
                                    title="Remove image"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>

                                  {/* File name tooltip */}
                                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition truncate">
                                    {file.name}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Upload Button */}
                        <Button
                          onClick={handleUploadImages}
                          disabled={newImages.length === 0 || isUploadingImages}
                          className="w-full text-white hover:opacity-90 transition"
                          style={{ backgroundColor: "#EF4217" }}
                        >
                          {isUploadingImages ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload {newImages.length} Image{newImages.length !== 1 ? "s" : ""}
                            </>
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="w-full h-64 flex items-center justify-center border-2 border-dashed rounded-lg"
                  style={{ borderColor: "#EF4217" }}>
                  <p className="text-gray-500 text-center">No images remaining</p>
                </div>
              )}

              {/* Image Thumbnails */}
              {visibleImages.length > 0 && (
                <div className="w-full flex gap-2 overflow-x-auto pb-2">
                  {visibleImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition ${
                        currentImageIndex === idx
                          ? "border-blue-500"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${idx}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-4 p-6 border rounded-lg bg-white">
            <h3 className="text-lg font-semibold" style={{ color: "#141130" }}>
              Basic Information
            </h3>

            <div className="space-y-2">
              <Label htmlFor="uniqueRef">Unit Reference </Label>
              <Input
                id="uniqueRef"
                placeholder="e.g., A101"
                {...register("uniqueRef")}
                className={errors.uniqueRef ? "border-red-500" : ""}
              />
              {errors.uniqueRef && (
                <p className="text-sm text-red-600">{errors.uniqueRef.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitTypeId">Unit Type</Label>
              <Controller
                name="unitTypeId"
                control={control}
                render={({ field }) => (
                  <Select
                    options={unitTypeOptions}
                    value={unitTypeOptions.find(opt => opt.value === field.value) || null}
                    onChange={(opt: any) => field.onChange(opt?.value)}
                    isSearchable
                    isLoading={isLoadingTypes}
                    classNamePrefix="rs"
                    placeholder="Select unit type"
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

            <div className="space-y-2">
              <Label htmlFor="leaseMode">Lease Mode </Label>
              <Controller
                name="leaseMode"
                control={control}
                render={({ field }) => (
                  <Select
                    options={[
                      { value: "Rent", label: "Rent" },
                      { value: "Lease", label: "Lease" },
                    ]}
                    value={
                      field.value
                        ? { value: field.value.charAt(0).toUpperCase() + field.value.slice(1), label: field.value.charAt(0).toUpperCase() + field.value.slice(1)}
                        : null
                    }
                    onChange={(opt: any) => field.onChange(opt?.value)}
                    isSearchable={false}
                    classNamePrefix="rs"
                    styles={{
                      control: (base: any, state: any) => ({
                        ...base,
                        borderColor: errors.leaseMode ? '#ef4444' : state.isFocused ? '#EF4217' : base.borderColor,
                        boxShadow: state.isFocused ? '0 0 0 1px #EF4217' : base.boxShadow,
                      }),
                      option: (base: any, state: any) => ({
                        ...base,
                        backgroundColor: state.isSelected 
                          ? '#EF4217' 
                          : state.isFocused 
                          ? '#FEE2E2' 
                          : base.backgroundColor,
                        color: state.isSelected ? 'white' : base.color,
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
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                placeholder="e.g., 5000"
                {...register("price")}
                className={errors.price ? "border-red-500" : ""}
              />
              {errors.price && (
                <p className="text-sm text-red-600">{errors.price.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
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

            {/* Template */}
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
                  ? `Showing ${selectedLeaseMode === "Rent" ? "rental" : "sale"} templates`
                  : "Please select a lease mode to see available templates"}
              </p>
            </div>
          </div>
        </div>

        

        {/* Size & Lease */}
        <div className="p-6 border rounded-lg bg-white space-y-4">
          <h3 className="text-lg font-semibold" style={{ color: "#141130" }}>
            Size & Lease Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size *</Label>
              <Input
                id="size"
                placeholder="e.g., 1200"
                {...register("size")}
                className={errors.size ? "border-red-500" : ""}
              />
              {errors.size && (
                <p className="text-sm text-red-600">{errors.size.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="measurementUnits">Measurement Unit *</Label>
              <Controller
                name="measurementUnits"
                control={control}
                render={({ field }) => (
                  <Select
                    options={measurementOptions}
                    value={measurementOptions.find(opt => opt.value === field.value) || null}
                    onChange={(opt: any) => field.onChange(opt?.value)}
                    isSearchable
                    classNamePrefix="rs"
                    placeholder="Select measurement unit"
                    styles={{
                      control: (base: any, state: any) => ({
                        ...base,
                        borderColor: errors.measurementUnits ? '#ef4444' : state.isFocused ? '#EF4217' : base.borderColor,
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
              {errors.measurementUnits && (
                <p className="text-sm text-red-600">{errors.measurementUnits.message}</p>
              )}
            </div>
            
          </div>
        </div>

        {/* Utilities */}
        <div className="p-6 border rounded-lg bg-white space-y-4">
          <h3 className="text-lg font-semibold" style={{ color: "#141130" }}>
            Utilities
          </h3>

          <div className="space-y-2">
            <Label htmlFor="utilities">Select Utilities *</Label>
            <Controller
              name="utilities"
              control={control}
              render={({ field }) => (
                <Select
                  options={utilityOptions}
                  value={field.value
                    ? field.value.split(",").map(id =>
                      utilityOptions.find(opt => opt.value === id)
                    ).filter(Boolean)
                    : []
                  }
                  onChange={(opts: any) =>
                    field.onChange(opts.map((opt: any) => opt.value).join(","))
                  }
                  isMulti
                  isSearchable
                  classNamePrefix="rs"
                  styles={{
                    control: (base: any, state: any) => ({
                      ...base,
                      borderColor: errors.utilities ? '#ef4444' : state.isFocused ? '#EF4217' : base.borderColor,
                      boxShadow: state.isFocused ? '0 0 0 1px #EF4217' : base.boxShadow,
                    }),
                    option: (base: any, state: any) => ({
                      ...base,
                      backgroundColor: state.isSelected 
                        ? '#EF4217' 
                        : state.isFocused 
                        ? '#FEE2E2' 
                        : base.backgroundColor,
                      color: state.isSelected ? 'white' : base.color,
                    }),
                    multiValue: (base: any) => ({
                      ...base,
                      backgroundColor: '#FEE2E2',
                    }),
                    multiValueLabel: (base: any) => ({
                      ...base,
                      color: '#EF4217',
                    }),
                  }}
                />
              )}
            />
            {errors.utilities && (
              <p className="text-sm text-red-600">{errors.utilities.message}</p>
            )}
          </div>
        </div>

       

        {/* Image Preview Modal */}
        {/* {previewImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="relative max-w-2xl w-full">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-8 right-0 text-white hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={previewImage}
                alt="Preview"
                className="w-full h-auto rounded-lg"
              />
            </div>
          </div>
        )} */}

        {/* Form Actions */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(detailsHref)}
            disabled={isSubmitting}
            className="flex-1"
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
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
