"use client";

import {
  createService,
  getServicePricingUnits,
  submitServiceForReview,
  uploadServiceDocument,
} from "@/services/serviceProvider";
import { useAuthStore } from "@/store/authStore";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";

type Category = {
  id: number;
  name: string;
  description: string;
  requiredDocumentTypes?: string[];
  requiredNumberOfReferees?: number;
};

type WizardStep =
  | "category"
  | "service"
  | "documents"
  | "referees"
  | "review";

type CreatedService = {
  id: number;
  profileId: number;
  categoryId: number;
  categoryName: string;
  tier: string | null;
  amount: number;
  currency: string;
  pricingUnit: string;
  status:
    | "DRAFT"
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "LISTED"
    | "SUSPENDED"
    | "REMOVED";
  riskLabel: "UNDER_REVIEW" | "VERIFIED" | "TRUSTED";
  createdOn: string;
};

interface AddServiceModalProps {
  categories: Category[];
  /** All services the provider already has (used to block duplicates) */
  existingServices?: CreatedService[];
  /** Quick lookup of already-used category IDs */
  takenCategoryIds?: Set<number>;
  onClose: () => void;
  initialDraft?: {
    service: CreatedService;
    category: Category;
  };
}

const WIZARD_STEPS = [
  {
    key: "category",
    number: 1,
    label: "Category",
    description: "Choose a service",
  },
  {
    key: "service",
    number: 2,
    label: "Service Info",
    description: "Add pricing",
  },
  {
    key: "documents",
    number: 3,
    label: "Documents",
    description: "Upload requirements",
  },
  {
    key: "referees",
    number: 4,
    label: "Referees",
    description: "Add referees",
  },
  {
    key: "review",
    number: 5,
    label: "Review",
    description: "Submit service",
  },
] as const;

