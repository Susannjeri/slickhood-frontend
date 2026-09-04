"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileSearch,
  Loader2,
  RefreshCw,
  ShieldAlert,
  UserRoundSearch,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { KycDocumentViewer } from "@/components/auth/KycDocumentViewer";
import {
  KycAdminCase,
  listKycReviewQueue,
  reprocessKycCase,
  reviewKyc,
} from "@/services/kyc.service";

type DocumentDecision = {
  approved: boolean | null;
  reason: string;
  verifiedFields: Record<string, string>;
  correctionReason: string;
};

const editableFieldsFor = (documentType: string) => {
  if (documentType === "KRA_PIN_CERTIFICATE") return ["taxPin", "fullName"];
  if (["PASSPORT", "NATIONAL_ID_FRONT", "NATIONAL_ID_BACK", "ALIEN_ID_FRONT", "ALIEN_ID_BACK"].includes(documentType)) {
    return ["documentNumber", "fullName", "dateOfBirth", "expiryDate"];
  }
  if (documentType === "SELFIE") return [];
  return ["fullName"];
};

const readable = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const message = (error: unknown) =>
  (error as { response?: { data?: { description?: string } } }).response?.data
    ?.description ?? "The review could not be completed.";

export default function KycReviewPage() {
  const [rows, setRows] = useState<KycAdminCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<number>();
  const [decisions, setDecisions] = useState<
    Record<number, DocumentDecision>
  >({});
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listKycReviewQueue());
    } catch (error) {
      toast.error(message(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => rows.find((row) => row.kycCase.id === selectedCaseId),
    [rows, selectedCaseId],
  );
  const pendingReview =
    selected?.kycCase.status === "SUBMITTED" ||
    selected?.kycCase.status === "REVIEW_REQUIRED";
  const documents = selected?.kycCase.documents ?? [];
  const allDecided =
    documents.length > 0 &&
    documents.every(
      (document) => decisions[document.id]?.approved !== null,
    );
  const hasRejected = documents.some(
    (document) => decisions[document.id]?.approved === false,
  );
  const rejectionReasonsComplete = documents.every((document) => {
    const decision = decisions[document.id];
    return decision?.approved !== false || decision.reason.trim().length > 0;
  });
  const undecidedDocuments = documents.filter(
    (document) => decisions[document.id]?.approved == null,
  );
  const rejectedWithoutReason = documents.filter((document) => {
    const decision = decisions[document.id];
    return decision?.approved === false && decision.reason.trim().length === 0;
  });

  const openReview = (row: KycAdminCase) => {
    const initial: Record<number, DocumentDecision> = {};
    row.kycCase.documents.forEach((document) => {
      initial[document.id] = {
        approved:
          document.status === "VERIFIED"
            ? true
            : document.status === "REJECTED"
              ? false
              : null,
        reason: document.rejectionReason ?? "",
        verifiedFields: { ...(document.reviewerVerifiedFields ?? {}) },
        correctionReason: document.reviewerCorrectionReason ?? "",
      };
    });
    setDecisions(initial);
    setNotes(
      row.kycCase.status === "REJECTED"
        ? row.kycCase.reviewNotes ?? ""
        : "",
    );
    setSelectedCaseId(row.kycCase.id ?? undefined);
  };

  const setDocumentDecision = (
    documentId: number,
    approved: boolean,
    suggestedReason = "",
  ) => {
    setDecisions((current) => ({
      ...current,
      [documentId]: {
        approved,
        reason: approved
          ? ""
          : current[documentId]?.reason?.trim() || suggestedReason,
        verifiedFields: current[documentId]?.verifiedFields ?? {},
        correctionReason: current[documentId]?.correctionReason ?? "",
      },
    }));
  };

  const acceptRemainingDocuments = () => {
    setDecisions((current) => {
      const next = { ...current };
      documents.forEach((document) => {
        if (next[document.id]?.approved == null) {
          next[document.id] = {
            approved: true,
            reason: "",
            verifiedFields: next[document.id]?.verifiedFields ?? {},
            correctionReason: next[document.id]?.correctionReason ?? "",
          };
        }
      });
      return next;
    });
  };

  const setReason = (documentId: number, reason: string) => {
    setDecisions((current) => ({
      ...current,
      [documentId]: {
        ...(current[documentId] ?? { verifiedFields: {}, correctionReason: "" }),
        approved: false,
        reason,
      },
    }));
  };

  const setVerifiedField = (documentId: number, field: string, value: string) => {
    setDecisions((current) => ({
      ...current,
      [documentId]: {
        ...(current[documentId] ?? { approved: null, reason: "", correctionReason: "" }),
        verifiedFields: { ...current[documentId]?.verifiedFields, [field]: value },
      },
    }));
  };

  const setCorrectionReason = (documentId: number, correctionReason: string) => {
    setDecisions((current) => ({
      ...current,
      [documentId]: {
        ...(current[documentId] ?? { approved: null, reason: "", verifiedFields: {} }),
        correctionReason,
      },
    }));
  };

  const hasChangedVerifiedFields = (document: (typeof documents)[number]) => {
    const values = decisions[document.id]?.verifiedFields ?? {};
    return Object.entries(values).some(
      ([field, value]) => value.trim() !== (document.extractedFields?.[field] ?? "").trim(),
    );
  };
  const correctionReasonsComplete = documents.every(
    (document) =>
      !hasChangedVerifiedFields(document) ||
      (decisions[document.id]?.correctionReason.trim().length ?? 0) > 0,
  );
  const effectiveField = (document: (typeof documents)[number], field: string) =>
    (decisions[document.id]?.verifiedFields?.[field]
      ?? document.reviewerVerifiedFields?.[field]
      ?? document.extractedFields?.[field]
      ?? "").trim();
  const identityTypes = new Set([
    "PASSPORT",
    "NATIONAL_ID_FRONT",
    "ALIEN_ID_FRONT",
  ]);
  const acceptedIdentityDocuments = documents.filter(
    (document) =>
      identityTypes.has(document.documentType) &&
      decisions[document.id]?.approved === true,
  );
  const identityEvidenceMissing =
    acceptedIdentityDocuments.length > 0 &&
    acceptedIdentityDocuments.every(
      (document) => !effectiveField(document, "documentNumber"),
    );
  const taxEvidenceRequired = selected?.kycCase.requirements.some(
    (requirement) => requirement.required && requirement.code === "TAX",
  );
  const acceptedTaxDocuments = documents.filter(
    (document) =>
      document.documentType === "KRA_PIN_CERTIFICATE" &&
      decisions[document.id]?.approved === true,
  );
  const taxEvidenceMissing =
    taxEvidenceRequired === true &&
    acceptedTaxDocuments.every(
      (document) => !effectiveField(document, "taxPin"),
    );
  const approvalEvidenceMessages = [
    identityEvidenceMissing
      ? "Enter the verified document number from the accepted identity document."
      : null,
    taxEvidenceMissing
      ? "Enter the verified KRA PIN from the accepted KRA PIN certificate."
      : null,
  ].filter((item): item is string => item !== null);

  const submitDecision = async (decision: "APPROVED" | "REJECTED") => {
    if (!selected?.kycCase.id || !allDecided) return;
    if (decision === "APPROVED" && hasRejected) {
      toast.error(
        "Resolve every rejected document before approving the account.",
      );
      return;
    }
    if (decision === "APPROVED" && approvalEvidenceMessages.length > 0) {
      toast.error(approvalEvidenceMessages.join(" "));
      return;
    }
    if (
      decision === "REJECTED" &&
      (!hasRejected || !rejectionReasonsComplete)
    ) {
      toast.error(
        "Select the inaccurate document and state what must be corrected.",
      );
      return;
    }
    setBusy(true);
    try {
      await reviewKyc(
        selected.kycCase.id,
        decision,
        notes.trim(),
        documents.map((document) => ({
          documentId: document.id,
          approved: decisions[document.id].approved === true,
          reason: decisions[document.id].reason.trim() || undefined,
          verifiedFields: decisions[document.id].verifiedFields,
          correctionReason:
            decisions[document.id].correctionReason.trim() || undefined,
        })),
      );
      toast.success(
        decision === "APPROVED"
          ? "KYC approved and the customer account activated."
          : "Only the inaccurate documents were returned for replacement.",
      );
      setSelectedCaseId(undefined);
      await load();
    } catch (error) {
      toast.error(message(error));
    } finally {
      setBusy(false);
    }
  };

  const rerunUploadChecks = async () => {
    if (!selected?.kycCase.id) return;
    setBusy(true);
    try {
      const result = await reprocessKycCase(selected.kycCase.id);
      toast.success(
        result.status === "IN_PROGRESS"
          ? "Upload checks found evidence that must be replaced. The customer can now correct it."
          : "Upload checks passed. The request remains ready for reviewer approval.",
      );
      setSelectedCaseId(undefined);
      await load();
    } catch (error) {
      toast.error(message(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 px-3 py-6">
      <header className="flex flex-col justify-between gap-4 rounded-3xl bg-[#071744] p-7 text-white md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-orange-300">
            Controlled operations
          </p>
          <h1 className="mt-2 text-3xl font-bold">Customer KYC requests</h1>
          <p className="mt-2 max-w-3xl text-white/70">
            Select a request, compare each protected original with its OCR
            data, and decide every document independently.
          </p>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh list
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric
          label="Awaiting decision"
          value={
            rows.filter((row) =>
              ["SUBMITTED", "REVIEW_REQUIRED"].includes(row.kycCase.status),
            ).length
          }
          icon={FileSearch}
        />
        <Metric
          label="Returned for correction"
          value={
            rows.filter((row) => row.kycCase.status === "REJECTED").length
          }
          icon={ShieldAlert}
        />
        <Metric
          label="Requests received"
          value={rows.length}
          icon={UserRoundSearch}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-56 items-center justify-center text-slate-500">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              Loading requests…
            </div>
          ) : rows.length === 0 ? (
            <p className="py-20 text-center text-slate-500">
              No KYC requests require attention.
            </p>
          ) : (
            <div className="divide-y">
              {rows.map((row) => (
                <div
                  key={row.kycCase.id}
                  className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-bold text-[#071744]">
                      {row.fullName || "Unnamed customer"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {row.email} · User #{row.userId}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-slate-500">
                      {row.kycCase.documents.length} current documents
                    </span>
                    <Badge
                      variant={
                        row.kycCase.status === "REJECTED"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {readable(row.kycCase.status)}
                    </Badge>
                    <Button variant="outline" onClick={() => openReview(row)}>
                      <FileSearch className="mr-2 h-4 w-4" />
                      {row.kycCase.status === "REJECTED"
                        ? "View correction"
                        : "Review request"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelectedCaseId(undefined)}
      >
        <DialogContent className="max-h-[94vh] max-w-[96vw] overflow-y-auto p-0 sm:max-w-6xl">
          {selected && (
            <>
              <DialogHeader className="border-b bg-slate-50 p-6 pr-14 text-left">
                <DialogTitle>
                  {selected.fullName || "Unnamed customer"}
                </DialogTitle>
                <DialogDescription>
                  {selected.email} · Review the OCR values against each
                  protected original.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 p-6">
                {pendingReview && (
                  <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold">Re-run production upload checks</p>
                      <p className="mt-1 text-blue-800">
                        Reprocesses the current files and returns blocking OCR or identity-field issues to the customer before approval.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 bg-white"
                      disabled={busy}
                      onClick={() => void rerunUploadChecks()}
                    >
                      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Re-run checks
                    </Button>
                  </div>
                )}
                {selected.kycCase.reviewNotes && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <b>Case note:</b> {selected.kycCase.reviewNotes}
                  </div>
                )}
                <div className="grid gap-4 lg:grid-cols-2">
                  {documents.map((document) => {
                    const fields = Object.entries(
                      document.extractedFields ?? {},
                    ).filter(([key]) => !key.startsWith("_"));
                    const warning =
                      document.extractedFields?._validationWarnings;
                    const issues = document.validationIssues ?? [];
                    const choice = decisions[document.id];
                    const editableFields = editableFieldsFor(document.documentType);
                    const hasCorrections = hasChangedVerifiedFields(document);
                    const isRecordedRejection = document.status === "REJECTED";
                    const isReviewerRejection = choice?.approved === false;
                    const isReviewerAcceptance = choice?.approved === true;
                    const needsReviewerAttention =
                      !isRecordedRejection && issues.length > 0;
                    const suggestedReason =
                      issues.length > 0
                        ? issues
                            .map(
                              (issue) =>
                                `${issue.message} ${issue.guidance}`.trim(),
                            )
                            .join(" ")
                        : document.rejectionReason ??
                          `The ${readable(document.documentType).toLowerCase()} is inaccurate or does not match this customer. Upload the correct original document.`;
                    return (
                      <article
                        key={document.id}
                        className={`rounded-2xl border p-5 ${
                          isRecordedRejection || isReviewerRejection
                            ? "border-red-300 bg-red-50/30"
                            : isReviewerAcceptance
                              ? "border-emerald-300 bg-emerald-50/30"
                              : needsReviewerAttention
                                ? "border-amber-300 bg-amber-50/30"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold">
                              {readable(document.documentType)}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              Quality{" "}
                              {document.qualityScore?.toFixed(1) ?? "checked"} ·
                              OCR{" "}
                              {document.ocrConfidence?.toFixed(1) ??
                                "not available"}
                              %
                            </p>
                          </div>
                          <Badge
                            variant={
                              isRecordedRejection || isReviewerRejection
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {isReviewerAcceptance
                              ? "Accepted by reviewer"
                              : isReviewerRejection
                                ? "Rejected by reviewer"
                                : needsReviewerAttention
                                  ? "Reviewer attention"
                                  : readable(document.status)}
                          </Badge>
                        </div>
                        {issues.length > 0 ? (
                          <div className="mt-3 space-y-2" aria-label="Document validation issues">
                            {issues.map((issue) => {
                              const isBlocking = isRecordedRejection || issue.blocking;
                              return (
                                <div
                                  key={`${issue.field}-${issue.code}-${issue.message}`}
                                  className={`rounded-lg border p-3 text-sm ${
                                    isBlocking
                                      ? "border-red-200 bg-red-50 text-red-900"
                                      : "border-amber-200 bg-amber-50 text-amber-950"
                                  }`}
                                >
                                  <p className="font-bold">
                                    {issue.field === "document" ? "Document" : readable(issue.field)}: {issue.message}
                                  </p>
                                  <p className={`mt-1 text-xs ${isBlocking ? "text-red-700" : "text-amber-800"}`}>
                                    {issue.guidance}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        ) : warning ? (
                          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{warning}</p>
                        ) : null}
                        <div className="mt-4">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                            OCR extracted data
                          </p>
                          {fields.length ? (
                            <dl className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
                              {fields.map(([key, value]) => (
                                (() => {
                                  const fieldIssues = issues.filter((issue) => issue.field === key);
                                  const hasBlockingFieldIssue =
                                    isRecordedRejection || fieldIssues.some((issue) => issue.blocking);
                                  return (
                                    <div
                                      key={key}
                                      className={`flex justify-between gap-4 rounded-lg border-b pb-2 last:border-0 last:pb-0 ${
                                        fieldIssues.length
                                          ? hasBlockingFieldIssue
                                            ? "border-red-300 bg-red-50 px-2 pt-2 text-red-900"
                                            : "border-amber-300 bg-amber-50 px-2 pt-2 text-amber-950"
                                          : "border-slate-200"
                                      }`}
                                    >
                                      <dt className={fieldIssues.length
                                        ? `font-bold ${hasBlockingFieldIssue ? "text-red-700" : "text-amber-800"}`
                                        : "text-slate-500"}
                                      >
                                        {readable(key)}
                                      </dt>
                                      <dd className="text-right font-semibold">
                                        {value}
                                        {document.extractedFields[`_confidence.${key}`]
                                          ? ` (${document.extractedFields[`_confidence.${key}`]}%)`
                                          : ""}
                                        {fieldIssues.map((issue) => (
                                          <span
                                            key={issue.code}
                                            className={`mt-1 block max-w-xs text-xs font-normal ${
                                              isRecordedRejection || issue.blocking
                                                ? "text-red-700"
                                                : "text-amber-800"
                                            }`}
                                          >
                                            {issue.message}
                                          </span>
                                        ))}
                                      </dd>
                                    </div>
                                  );
                                })()
                              ))}
                            </dl>
                          ) : (
                            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                              No structured value was extracted. Inspect the
                              original carefully.
                            </p>
                          )}
                        </div>
                        {editableFields.length > 0 && (pendingReview || Object.keys(document.reviewerVerifiedFields ?? {}).length > 0) && (
                          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-blue-900">
                              Reviewer-verified data
                            </p>
                            <p className="mt-1 text-xs text-blue-800">
                              Correct OCR transcription only after comparing the protected original. The OCR reading remains unchanged in the audit record.
                            </p>
                            <div className="mt-3 space-y-3">
                              {editableFields.map((field) => {
                                const ocrValue = document.extractedFields?.[field] ?? "";
                                const correctedValue = choice?.verifiedFields[field]
                                  ?? document.reviewerVerifiedFields?.[field]
                                  ?? ocrValue;
                                return (
                                  <div key={field} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
                                    <div>
                                      <p className="text-xs font-medium text-slate-500">OCR {readable(field)}</p>
                                      <p className="min-h-10 rounded-lg border bg-white px-3 py-2 text-sm">{ocrValue || "Not read"}</p>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-blue-900" htmlFor={`verified-${document.id}-${field}`}>
                                        Verified {readable(field)}
                                      </label>
                                      <Input
                                        id={`verified-${document.id}-${field}`}
                                        aria-label={`Verified ${readable(field)} for ${readable(document.documentType)}`}
                                        value={correctedValue}
                                        disabled={!pendingReview || choice?.approved === false}
                                        maxLength={255}
                                        onChange={(event) => setVerifiedField(document.id, field, event.target.value)}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {(hasCorrections || document.reviewerCorrectionReason) && (
                              <div className="mt-3">
                                <label className="text-xs font-bold text-blue-900" htmlFor={`correction-reason-${document.id}`}>
                                  Reason for OCR correction
                                </label>
                                <Textarea
                                  id={`correction-reason-${document.id}`}
                                  aria-label={`Reason for OCR correction on ${readable(document.documentType)}`}
                                  value={choice?.correctionReason ?? document.reviewerCorrectionReason ?? ""}
                                  disabled={!pendingReview || choice?.approved === false}
                                  maxLength={1000}
                                  onChange={(event) => setCorrectionReason(document.id, event.target.value)}
                                  placeholder="Explain what was misread and how you confirmed the correct value from the original."
                                />
                              </div>
                            )}
                            {document.reviewerVerifiedBy && document.reviewerVerifiedAt && (
                              <p className="mt-3 text-xs text-slate-500">
                                Verified by reviewer #{document.reviewerVerifiedBy} on {new Date(document.reviewerVerifiedAt).toLocaleString()}.
                              </p>
                            )}
                          </div>
                        )}
                        <KycDocumentViewer
                          document={document}
                          className="mt-4 w-full"
                        />
                        {pendingReview ? (
                          <div className="mt-4 space-y-3 border-t pt-4">
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                type="button"
                                variant={
                                  choice?.approved === true
                                    ? "default"
                                    : "outline"
                                }
                                className={
                                  choice?.approved === true
                                    ? "bg-emerald-600 hover:bg-emerald-700"
                                    : ""
                                }
                                onClick={() =>
                                  setDocumentDecision(document.id, true)
                                }
                                disabled={isRecordedRejection}
                                title={
                                  isRecordedRejection
                                    ? "This upload failed the production guard and must be replaced or reprocessed before it can be accepted."
                                    : undefined
                                }
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                {isRecordedRejection
                                  ? "Replacement required"
                                  : "Accept document"}
                              </Button>
                              <Button
                                type="button"
                                variant={
                                  choice?.approved === false
                                    ? "destructive"
                                    : "outline"
                                }
                                onClick={() =>
                                  setDocumentDecision(
                                    document.id,
                                    false,
                                    suggestedReason,
                                  )
                                }
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject document
                              </Button>
                            </div>
                            {choice?.approved === false && (
                              <Textarea
                                aria-label={`Correction reason for ${readable(document.documentType)}`}
                                value={choice.reason}
                                onChange={(event) =>
                                  setReason(document.id, event.target.value)
                                }
                                placeholder="Explain exactly what is inaccurate or unreadable and what the customer must replace."
                              />
                            )}
                          </div>
                        ) : document.rejectionReason ? (
                          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                            <b>Correction requested:</b>{" "}
                            {document.rejectionReason}
                          </p>
                        ) : null}
                      </article>
                    );
                  })}
                </div>

                {pendingReview && (
                  <div className="space-y-4 rounded-2xl border bg-slate-50 p-5">
                    <div>
                      <label
                        htmlFor="case-notes"
                        className="text-sm font-bold"
                      >
                        Overall review note (optional)
                      </label>
                      <Textarea
                        id="case-notes"
                        className="mt-2 bg-white"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Add a concise case-level note. Document-specific correction reasons are captured above."
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1 text-sm">
                        {undecidedDocuments.length > 0 && (
                          <p className="text-amber-800">
                            {undecidedDocuments.length} document
                            {undecidedDocuments.length === 1 ? "" : "s"} still
                            {undecidedDocuments.length === 1 ? " needs" : " need"} a decision.
                          </p>
                        )}
                        {rejectedWithoutReason.length > 0 && (
                          <p className="text-red-700">
                            Add a correction reason for: {rejectedWithoutReason
                              .map((document) => readable(document.documentType))
                              .join(", ")}.
                          </p>
                        )}
                        {!correctionReasonsComplete && (
                          <p className="text-red-700">
                            Explain every OCR correction before approval.
                          </p>
                        )}
                        {approvalEvidenceMessages.map((evidenceMessage) => (
                          <p key={evidenceMessage} className="text-red-700">
                            {evidenceMessage}
                          </p>
                        ))}
                      </div>
                      {undecidedDocuments.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={acceptRemainingDocuments}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Accept all remaining documents
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button
                        variant="destructive"
                        disabled={
                          busy ||
                          !allDecided ||
                          !hasRejected ||
                          !rejectionReasonsComplete
                        }
                        onClick={() => void submitDecision("REJECTED")}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Request document correction
                      </Button>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={
                          busy ||
                          !allDecided ||
                          hasRejected ||
                          !correctionReasonsComplete ||
                          approvalEvidenceMessages.length > 0 ||
                          !selected.kycCase.phoneVerified ||
                          selected.kycCase.missingRequirementCodes.length > 0
                        }
                        onClick={() => void submitDecision("APPROVED")}
                      >
                        {busy && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve KYC and activate
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof FileSearch;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-5">
        <div className="rounded-xl bg-orange-50 p-3 text-[#EF4217]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-[#071744]">{value}</p>
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
