"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, AlertCircle } from "lucide-react";

interface FeeType {
  id: number;
  name: string;
}

interface PeriodType {
  id: string;
  name: string;
}

interface ChargeFormItem {
  chargeId: number | null;
  period: string;
  amount: string;
  tempId: string;
}

interface ManageChargesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: number;
  currency: string;
  onSave: () => void;
}

export default function ManageChargesDrawer({
  isOpen,
  onClose,
  unitId,
  currency,
  onSave,
}: ManageChargesDrawerProps) {
  const {
    handleGetFeeTypes,
    handleGetPeriodTypes,
    handleGetUnitCharges,
    handleUpdateUnitCharges,
  } = useApi();

  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [periodTypes, setPeriodTypes] = useState<PeriodType[]>([]);
  const [charges, setCharges] = useState<ChargeFormItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, unitId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [feeTypesRes, periodTypesRes, unitChargesRes] = await Promise.all([
        handleGetFeeTypes(),
        handleGetPeriodTypes(),
        handleGetUnitCharges(unitId),
      ]);

      if (feeTypesRes.success && feeTypesRes.data) {
        setFeeTypes(feeTypesRes.data);
      }

      if (periodTypesRes.success && periodTypesRes.data) {
        setPeriodTypes(periodTypesRes.data);
      }

      if (unitChargesRes.success && unitChargesRes.data) {
        const existingCharges = unitChargesRes.data.map((charge: any) => ({
          chargeId: charge.chargeId,
          period: charge.periodId,
          amount: charge.amount.toString(),
          tempId: `existing-${charge.id}`,
        }));
        setCharges(existingCharges);
      } else {
        setCharges([createEmptyCharge()]);
      }
    } catch (err: any) {
      console.error("Error loading data:", err);
      toast.error("Failed to load charges data", {
        description: err.message || "Please try again",
        descriptionClassName: "!text-black",
      });
    } finally {
      setLoading(false);
    }
  };

  const createEmptyCharge = (): ChargeFormItem => ({
    chargeId: null,
    period: "",
    amount: "",
    tempId: `new-${Date.now()}-${Math.random()}`,
  });

  const handleAddCharge = () => {
    setCharges([...charges, createEmptyCharge()]);
  };

  const handleRemoveCharge = (tempId: string) => {
    if (charges.length === 1) {
      toast.error("Cannot remove all charges", {
        description: "At least one charge must remain",
        descriptionClassName: "!text-black",
      });
      return;
    }
    setCharges(charges.filter((charge) => charge.tempId !== tempId));
  };

  const handleChargeChange = (
    tempId: string,
    field: keyof ChargeFormItem,
    value: string | number | null
  ) => {
    setCharges(
      charges.map((charge) =>
        charge.tempId === tempId ? { ...charge, [field]: value } : charge
      )
    );
  };

  const validateCharges = (): boolean => {
    for (const charge of charges) {
      if (!charge.chargeId) {
        toast.error("Validation Error", {
          description: "Please select a charge type for all charges",
          descriptionClassName: "text-black",
        });
        return false;
      }

      if (!charge.period) {
        toast.error("Validation Error", {
          description: "Please select a period for all charges",
          descriptionClassName: "text-black",
        });
        return false;
      }

      if (!charge.amount || parseFloat(charge.amount) <= 0) {
        toast.error("Validation Error", {
          description: "Please enter a valid amount for all charges",
          descriptionClassName: "text-black",
        });
        return false;
      }
    }

    const chargeIds = charges.map((c) => c.chargeId);
    const uniqueChargeIds = new Set(chargeIds);
    if (chargeIds.length !== uniqueChargeIds.size) {
      toast.error("Validation Error", {
        description: "Cannot have duplicate charge types",
        descriptionClassName: "text-black",
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateCharges()) return;

    try {
      setSaving(true);

      const chargesPayload = charges.map((charge) => ({
        chargeId: charge.chargeId!,
        period: charge.period as "ONE_TIME" | "MONTHLY" | "ANNUAL",
        amount: parseFloat(charge.amount),
      }));

      const response = await handleUpdateUnitCharges({
        unitId,
        charges: chargesPayload,
      });

      if (response.success) {
        toast.success("Charges updated successfully", {
          description: "Unit charges have been updated",
          descriptionClassName: "!text-black",
        });
        onSave();
      }
    } catch (err: any) {
      console.error("Error saving charges:", err);
      toast.error("Failed to update charges", {
        description: err.message || "Please try again",
        descriptionClassName: "!text-black",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-2xl">
          <DrawerHeader>
            <DrawerTitle style={{ color: "#141130" }}>
              Manage Unit Charges
            </DrawerTitle>
            <DrawerDescription className="text-gray-600">
              Add, edit, or remove supplementary charges for this unit
            </DrawerDescription>
          </DrawerHeader>

          {/* Fixed height scrollable content with bottom padding */}
        <div className="px-6 overflow-y-auto pb-4" style={{ maxHeight: "50vh" }}>
        {loading ? (
            <div className="flex items-center justify-center py-12">
            <Loader2
                className="w-8 h-8 animate-spin"
                style={{ color: "#EF4217" }}
            />
            </div>
        ) : (
            <div className="space-y-6 py-6">
            {/* Info Banner */}
            <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-700">
                <p className="font-medium mb-1">How charges work:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>
                    Charges are supplementary fees in addition to the base
                    rent
                    </li>
                    <li>One-time charges are applied once at lease start</li>
                    <li>
                    Monthly/Annual charges recur automatically during the
                    lease
                    </li>
                </ul>
                </div>
            </div>

            {/* Charges List */}
            <div className="space-y-4">
                {charges.map((charge, index) => (
                <div
                    key={charge.tempId}
                    className="p-4 border rounded-lg bg-gray-50 space-y-4"
                >
                    <div className="flex items-center justify-between">
                    <h4
                        className="font-medium text-sm"
                        style={{ color: "#141130" }}
                    >
                        Charge #{index + 1}
                    </h4>
                    {charges.length > 1 && (
                        <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCharge(charge.tempId)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                        <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Charge Type */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                        Charge Type
                        </Label>
                        <Select
                        value={charge.chargeId?.toString() || ""}
                        onValueChange={(value) =>
                            handleChargeChange(
                            charge.tempId,
                            "chargeId",
                            parseInt(value)
                            )
                        }
                        >
                        <SelectTrigger>
                            <SelectValue placeholder="Select charge" />
                        </SelectTrigger>
                        <SelectContent>
                            {feeTypes.map((fee) => (
                            <SelectItem
                                key={fee.id}
                                value={fee.id.toString()}
                            >
                                {fee.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Amount</Label>
                        <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                            {currency}
                        </span>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={charge.amount}
                            onChange={(e) =>
                            handleChargeChange(
                                charge.tempId,
                                "amount",
                                e.target.value
                            )
                            }
                            className="pl-16"
                            placeholder="0.00"
                        />
                        </div>
                    </div>

                    {/* Period */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Period</Label>
                        <Select
                        value={charge.period}
                        onValueChange={(value) =>
                            handleChargeChange(charge.tempId, "period", value)
                        }
                        >
                        <SelectTrigger>
                            <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                            {periodTypes.map((period) => (
                            <SelectItem key={period.id} value={period.id}>
                                {period.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    </div>
                </div>
                ))}
            </div>

            {/* Add Charge Button */}
            <Button
                type="button"
                variant="outline"
                onClick={handleAddCharge}
                className="w-full border-dashed border-2 hover:bg-gray-50"
                disabled={charges.length >= feeTypes.length}
            >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Charge
            </Button>

            {charges.length >= feeTypes.length && (
                <p className="text-xs text-gray-500 text-center">
                All available charge types have been added
                </p>
            )}
            </div>
        )}
        </div>

        <DrawerFooter className="border-t bg-white pt-4">
        <div className="flex gap-3 w-full">
            <DrawerClose asChild>
            <Button
                variant="outline"
                className="flex-1"
                disabled={saving}
            >
                Cancel
            </Button>
            </DrawerClose>
            <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 text-white hover:opacity-90 transition"
            style={{ backgroundColor: "#EF4217" }}
            >
            {saving ? (
                <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
                </>
            ) : (
                "Save Charges"
            )}
            </Button>
        </div>
        </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}