export default function AddServiceModal({
  categories,
  takenCategoryIds = new Set<number>(),
  onClose,
  initialDraft,
}: AddServiceModalProps) {
  const { token } = useAuthStore();

  // SUCCESS MODAL STATE
  const [successModal, setSuccessModal] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: "", message: "" });

  // WIZARD STATE – start at documents when resuming a draft
  const [step, setStep] = useState<WizardStep>(
    initialDraft ? "documents" : "category"
  );

  // CATEGORY STATE
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    initialDraft?.category ?? null
  );

  // SERVICE INFORMATION STATE
  const [pricingUnits, setPricingUnits] = useState<
    { id: string; name: string }[]
  >([]);
  const [currency, setCurrency] = useState(
    initialDraft?.service.currency ?? "KES"
  );
  const [amount, setAmount] = useState(
    initialDraft ? String(initialDraft.service.amount) : ""
  );
  const [pricingUnit, setPricingUnit] = useState(
    initialDraft?.service.pricingUnit ?? ""
  );

  // CREATED SERVICE – already exists when resuming
  const [createdService, setCreatedService] = useState<CreatedService | null>(
    initialDraft?.service ?? null
  );

  // Document Upload
  const [uploadedDocs, setUploadedDocs] = useState<
    Record<
      string,
      { status: "idle" | "uploading" | "done" | "error"; error?: string }
    >
  >({});

  // UI / ERROR STATE
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    amount?: string;
    pricingUnit?: string;
  }>({});

  // FETCH PRICING UNITS
  useEffect(() => {
    const fetchPricingUnits = async () => {
      if (!token) return;
      try {
        const response = await getServicePricingUnits(token);
        setPricingUnits(response.data.data ?? []);
      } catch (err) {
        console.error("Failed to fetch pricing units:", err);
      }
    };
    fetchPricingUnits();
  }, [token]);

  const handleFileSelect = async (
    documentType: string,
    file: File | undefined
  ) => {
    if (!file || !createdService || !token) return;

    setUploadedDocs((prev) => ({
      ...prev,
      [documentType]: { status: "uploading" },
    }));

    try {
      await uploadServiceDocument(token, createdService.id, {
        file,
        documentType,
      });
      setUploadedDocs((prev) => ({
        ...prev,
        [documentType]: { status: "done" },
      }));
    } catch (err: any) {
      console.error("Failed to upload document:", err);
      setUploadedDocs((prev) => ({
        ...prev,
        [documentType]: {
          status: "error",
          error:
            err?.response?.data?.description ||
            "Upload failed. Please try again.",
        },
      }));
    }
  };

  // Only show categories the user does NOT already have a service for
  const availableCategories = useMemo(() => {
    return categories.filter((c) => !takenCategoryIds.has(c.id));
  }, [categories, takenCategoryIds]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return availableCategories;

    return availableCategories.filter(
      (category) =>
        category.name.toLowerCase().includes(query) ||
        category.description.toLowerCase().includes(query)
    );
  }, [availableCategories, search]);

  // SELECT CATEGORY (only reachable for brand-new services)
  const handleCategorySelect = (category: Category) => {
    // Extra safety – should never happen because of the filter above
    if (takenCategoryIds.has(category.id)) {
      setApiError(
        "You already have a service in this category. Please resume the existing draft or wait for the current one to be processed."
      );
      return;
    }
    setSelectedCategory(category);
    setApiError(null);
    setStep("service");
  };

  // SERVICE VALIDATION
  const validateServiceInformation = () => {
    const newErrors: {
      amount?: string;
      pricingUnit?: string;
    } = {};

    if (!amount.trim()) {
      newErrors.amount = "Amount is required.";
    } else if (Number(amount) <= 0) {
      newErrors.amount = "Amount must be greater than 0.";
    }

    if (!pricingUnit) {
      newErrors.pricingUnit = "Pricing unit is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // CREATE SERVICE
  const handleServiceContinue = async () => {
    setApiError(null);

    if (!validateServiceInformation()) {
      return;
    }

    if (!selectedCategory) {
      setApiError("Please select a service category.");
      return;
    }

    // Final guard – category already taken
    if (takenCategoryIds.has(selectedCategory.id)) {
      setApiError(
        "You already have a service in this category. Resume the existing one instead of creating a new one."
      );
      return;
    }

    if (!token) {
      setApiError("You are not authenticated. Please log in again.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        categoryId: selectedCategory.id,
        amount: Number(amount),
        currency,
        pricingUnit,
      };

      const response = await createService(token, payload);

      if (!response.data.success) {
        setApiError(
          response.data.description ||
            "Failed to create service. Please try again."
        );
        return;
      }

      const service = response.data.data[0];
      setCreatedService(service);
      setStep("documents");
    } catch (error) {
      console.error("Failed to create service:", error);
      if (axios.isAxiosError(error)) {
        setApiError(
          error.response?.data?.description ||
            "Failed to create service. Please try again."
        );
      } else {
        setApiError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // BACK NAVIGATION
  const handleBack = () => {
    setApiError(null);

    // When resuming a draft we never go back to category / service
    if (initialDraft) {
      if (step === "documents") return; // already the first step for drafts
      if (step === "referees") {
        setStep("documents");
        return;
      }
      if (step === "review") {
        setStep("referees");
        return;
      }
      return;
    }

    // Normal new-service flow
    if (step === "service") {
      setStep("category");
      return;
    }
    if (step === "documents") {
      setStep("service");
      return;
    }
    if (step === "referees") {
      setStep("documents");
      return;
    }
    if (step === "review") {
      setStep("referees");
    }
  };

  // CURRENT STEP INDEX
  const currentStepIndex = WIZARD_STEPS.findIndex((item) => item.key === step);

  // First step of the current flow (used to disable Back)
  const isFirstStep =
    step === "category" || (Boolean(initialDraft) && step === "documents");

  // WIZARD HEADER
  const renderWizardHeader = () => {
    return (
      <div className="border-b border-gray-100 px-6 pt-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#020B2D]">
              {initialDraft ? "Resume Service" : "Add Service"}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Follow the steps below to create and submit your service.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-[#020B2D]"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Progress */}
        <div className="mt-6 flex items-start">
          {WIZARD_STEPS.map((wizardStep, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;

            return (
              <div
                key={wizardStep.key}
                className="flex flex-1 items-start"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold transition ${
                      isActive
                        ? "bg-[#FF4B1F] text-white"
                        : isCompleted
                          ? "bg-[#020B2D] text-white"
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isCompleted ? "✓" : wizardStep.number}
                  </div>
                  <p
                    className={`mt-2 hidden text-[10px] font-semibold sm:block ${
                      isActive || isCompleted
                        ? "text-[#020B2D]"
                        : "text-gray-400"
                    }`}
                  >
                    {wizardStep.label}
                  </p>
                  <p className="mt-0.5 hidden text-[9px] text-gray-400 md:block">
                    {wizardStep.description}
                  </p>
                </div>

                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={`mt-4 h-px flex-1 ${
                      index < currentStepIndex
                        ? "bg-[#020B2D]"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ERROR
  const renderApiError = () => {
    if (!apiError) return null;

    return (
      <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-xs font-medium text-red-700">{apiError}</p>
      </div>
    );
  };

  // STEP 1 — CATEGORY
  const renderCategoryStep = () => {
    return (
      <>
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[#020B2D]">
            Choose a service category
          </h3>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Select the category that best matches the service you want to
            offer. Categories you already have a service for are hidden.
          </p>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search service categories..."
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-xs outline-none transition focus:border-[#020B2D] focus:ring-1 focus:ring-[#020B2D]/10"
          />
        </div>

        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium text-[#020B2D]">
            Available categories
          </p>
          <p className="text-[11px] text-gray-400">
            {filteredCategories.length}{" "}
            {filteredCategories.length === 1 ? "category" : "categories"}
          </p>
        </div>

        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategorySelect(category)}
                className="group w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#FF4B1F]/40 hover:bg-gray-50 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#020B2D]">
                      {category.name}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                      {category.description}
                    </p>
                  </div>
                  <span className="text-sm text-gray-300 transition group-hover:translate-x-1 group-hover:text-[#FF4B1F]">
                    →
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-[#020B2D]">
                {availableCategories.length === 0
                  ? "No more categories available"
                  : "No categories found"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {availableCategories.length === 0
                  ? "You already have a service in every category. Resume a draft from the list instead."
                  : "Try searching for a different category."}
              </p>
            </div>
          )}
        </div>
      </>
    );
  };

  // =====================================================
  // STEP 2 — SERVICE INFORMATION
  // =====================================================
  const renderServiceStep = () => {
    return (
      <>
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[#020B2D]">
            Add service information
          </h3>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Add the pricing details for the service you want to offer.
          </p>
        </div>

        {/* Selected category */}
        {selectedCategory && (
          <div className="mb-6 rounded-xl border border-[#020B2D]/10 bg-[#020B2D]/[0.03] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Selected category
            </p>
            <p className="mt-1 text-sm font-semibold text-[#020B2D]">
              {selectedCategory.name}
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              {selectedCategory.description}
            </p>
          </div>
        )}

        {/* Amount */}
        <div className="mb-4">
          <label
            htmlFor="amount"
            className="mb-1.5 block text-xs font-medium text-[#020B2D]"
          >
            Amount
          </label>
          <input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (errors.amount) {
                setErrors((prev) => ({
                  ...prev,
                  amount: undefined,
                }));
              }
            }}
            placeholder="e.g. 500.00"
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-xs outline-none transition focus:border-[#020B2D] focus:ring-1 focus:ring-[#020B2D]/10"
          />
          {errors.amount && (
            <p className="mt-1 text-xs text-red-500">{errors.amount}</p>
          )}
        </div>

        {/* Currency */}
        <div className="mb-4">
          <label
            htmlFor="currency"
            className="mb-1.5 block text-xs font-medium text-[#020B2D]"
          >
            Currency
          </label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs outline-none transition focus:border-[#020B2D] focus:ring-1 focus:ring-[#020B2D]/10"
          >
            <option value="KES">KES — Kenyan Shilling</option>
            <option value="USD">USD — US Dollar</option>
          </select>
        </div>

        {/* Pricing Unit */}
        <div className="mb-6">
          <label
            htmlFor="pricingUnit"
            className="mb-1.5 block text-xs font-medium text-[#020B2D]"
          >
            Pricing Unit
          </label>
          <select
            id="pricingUnit"
            value={pricingUnit}
            onChange={(e) => {
              setPricingUnit(e.target.value);
              if (errors.pricingUnit) {
                setErrors((prev) => ({
                  ...prev,
                  pricingUnit: undefined,
                }));
              }
            }}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs outline-none transition focus:border-[#020B2D] focus:ring-1 focus:ring-[#020B2D]/10"
          >
            <option value="" disabled>
              Select pricing unit
            </option>
            {pricingUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
          {errors.pricingUnit && (
            <p className="mt-1 text-xs text-red-500">{errors.pricingUnit}</p>
          )}
        </div>
      </>
    );
  };

  // =====================================================
  // STEP 3 — DOCUMENTS
  // =====================================================
  const renderDocumentsStep = () => {
    const requiredDocuments =
      selectedCategory?.requiredDocumentTypes ?? [];

    return (
      <>
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[#020B2D]">
            Upload required documents
          </h3>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Provide the documents required for{" "}
            <span className="font-medium text-[#020B2D]">
              {selectedCategory?.name}
            </span>
            .
          </p>
        </div>

        <div className="mb-5 rounded-lg border border-[#020B2D]/10 bg-[#020B2D]/[0.03] px-4 py-3">
          <p className="text-xs font-medium text-[#020B2D]">
            Document requirements
          </p>
          <p className="mt-1 text-[11px] leading-5 text-gray-500">
            You will need to upload {requiredDocuments.length}{" "}
            {requiredDocuments.length === 1 ? "document" : "documents"}{" "}
            before you can continue.
          </p>
        </div>

        <div className="space-y-3">
          {requiredDocuments.length > 0 ? (
            requiredDocuments.map((documentType) => (
              <div
                key={documentType}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#020B2D]">
                      {documentType
                        .replaceAll("_", " ")
                        .toLowerCase()
                        .replace(/\b\w/g, (char) => char.toUpperCase())}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-400">Required</p>
                  </div>
                  <label className="cursor-pointer rounded-md border border-gray-300 px-3 py-1.5 text-[11px] font-medium text-[#020B2D] transition hover:bg-gray-50">
                    {uploadedDocs[documentType]?.status === "uploading"
                      ? "Uploading..."
                      : uploadedDocs[documentType]?.status === "done"
                        ? "✓ Uploaded"
                        : "Choose file"}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) =>
                        handleFileSelect(
                          documentType,
                          e.target.files?.[0]
                        )
                      }
                    />
                  </label>
                </div>
                {uploadedDocs[documentType]?.status === "error" && (
                  <p className="mt-1 text-[11px] text-red-500">
                    {uploadedDocs[documentType]?.error}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
              <p className="text-xs font-medium text-[#020B2D]">
                No documents required
              </p>
              <p className="mt-1 text-[11px] text-gray-500">
                You can continue to the next step.
              </p>
            </div>
          )}
        </div>
      </>
    );
  };

  // =====================================================
  // STEP 4 — REFEREES
  // =====================================================
  const renderRefereesStep = () => {
    const requiredReferees =
      selectedCategory?.requiredNumberOfReferees ?? 0;

    return (
      <>
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[#020B2D]">
            Add referee information
          </h3>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Add the referees required for this service.
          </p>
        </div>

        {requiredReferees === 0 ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-5">
            <p className="text-sm font-semibold text-green-800">
              No referees required
            </p>
            <p className="mt-1 text-xs leading-5 text-green-700">
              This service category does not require any referees. You can
              continue to review your service.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 rounded-lg border border-[#020B2D]/10 bg-[#020B2D]/[0.03] px-4 py-3">
              <p className="text-xs font-medium text-[#020B2D]">
                Referees required: {requiredReferees}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-gray-500">
                Please provide accurate contact information for your
                referees.
              </p>
            </div>

            {/* Temporary referee UI */}
            {Array.from({ length: requiredReferees }, (_, index) => (
              <div
                key={index}
                className="mb-4 rounded-xl border border-gray-200 p-4"
              >
                <p className="mb-4 text-xs font-semibold text-[#020B2D]">
                  Referee {index + 1}
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Full name"
                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-xs outline-none focus:border-[#020B2D]"
                  />
                  <input
                    type="text"
                    placeholder="Phone number"
                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-xs outline-none focus:border-[#020B2D]"
                  />
                  <input
                    type="email"
                    placeholder="Email address"
                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-xs outline-none focus:border-[#020B2D]"
                  />
                </div>
              </div>
            ))}
          </>
        )}
      </>
    );
  };

  // =====================================================
  // STEP 5 — REVIEW
  // =====================================================
  const renderReviewStep = () => {
    return (
      <>
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[#020B2D]">
            Review your service
          </h3>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Review the information below before submitting your service for
            review.
          </p>
        </div>

        {/* Category */}
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Service Category
          </p>
          <p className="mt-1 text-sm font-semibold text-[#020B2D]">
            {selectedCategory?.name}
          </p>
        </div>

        {/* Pricing */}
        <div className="mt-3 rounded-xl border border-gray-200 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Pricing
          </p>
          <p className="mt-1 text-sm font-semibold text-[#020B2D]">
            {currency} {amount}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Pricing unit:{" "}
            {pricingUnits.find((unit) => unit.id === pricingUnit)?.name ??
              pricingUnit}
          </p>
        </div>

        {/* Documents */}
        <div className="mt-3 rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Documents
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Required documents will be submitted with this service.
              </p>
            </div>
            <span className="text-green-600">✓</span>
          </div>
        </div>

        {/* Referees */}
        <div className="mt-3 rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Referees
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {selectedCategory?.requiredNumberOfReferees ?? 0} referee(s)
                required.
              </p>
            </div>
            <span className="text-green-600">✓</span>
          </div>
        </div>

        {/* Submission notice */}
        <div className="mt-5 rounded-xl border border-[#FF4B1F]/10 bg-[#FF4B1F]/5 p-4">
          <p className="text-xs font-semibold text-[#020B2D]">
            Ready to submit?
          </p>
          <p className="mt-1 text-[11px] leading-5 text-gray-500">
            Once submitted, your service will be sent for review. You may need
            to wait for approval before it becomes available to customers.
          </p>
        </div>
      </>
    );
  };

  // =====================================================
  // STEP CONTENT
  // =====================================================
  const renderStepContent = () => {
    switch (step) {
      case "category":
        return renderCategoryStep();
      case "service":
        return renderServiceStep();
      case "documents":
        return renderDocumentsStep();
      case "referees":
        return renderRefereesStep();
      case "review":
        return renderReviewStep();
      default:
        return null;
    }
  };

  // =====================================================
  // CONTINUE BUTTON
  // =====================================================
  const handleContinue = async () => {
    setApiError(null);

    if (step === "service") {
      await handleServiceContinue();
      return;
    }

    if (step === "documents") {
      setStep("referees");
      return;
    }

    if (step === "referees") {
      setStep("review");
      return;
    }

    if (step === "review") {
      if (!createdService || !token) {
        setApiError("Something went wrong. Please start over.");
        return;
      }

      try {
        setIsSubmitting(true);
        setApiError(null);

        const response = await submitServiceForReview(
          token,
          createdService.id
        );

        if (!response.data.success) {
          setApiError(
            response.data.description ||
              "Failed to submit service for review."
          );
          return;
        }

        setSuccessModal({
          open: true,
          title: "Service Submitted",
          message:
            response.data.description ||
            "Your service has been submitted for admin review.",
        });
      } catch (error) {
        console.error("Failed to submit service for review:", error);
        if (axios.isAxiosError(error)) {
          setApiError(
            error.response?.data?.description ||
              "Failed to submit service for review."
          );
        } else {
          setApiError("Something went wrong. Please try again.");
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // =====================================================
  // MODAL
  // =====================================================
  // NOTE: This is the ONLY part of the file that changed.
  // Everything above this line is identical to your original.
  // We now render EITHER the wizard modal OR the success modal,
  // wrapped in a fragment (<> </>) since we have two possible
  // top-level elements instead of one.
  return (
    <>
      {!successModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            {/* HEADER + PROGRESS */}
            {renderWizardHeader()}

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {renderApiError()}
              {renderStepContent()}
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4">
              {/* Back */}
              <button
                type="button"
                onClick={handleBack}
                disabled={isFirstStep || isSubmitting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-[#020B2D] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Back
              </button>

              <div className="flex items-center gap-3">
                {/* Cancel */}
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-[#020B2D]"
                >
                  Cancel
                </button>

                {/* Continue */}
                {step !== "category" && (
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#FF4B1F] px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting
                      ? "Saving..."
                      : step === "review"
                        ? "Submit for Review"
                        : "Continue"}
                    {!isSubmitting && step !== "review" && <span>→</span>}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {successModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              ✓
            </div>
            <h2 className="text-sm font-semibold text-[#020B2D]">
              {successModal.title}
            </h2>
            <p className="mt-2 text-xs leading-5 text-gray-500">
              {successModal.message}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-lg bg-[#FF4B1F] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
