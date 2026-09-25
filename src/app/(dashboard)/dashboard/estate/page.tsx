"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EstateOperationsPanel } from "@/components/estate/EstateOperationsPanel";
import RequireRole from "@/components/auth/RequireRole";
import { apiErrorMessage } from "@/lib/api-error";
import {
  usePagedBusinessProperties,
  usePagedBusinessUnits,
} from "@/hooks/usePagedBusinessOptions";
import { usePagedEstateRecords } from "@/hooks/usePagedEstateRecords";
import { estateService } from "@/services/business-workflows.service";
import { estateSetupService } from "@/services/estate-setup.service";
import { useAuthStore } from "@/store/authStore";
import {
  EstateServiceCharge,
  PropertyOwnership,
} from "@/types/business-workflows";
import { createEmailOccupantInvite } from "@/lib/api";
import PropertyAccountsSheet from "@/components/property/PropertyAccountsSheet";
import { LateFeePolicySetup } from "@/components/billing/LateFeePolicySetup";

const estateRoles = [
  "EstateManager",
  "EstateOperationsManager",
  "WorkspaceAdmin",
  "PropertyAccountant",
  "WorkspaceViewer",
  "SecuritySupervisor",
  "Homeowner",
];
type EstateSection = "overview" | "homeowners" | "billing" | "operations";
function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export default function EstatePage() {
  const role = useAuthStore((state) => state.activeRole);
  const token = useAuthStore((state) => state.token);
  const workspace = useAuthStore((state) => state.activeWorkspaceId);
  return (
    <RequireRole roles={estateRoles} permissions={["view_estate"]}>
      <EstateWorkspace key={`${token}:${role?.title}:${workspace}`} />
    </RequireRole>
  );
}
function EstateWorkspace() {
  const searchParams = useSearchParams();
  const permissions = useAuthStore((state) => state.permissions);
  const token = useAuthStore((state) => state.token);
  const scopedPropertyIds = useAuthStore((state) => state.propertyIds);
  const isHomeowner = useAuthStore(
    (state) => state.activeRole?.title === "Homeowner",
  );
  const isEstateBiller = useAuthStore(
    (state) => state.activeRole?.title === "EstateManager",
  );
  const canViewCharges = permissions.includes("view_service_charge");
  const canViewInvoices = permissions.includes("view_invoice_list");
  const canManage = permissions.includes("manage_estate");
  const canSelectEstate = !isHomeowner && permissions.includes("view_estate");
  const canCharge = permissions.includes("create_service_charge");
  const requestedPropertyId = Number(searchParams.get("propertyId"));
  const requestedUnitId = Number(searchParams.get("unitId"));
  const hasSelectedUnitLink =
    Number.isSafeInteger(requestedPropertyId) &&
    requestedPropertyId > 0 &&
    Number.isSafeInteger(requestedUnitId) &&
    requestedUnitId > 0;
  const initialPropertyId =
    Number.isSafeInteger(requestedPropertyId) &&
    scopedPropertyIds.includes(requestedPropertyId)
      ? String(requestedPropertyId)
      : "all";

  const [propertyFilter, setPropertyFilter] = useState(initialPropertyId);
  const [ownershipSearch, setOwnershipSearch] = useState("");
  const [assignmentUnitId, setAssignmentUnitId] = useState(
    hasSelectedUnitLink ? String(requestedUnitId) : "",
  );
  const [homeownerEmail, setHomeownerEmail] = useState("");
  const [agreementEffectiveDate, setAgreementEffectiveDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [receivingAccountOpen, setReceivingAccountOpen] = useState(false);
  const [receivingAccountReady, setReceivingAccountReady] = useState<
    boolean | null
  >(null);
  const [receivingAccountRevision, setReceivingAccountRevision] = useState(0);
  const [endingOwnership, setEndingOwnership] =
    useState<PropertyOwnership | null>(null);
  const [endDate, setEndDate] = useState(today());
  const [endReason, setEndReason] = useState("");
  const [chargeOwnershipId, setChargeOwnershipId] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeCurrency, setChargeCurrency] = useState("KES");
  const [chargeDue, setChargeDue] = useState(today());
  const [chargeDescription, setChargeDescription] = useState("Service charge");
  const [activeSection, setActiveSection] = useState<EstateSection>("overview");
  const queryScopeApplied = useRef(false);
  const propertyOptions = usePagedBusinessProperties(
    canSelectEstate && Boolean(token),
    undefined,
    [],
    "SERVICE_CHARGE",
    hasSelectedUnitLink ? requestedPropertyId : undefined,
  );
  const properties = propertyOptions.items;
  const propertiesLoading = propertyOptions.loading;
  const effectivePropertyFilter =
    !propertiesLoading &&
    propertyFilter !== "all" &&
    !properties.some((property) => property.id === Number(propertyFilter))
      ? "all"
      : propertyFilter;
  const unitOptions = usePagedBusinessUnits(
    canManage && (activeSection === "overview" || activeSection === "billing"),
    effectivePropertyFilter === "all" ? null : Number(effectivePropertyFilter),
    "SERVICE_CHARGE",
    true,
    hasSelectedUnitLink ? requestedUnitId : undefined,
  );
  const units = unitOptions.items;

  useEffect(() => {
    if (propertyOptions.error)
      toast.error(
        apiErrorMessage(
          propertyOptions.error,
          "Could not load your estate properties.",
        ),
      );
  }, [propertyOptions.error]);
  useEffect(() => {
    if (unitOptions.error)
      toast.error(
        apiErrorMessage(
          unitOptions.error,
          "Could not load homes for this estate.",
        ),
      );
  }, [unitOptions.error]);

  useEffect(() => {
    if (
      !queryScopeApplied.current &&
      Number.isSafeInteger(requestedPropertyId) &&
      properties.some((property) => property.id === requestedPropertyId)
    ) {
      queryScopeApplied.current = true;
      setPropertyFilter(String(requestedPropertyId));
    }
  }, [properties, requestedPropertyId]);

  useEffect(() => {
    if (
      hasSelectedUnitLink &&
      units.some((unit) => unit.unitId === requestedUnitId)
    ) {
      setAssignmentUnitId(String(requestedUnitId));
    }
  }, [hasSelectedUnitLink, requestedUnitId, units]);

  const propertyId =
    effectivePropertyFilter === "all"
      ? undefined
      : Number(effectivePropertyFilter);
  useEffect(() => {
    let current = true;
    if (!canManage || activeSection !== "overview" || !propertyId) {
      setReceivingAccountReady(null);
      return () => {
        current = false;
      };
    }
    setReceivingAccountReady(null);
    estateSetupService
      .status(propertyId)
      .then((response) => {
        if (current)
          setReceivingAccountReady(response.data.data.billingConfigured);
      })
      .catch(() => {
        if (current) setReceivingAccountReady(null);
      });
    return () => {
      current = false;
    };
  }, [activeSection, canManage, propertyId, receivingAccountRevision]);
  useEffect(() => {
    function sectionFromHash() {
      const hash = window.location.hash.slice(1);
      if (hash === "homeowners" || hash === "billing" || hash === "operations")
        setActiveSection(hash);
      else if (hash === "onboard-homeowner" || hash === "setup")
        setActiveSection("overview");
    }
    sectionFromHash();
    window.addEventListener("hashchange", sectionFromHash);
    return () => window.removeEventListener("hashchange", sectionFromHash);
  }, []);
  function selectSection(section: EstateSection) {
    setActiveSection(section);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#${section}`,
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const registry = usePagedEstateRecords<PropertyOwnership>(
    "/estate/ownership",
    Boolean(token) && activeSection === "homeowners",
    propertyId,
    undefined,
    ownershipSearch,
  );
  const currentEnabled =
    Boolean(token) &&
    ["overview", "homeowners", "billing", "operations"].includes(activeSection);
  const current = usePagedEstateRecords<PropertyOwnership>(
    "/estate/ownership",
    currentEnabled,
    propertyId,
    true,
  );
  const billingEnabled =
    Boolean(token) &&
    canViewCharges &&
    (activeSection === "billing" ||
      (isHomeowner && activeSection === "overview"));
  const billing = usePagedEstateRecords<EstateServiceCharge>(
    "/estate/service-charges",
    billingEnabled,
    propertyId,
  );
  const items = registry.items;
  const charges = billing.items;
  async function load() {
    await Promise.all([registry.reload(), current.reload(), billing.reload()]);
  }
  function changeEstate(value: string) {
    setPropertyFilter(value);
    setAssignmentUnitId("");
    setChargeOwnershipId("");
    setHomeownerEmail("");
    setAgreementEffectiveDate(today());
    setChargeAmount("");
    setEndingOwnership(null);
    setEndReason("");
  }

  async function inviteHomeowner(event: FormEvent) {
    event.preventDefault();
    const selectedUnit = units.find(
      (unit) => unit.unitId === Number(assignmentUnitId),
    );
    if (
      !token ||
      !selectedUnit ||
      !homeownerEmail.trim() ||
      !agreementEffectiveDate
    )
      return;
    setBusy(true);
    try {
      await createEmailOccupantInvite(
        {
          inviteType: "HOMEOWNER",
          entityId: selectedUnit.unitId,
          email: homeownerEmail.trim(),
          leaseStartDate: agreementEffectiveDate,
        },
        token,
      );
      setReceivingAccountReady(true);
      toast.success(
        "Homeowner invitation sent. The secure link works for both new and existing SlickHood users.",
      );
      setHomeownerEmail("");
      if (!hasSelectedUnitLink) setAssignmentUnitId("");
      setAgreementEffectiveDate(today());
      await load();
    } catch (error: unknown) {
      const responseCode = (
        error as { response?: { data?: { code?: string } } }
      )?.response?.data?.code;
      if (responseCode === "S00361") {
        setReceivingAccountReady(false);
        setReceivingAccountOpen(true);
        toast.error("No payment-ready account is connected to this estate.", {
          description:
            "Open the account shown here, complete setup if needed, then attach it to the selected estate.",
        });
      } else {
        toast.error(
          apiErrorMessage(error, "Could not send the homeowner invitation."),
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function endOwnership(event: FormEvent) {
    event.preventDefault();
    if (!endingOwnership) return;
    setBusy(true);
    try {
      await estateService.endOwnership(endingOwnership.id, {
        endDate,
        reason: endReason.trim(),
      });
      toast.success(
        "Ownership ended, history retained, and the homeowner notification queued.",
      );
      setEndingOwnership(null);
      setEndReason("");
      await load();
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, "Could not end ownership."));
    } finally {
      setBusy(false);
    }
  }

  async function createCharge(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await estateService.createServiceCharge({
        ownershipId: Number(chargeOwnershipId),
        amount: Number(chargeAmount),
        currency: chargeCurrency,
        dueDate: chargeDue,
        description: chargeDescription.trim(),
      });
      toast.success("Service-charge invoice created.");
      setChargeAmount("");
      await load();
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, "Could not create service charge."));
    } finally {
      setBusy(false);
    }
  }

  const currentOwnerships = current.items.filter((item) => item.active);
  const selectedAssignmentUnit = units.find(
    (unit) => unit.unitId === Number(assignmentUnitId),
  );
  const selectedEstateProperty = properties.find(
    (property) => property.id === propertyId,
  );
  const ownershipByUnit = new Map(
    currentOwnerships
      .filter((item) => item.unitId)
      .map((item) => [item.unitId, item]),
  );
  const overdue = charges.filter((charge) => charge.status === "OVERDUE");
  const outstandingByCurrency = Object.entries(
    charges
      .filter((charge) => !charge.paid)
      .reduce<Record<string, number>>((totals, charge) => {
        totals[charge.currency] =
          (totals[charge.currency] ?? 0) + charge.pendingAmount;
        return totals;
      }, {}),
  );
  const outstandingLabel =
    outstandingByCurrency.length === 0
      ? "KES 0.00"
      : outstandingByCurrency
          .map(
            ([currency, amount]) =>
              `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          )
          .join(" · ");
  const estatePropertyIds = Array.from(
    new Set([
      ...currentOwnerships.map((item) => item.propertyId),
      ...(canSelectEstate ? properties.map((property) => property.id) : []),
    ]),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-[#EF4217]">
            SlickHood Estates
          </p>
          <h1 className="mt-1 text-3xl font-bold">
            {!isHomeowner ? "Estate Management" : "My Home"}
          </h1>
          <p className="text-muted-foreground">
            {canManage
              ? "Manage homeowner onboarding, ownership history, service charges and estate operations."
              : "View your homes, service charges, balances and payment documents."}
          </p>
        </div>
        {canSelectEstate && !hasSelectedUnitLink && (
          <div className="w-full sm:w-80">
            <Label id="estate-filter-label" htmlFor="estate-filter">
              Estate
            </Label>
            <Input
              className="mb-2"
              value={propertyOptions.search}
              onChange={(event) =>
                propertyOptions.setSearch(event.target.value)
              }
              placeholder="Search estates…"
            />
            <Select
              value={effectivePropertyFilter}
              onValueChange={changeEstate}
              disabled={busy || (propertiesLoading && properties.length === 0)}
            >
              <SelectTrigger
                id="estate-filter"
                aria-labelledby="estate-filter-label"
              >
                <SelectValue
                  placeholder={
                    propertiesLoading ? "Loading estates…" : "Select an estate"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All estates</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={String(property.id)}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {propertyOptions.hasMore && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={propertyOptions.loadMore}
                disabled={propertiesLoading}
              >
                Load more estates
              </Button>
            )}
            {!propertiesLoading && properties.length === 0 && (
              <p className="mt-2 text-sm text-amber-700">
                No estates with homeowner units are available. Create or change
                a unit to Homeowner / Service Charge first.
              </p>
            )}
          </div>
        )}
      </div>

      <Card className="sticky top-0 z-20 border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <CardContent className="flex flex-wrap gap-2 p-3">
          <Button
            type="button"
            size="sm"
            variant={activeSection === "overview" ? "default" : "ghost"}
            onClick={() => selectSection("overview")}
          >
            {isHomeowner ? "Home overview" : "Setup & onboarding"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeSection === "homeowners" ? "default" : "ghost"}
            onClick={() => selectSection("homeowners")}
          >
            {isHomeowner ? "My homes" : "Homeowners"}
          </Button>
          {(canViewCharges || canCharge) && (
            <Button
              type="button"
              size="sm"
              variant={activeSection === "billing" ? "default" : "ghost"}
              onClick={() => selectSection("billing")}
            >
              Charges & payments
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant={activeSection === "operations" ? "default" : "ghost"}
            onClick={() => selectSection("operations")}
          >
            Estate operations
          </Button>
          {!isHomeowner && (
            <>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/dashboard/estate/homeowner-units">Units</Link>
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/dashboard/team-access">Estate team</Link>
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/dashboard/documents">Documents & notices</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {activeSection === "overview" && isHomeowner && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Current ownerships</CardDescription>
              <CardTitle>
                {current.loading
                  ? "Loading…"
                  : current.error
                    ? "Unavailable"
                    : current.total}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                Outstanding balance (loaded charges)
              </CardDescription>
              <CardTitle>
                {billing.loading
                  ? "Loading…"
                  : billing.error
                    ? "Unavailable"
                    : outstandingLabel}
              </CardTitle>
            </CardHeader>
            {billing.error && (
              <CardContent className="pt-0">
                <Button size="sm" variant="outline" onClick={billing.retry}>
                  Retry service charges
                </Button>
              </CardContent>
            )}
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Overdue charges (loaded)</CardDescription>
              <CardTitle
                className={overdue.length ? "text-red-600" : "text-emerald-600"}
              >
                {billing.loading
                  ? "Loading…"
                  : billing.error
                    ? "Unavailable"
                    : overdue.length}
              </CardTitle>
            </CardHeader>
            {!billing.loading && !billing.error && overdue.length > 0 && (
              <CardContent className="pt-0">
                <Badge
                  variant="outline"
                  className="border-red-200 bg-red-50 text-red-700"
                >
                  OVERDUE
                </Badge>
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {activeSection === "overview" && canManage && (
        <Card id="setup" className="border-orange-200">
          <CardHeader>
            <CardTitle>Estate readiness</CardTitle>
            <CardDescription>
              Select one estate and confirm its agreement, receiving account and
              team before onboarding homeowners.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-white p-4">
              <p className="font-semibold">1. Estate agreement</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Review the approved agreement standard. SlickHood freezes it
                when the invitation is sent.
              </p>
              <Button className="mt-3" size="sm" variant="outline" asChild>
                <Link href="/dashboard/documents?view=templates&type=ESTATE_RESIDENTIAL_AGREEMENT">
                  Review agreement
                </Link>
              </Button>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">2. Receiving account</p>
                {selectedEstateProperty && (
                  <Badge
                    variant={receivingAccountReady ? "default" : "outline"}
                    className={
                      receivingAccountReady
                        ? "bg-emerald-600"
                        : receivingAccountReady === false
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : ""
                    }
                  >
                    {receivingAccountReady === true
                      ? "Connected & ready"
                      : receivingAccountReady === false
                        ? "Connection required"
                        : "Checking…"}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Active and Ready for payments are separate states. The Ready
                account must also be connected to this estate.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!selectedEstateProperty}
                  onClick={() => setReceivingAccountOpen(true)}
                >
                  {selectedEstateProperty
                    ? receivingAccountReady
                      ? `Review account for ${selectedEstateProperty.name}`
                      : `Connect account to ${selectedEstateProperty.name}`
                    : "Select an estate first"}
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link href="/dashboard/estate/accounts">Manage accounts</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="font-semibold">3. Estate team</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Give managers and operational staff only the access required for
                this estate.
              </p>
              <Button className="mt-3" size="sm" variant="outline" asChild>
                <Link href="/dashboard/team-access">Manage estate team</Link>
              </Button>
            </div>
            {effectivePropertyFilter === "all" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 md:col-span-3">
                <strong>Select one estate above to continue setup.</strong> The
                all-estates view is for reviewing records; account checks and
                homeowner onboarding need one selected estate.
              </div>
            )}
            {isEstateBiller && (
              <div className="md:col-span-3">
                <LateFeePolicySetup billingType="SERVICE_CHARGE" compact />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeSection === "overview" && canManage && (
        <Card id="onboard-homeowner">
          <CardHeader>
            <CardTitle>Onboard a homeowner</CardTitle>
            <CardDescription>
              {hasSelectedUnitLink
                ? "The selected home is fixed. Enter the homeowner email and agreement effective date, then send."
                : "Choose the home, enter the homeowner's email and agreement date, then send. Existing users sign in; new users register and complete KYC from the same secure link."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={inviteHomeowner}
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            >
              {!hasSelectedUnitLink && (
                <div className="space-y-2">
                  <Label id="assignment-home-label" htmlFor="assignment-home">
                    Homeowner unit
                  </Label>
                  <Input
                    value={unitOptions.search}
                    onChange={(event) =>
                      unitOptions.setSearch(event.target.value)
                    }
                    placeholder="Search home reference…"
                  />
                  <Select
                    value={assignmentUnitId}
                    onValueChange={setAssignmentUnitId}
                    disabled={unitOptions.loading && units.length === 0}
                  >
                    <SelectTrigger
                      id="assignment-home"
                      aria-labelledby="assignment-home-label"
                    >
                      <SelectValue
                        placeholder={
                          unitOptions.loading
                            ? "Loading homeowner units…"
                            : "Select a homeowner unit"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem
                          key={unit.unitId}
                          value={String(unit.unitId)}
                          disabled={ownershipByUnit.has(unit.unitId)}
                        >
                          {properties.find(
                            (property) => property.id === unit.propertyId,
                          )?.name ?? `Estate #${unit.propertyId}`}{" "}
                          / {unit.ref}
                          {ownershipByUnit.has(unit.unitId)
                            ? " · Assigned"
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {unitOptions.hasMore && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={unitOptions.loadMore}
                      disabled={unitOptions.loading}
                    >
                      Load more homes
                    </Button>
                  )}
                  {!unitOptions.loading && units.length === 0 && (
                    <p className="text-sm text-amber-700">
                      No homeowner units are configured. Create or change a unit
                      to Homeowner / Service Charge first.
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="homeowner-email">Homeowner email</Label>
                <Input
                  id="homeowner-email"
                  required
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={homeownerEmail}
                  onChange={(event) => setHomeownerEmail(event.target.value)}
                  placeholder="homeowner@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agreement-effective-date">
                  Agreement effective date
                </Label>
                <Input
                  id="agreement-effective-date"
                  required
                  type="date"
                  max={today()}
                  value={agreementEffectiveDate}
                  onChange={(event) =>
                    setAgreementEffectiveDate(event.target.value)
                  }
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  className="w-full bg-[#EF4217]"
                  disabled={
                    busy ||
                    effectivePropertyFilter === "all" ||
                    !selectedAssignmentUnit ||
                    !homeownerEmail.trim() ||
                    !agreementEffectiveDate
                  }
                >
                  {busy ? "Sending…" : "Send invitation & agreement"}
                </Button>
              </div>
              {selectedAssignmentUnit && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 md:col-span-2 lg:col-span-4">
                  <p className="font-semibold">Selected homeowner unit</p>
                  <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <p>
                      <span className="text-muted-foreground">Estate</span>
                      <br />
                      <strong>
                        {properties.find(
                          (property) =>
                            property.id === selectedAssignmentUnit.propertyId,
                        )?.name ??
                          `Estate #${selectedAssignmentUnit.propertyId}`}
                      </strong>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Home</span>
                      <br />
                      <strong>{selectedAssignmentUnit.ref}</strong>
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        Type and size
                      </span>
                      <br />
                      <strong>
                        {selectedAssignmentUnit.unitType
                          ?.toLowerCase()
                          .replaceAll("_", " ") ?? "Not recorded"}
                        {selectedAssignmentUnit.size
                          ? ` · ${selectedAssignmentUnit.size.toLocaleString()} ${selectedAssignmentUnit.measurementUnits?.name ?? ""}`
                          : ""}
                      </strong>
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        Service charge basis
                      </span>
                      <br />
                      <strong>
                        {selectedAssignmentUnit.currency ?? "KES"}{" "}
                        {selectedAssignmentUnit.price?.toLocaleString() ??
                          "Not set"}
                      </strong>
                    </p>
                  </div>
                </div>
              )}
              {hasSelectedUnitLink &&
                !unitOptions.loading &&
                !selectedAssignmentUnit && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 md:col-span-2 lg:col-span-4"
                  >
                    This homeowner unit could not be loaded. Return to the unit
                    and start homeowner onboarding again.
                  </div>
                )}
            </form>
          </CardContent>
        </Card>
      )}

      {activeSection === "homeowners" && (
        <Card id="homeowners" className="scroll-mt-24">
          <CardHeader>
            <CardTitle>{isHomeowner ? "My homes" : "Homeowners"}</CardTitle>
            <CardDescription>
              {isHomeowner
                ? "Your current and previous homes, agreements and billing in one place."
                : "Search the homeowner directory. Current and historical ownership records remain available for audit and financial continuity."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isHomeowner && (
              <div className="flex max-w-xl gap-2">
                <Input
                  aria-label="Search homeowners"
                  value={ownershipSearch}
                  onChange={(event) => setOwnershipSearch(event.target.value)}
                  placeholder="Search name, email, estate or home…"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOwnershipSearch("")}
                  disabled={!ownershipSearch}
                >
                  Clear
                </Button>
              </div>
            )}
            {!registry.loading && !registry.error && items.length === 0 && (
              <p className="py-8 text-center text-muted-foreground">
                {ownershipSearch
                  ? "No homeowners match your search."
                  : "No ownership records in this scope."}
              </p>
            )}
            <RecordControls feed={registry} label="ownership records" />
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>
                      {isHomeowner
                        ? `${item.propertyName}${item.unitRef ? ` / ${item.unitRef}` : ""}`
                        : item.homeownerName || item.homeownerEmail}
                    </strong>
                    <Badge variant={item.active ? "default" : "outline"}>
                      {item.active ? "Current" : "Historical"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {!isHomeowner && `${item.homeownerEmail} · `}
                    {item.propertyName}
                    {item.unitRef ? ` / ${item.unitRef}` : ""} ·{" "}
                    {item.ownershipStart}
                    {item.ownershipEnd
                      ? ` to ${item.ownershipEnd}`
                      : " to present"}
                  </p>
                  {item.terminationReason && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Reason: {item.terminationReason}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.unitId && (
                    <Button size="sm" variant="outline" asChild>
                      <Link
                        href={`/dashboard/unit/details/${item.unitId}?p=${item.propertyId}&from=homeowner-units`}
                      >
                        View unit
                      </Link>
                    </Button>
                  )}
                  {permissions.includes("view_lease_document") && (
                    <Button size="sm" variant="outline" asChild>
                      <Link
                        href={`/dashboard/documents?propertyId=${item.propertyId}${item.unitId ? `&unitId=${item.unitId}` : ""}&type=ESTATE_RESIDENTIAL_AGREEMENT`}
                      >
                        View agreement
                      </Link>
                    </Button>
                  )}
                  {isHomeowner && canViewInvoices && (
                    <Button size="sm" asChild>
                      <Link
                        href={`/dashboard/invoices?propertyId=${item.propertyId}${item.unitId ? `&unitId=${item.unitId}` : ""}`}
                      >
                        Bills & payments
                      </Link>
                    </Button>
                  )}
                  {canManage && item.active && (
                    <>
                      {permissions.includes("create_lease_document") && (
                        <Button size="sm" asChild>
                          <Link
                            href={`/dashboard/documents?view=templates&propertyId=${item.propertyId}&recipientUserId=${item.homeownerUserId}&ownershipId=${item.id}${item.unitId ? `&unitId=${item.unitId}` : ""}&effectiveDate=${item.ownershipStart}&type=ESTATE_RESIDENTIAL_AGREEMENT`}
                          >
                            Prepare agreement
                          </Link>
                        </Button>
                      )}
                      {permissions.includes("edit_unit") && item.unitId && (
                        <Button size="sm" asChild>
                          <Link
                            href={`/dashboard/unit/details/${item.unitId}?p=${item.propertyId}&from=homeowner-units`}
                          >
                            Manage unit
                          </Link>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEndingOwnership(item);
                          setEndDate(today());
                        }}
                      >
                        End ownership
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeSection === "billing" && canCharge && (
        <Card>
          <CardHeader>
            <CardTitle>Create service charge</CardTitle>
            <CardDescription>
              Create a real invoice for a current homeowner. Confirm the
              homeowner, currency and amount before creating an invoice.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecordControls feed={current} label="current homeowners" />
            <form onSubmit={createCharge} className="grid gap-4 md:grid-cols-5">
              <div>
                <Label id="charge-homeowner-label">Homeowner / home</Label>
                <Select
                  value={chargeOwnershipId}
                  disabled={
                    busy ||
                    current.loading ||
                    Boolean(current.error) ||
                    currentOwnerships.length === 0
                  }
                  onValueChange={(value) => {
                    setChargeOwnershipId(value);
                    const selected = currentOwnerships.find(
                      (item) => item.id === Number(value),
                    );
                    const unit = units.find(
                      (candidate) => candidate.unitId === selected?.unitId,
                    );
                    if (unit?.currency) setChargeCurrency(unit.currency);
                  }}
                >
                  <SelectTrigger aria-labelledby="charge-homeowner-label">
                    <SelectValue
                      placeholder={
                        current.loading
                          ? "Loading current homeowners…"
                          : "Select current ownership"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {currentOwnerships
                      .filter((item) => item.unitId)
                      .map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.homeownerName || item.homeownerEmail} ·{" "}
                          {item.propertyName} / {item.unitRef}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={chargeAmount}
                  onChange={(event) => setChargeAmount(event.target.value)}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input
                  required
                  maxLength={3}
                  value={chargeCurrency}
                  onChange={(event) =>
                    setChargeCurrency(event.target.value.toUpperCase())
                  }
                />
              </div>
              <div>
                <Label>Due date</Label>
                <Input
                  required
                  type="date"
                  value={chargeDue}
                  onChange={(event) => setChargeDue(event.target.value)}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  required
                  maxLength={255}
                  value={chargeDescription}
                  onChange={(event) => setChargeDescription(event.target.value)}
                />
              </div>
              <div className="md:col-span-5">
                <Button
                  disabled={
                    busy ||
                    current.loading ||
                    !currentOwnerships.some(
                      (item) => String(item.id) === chargeOwnershipId,
                    ) ||
                    !chargeDescription.trim()
                  }
                >
                  Create invoice
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeSection === "billing" && canViewCharges && (
        <Card>
          <CardHeader>
            <CardTitle>Service charges</CardTitle>
            <CardDescription>
              Balances update only after verified payment reconciliation. Open
              an outstanding bill to pay it or a paid bill to view its receipt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <RecordControls feed={billing} label="service charges" />
            {!billing.loading && !billing.error && charges.length === 0 && (
              <p className="py-6 text-center text-muted-foreground">
                No service charges for this role.
              </p>
            )}
            {charges.map((charge) => (
              <div
                key={charge.id}
                className="flex flex-col justify-between gap-3 rounded border p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>
                      {charge.currency}{" "}
                      {(charge.paid
                        ? charge.amount
                        : charge.pendingAmount
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      {charge.paid ? "paid" : "outstanding"}
                    </strong>
                    <Badge
                      variant={charge.status === "PAID" ? "default" : "outline"}
                      className={
                        charge.status === "OVERDUE"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : charge.status === "PAID"
                            ? "bg-emerald-600"
                            : ""
                      }
                    >
                      {charge.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {charge.description} · {charge.propertyName} /{" "}
                    {charge.unitRef} · Due {charge.dueDate} ·{" "}
                    {charge.invoiceRef}
                  </p>
                </div>
                {canViewInvoices && (
                  <Button
                    asChild
                    size="sm"
                    variant={charge.paid ? "outline" : "default"}
                  >
                    <Link
                      href={`/dashboard/invoices?invoiceId=${charge.invoiceId}`}
                    >
                      {charge.paid ? "View receipt" : "Pay now"}
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeSection === "operations" && (
        <EstateOperationsPanel
          key={effectivePropertyFilter}
          properties={estatePropertyIds
            .filter((id) => propertyId === undefined || id === propertyId)
            .map((id) => ({
              id,
              name:
                properties.find((property) => property.id === id)?.name ??
                currentOwnerships.find((item) => item.propertyId === id)
                  ?.propertyName ??
                `Property #${id}`,
            }))}
          canManage={canManage}
        />
      )}
      {selectedEstateProperty && (
        <PropertyAccountsSheet
          propertyId={selectedEstateProperty.id}
          propertyName={selectedEstateProperty.name}
          open={receivingAccountOpen}
          onOpenChange={setReceivingAccountOpen}
          allowedCategories={["ESTATE_MANAGEMENT"]}
          createAccountHref="/dashboard/estate/accounts"
          onAccountsChanged={() =>
            setReceivingAccountRevision((value) => value + 1)
          }
        />
      )}
      <Dialog
        open={Boolean(endingOwnership)}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setEndingOwnership(null);
            setEndReason("");
          }
        }}
      >
        <DialogContent>
          <form onSubmit={endOwnership} className="space-y-4">
            <DialogHeader>
              <DialogTitle>End ownership</DialogTitle>
              <DialogDescription>
                This immediately removes homeowner access while preserving
                ownership and financial history. The homeowner will be notified.
              </DialogDescription>
            </DialogHeader>
            <div>
              <Label htmlFor="ownership-end-date">End date</Label>
              <Input
                id="ownership-end-date"
                required
                type="date"
                min={endingOwnership?.ownershipStart}
                max={today()}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ownership-end-reason">Reason</Label>
              <Textarea
                id="ownership-end-reason"
                required
                maxLength={500}
                value={endReason}
                onChange={(event) => setEndReason(event.target.value)}
                placeholder="For example: property sale completed"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setEndingOwnership(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={busy || !endReason.trim()}
              >
                End ownership
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecordControls({
  feed,
  label,
}: {
  feed: {
    loading: boolean;
    error: unknown;
    hasMore: boolean;
    total: number;
    items: unknown[];
    reload: () => Promise<void>;
    loadMore: () => Promise<void>;
  };
  label: string;
}) {
  return (
    <div className="mb-3 space-y-2">
      {feed.loading && <p role="status">Loading {label}…</p>}
      {!!feed.error && (
        <p role="alert" className="text-red-700">
          {apiErrorMessage(feed.error, `Could not load ${label}.`)}{" "}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void feed.reload()}
          >
            Retry {label}
          </Button>
        </p>
      )}
      {feed.hasMore && (
        <Button
          type="button"
          variant="outline"
          disabled={feed.loading}
          onClick={() => void feed.loadMore()}
        >
          Load more {label} ({feed.items.length} of {feed.total})
        </Button>
      )}
    </div>
  );
}
