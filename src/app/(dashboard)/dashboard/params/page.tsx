"use client";

import { useState, useEffect } from "react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Edit,
  Eye,
  EyeOff,
  Check,
  X,
  Plus,
  CreditCard,
  Trash2,
  Shield,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

// Types
type PaymentType = "M-Pesa" | "Flutterwave";

interface Param {
  id?: number;
  param: string;
  value: string;
}

interface ParamGroup {
  name: string;
  type: PaymentType;
  params: Param[];
  verified: boolean;
}

interface SupportedParam {
  id: string;
  name: string;
  description: string;
}

interface ParamField extends Param {
  isEditing: boolean;
  editValue: string;
  isRevealed: boolean;
  isSaving: boolean;
  decryptedValue: string;
}

interface ParamGroupState extends Omit<ParamGroup, "params"> {
  params: ParamField[];
}

export default function PaymentParametersPage() {
  const {
    handleListUserParams,
    handleGetSupportedParams,
    handleCreateParam,
    handleEditParam,
    handleDeleteParams,
    handleDecryptParams,
  } = useApi();

  const [loading, setLoading] = useState(true);
  const [paramGroups, setParamGroups] = useState<ParamGroupState[]>([]);
  const [supportedParams, setSupportedParams] = useState<SupportedParam[]>([]);
  
  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: "",
    type: "" as PaymentType | "",
    params: [] as Param[],
  });
  const [isCreating, setIsCreating] = useState(false);

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reveal state for groups
  const [revealedGroups, setRevealedGroups] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load supported params
      const supportedResponse = await handleGetSupportedParams();
      if (supportedResponse && supportedResponse.data) {
        setSupportedParams(supportedResponse.data);
      }

      // Load user params
      const userParamsResponse = await handleListUserParams();
      if (userParamsResponse && userParamsResponse.data) {
        const userParamsData: ParamGroup[] = userParamsResponse.data;

        // Transform to ParamGroupState
        const transformedData: ParamGroupState[] = userParamsData.map((group) => ({
          ...group,
          params: group.params.map((param) => ({
            ...param,
            isEditing: false,
            editValue: param.value,
            isRevealed: false,
            isSaving: false,
            decryptedValue: "",
          })),
        }));

        setParamGroups(transformedData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load payment parameters");
    } finally {
      setLoading(false);
    }
  };

  // Get required params for a payment type
  const getRequiredParamsForType = (type: PaymentType): SupportedParam[] => {
    if (type === "M-Pesa") {
      return supportedParams.filter((p) =>
        ["MPESA_PAYBILL", "MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET", "MPESA_STK_PASSKEY"].includes(p.id)
      );
    } else {
      return supportedParams.filter((p) =>
        ["FW_PUBLIC_KEY", "FW_SECRET_KEY", "FW_ENCRYPTION_KEY"].includes(p.id)
      );
    }
  };

  // Handle type change in add modal
  const handleTypeChange = (type: PaymentType) => {
    const requiredParams = getRequiredParamsForType(type);
    setAddFormData({
      ...addFormData,
      type,
      params: requiredParams.map((p) => ({ param: p.id, value: "" })),
    });
  };

  // Handle param value change in add modal
  const handleParamValueChange = (paramId: string, value: string) => {
    setAddFormData({
      ...addFormData,
      params: addFormData.params.map((p) =>
        p.param === paramId ? { ...p, value } : p
      ),
    });
  };

  // Handle create param
  const handleCreate = async () => {
    if (!addFormData.name.trim()) {
      toast.error("Please enter a parameter name");
      return;
    }
    if (!addFormData.type) {
      toast.error("Please select a payment type");
      return;
    }
    if (addFormData.params.some((p) => !p.value.trim())) {
      toast.error("Please fill in all parameter values");
      return;
    }

    try {
      setIsCreating(true);
      await handleCreateParam(addFormData.name, addFormData.type, addFormData.params);
      
      toast.success("Payment parameters created successfully");
      setIsAddModalOpen(false);
      setAddFormData({ name: "", type: "", params: [] });
      loadData();
    } catch (error) {
      console.error("Error creating params:", error);
      toast.error("Failed to create payment settings");
    } finally {
      setIsCreating(false);
    }
  };

  // Handle edit click
  const handleEdit = async (groupIndex: number, paramIndex: number) => {
    const group = paramGroups[groupIndex];
    const param = group.params[paramIndex];

    // Check if encrypted (value is masked)
    const isEncrypted = param.value === "*****";

    if (isEncrypted && !revealedGroups.has(groupIndex)) {
      // Decrypt the entire group first
      try {
        const response = await handleDecryptParams(group.name);
        
        if (response && response.data && response.data[0]) {
          const decryptedGroup = response.data[0];
          
          // Find the decrypted value for this specific param
          const decryptedParam = decryptedGroup.params.find(
            (p: Param) => p.param === param.param
          );

          if (decryptedParam) {
            // Update all params in the group with decrypted values and mark group as revealed
            setParamGroups((prev) =>
              prev.map((g, gIdx) =>
                gIdx === groupIndex
                  ? {
                      ...g,
                      params: g.params.map((p) => {
                        const decP = decryptedGroup.params.find(
                          (dp: Param) => dp.param === p.param
                        );
                        return {
                          ...p,
                          isRevealed: true,
                          decryptedValue: decP?.value || p.value,
                          ...(p.param === param.param && {
                            isEditing: true,
                            editValue: decryptedParam.value,
                          }),
                        };
                      }),
                    }
                  : g
              )
            );
            
            // Mark group as revealed
            setRevealedGroups((prev) => new Set(prev).add(groupIndex));
          }
        }
      } catch (error) {
        console.error("Error decrypting value:", error);
        toast.error("Failed to decrypt value");
      }
    } else {
      // Already revealed or not encrypted - just enter edit mode
      setParamGroups((prev) =>
        prev.map((g, gIdx) =>
          gIdx === groupIndex
            ? {
                ...g,
                params: g.params.map((p, pIdx) =>
                  pIdx === paramIndex
                    ? { 
                        ...p, 
                        isEditing: true, 
                        editValue: p.isRevealed ? p.decryptedValue : p.value 
                      }
                    : p
                ),
              }
            : g
        )
      );
    }
  };

  // Handle cancel edit
  const handleCancel = (groupIndex: number, paramIndex: number) => {
    setParamGroups((prev) =>
      prev.map((g, gIdx) =>
        gIdx === groupIndex
          ? {
              ...g,
              params: g.params.map((p, pIdx) =>
                pIdx === paramIndex
                  ? {
                      ...p,
                      isEditing: false,
                      editValue: p.value,
                    }
                  : p
              ),
            }
          : g
      )
    );
  };

  // Handle save edit
  const handleSave = async (groupIndex: number, paramIndex: number) => {
    const group = paramGroups[groupIndex];
    const currentParam = group.params[paramIndex];

    setParamGroups((prev) =>
      prev.map((g, gIdx) =>
        gIdx === groupIndex
          ? {
              ...g,
              params: g.params.map((p, pIdx) =>
                pIdx === paramIndex ? { ...p, isSaving: true } : p
              ),
            }
          : g
      )
    );

    try {
      // Prepare all params for PUT request
      const allParams = group.params.map((p, idx) => ({
        id: p.id,
        param: p.param,
        value: idx === paramIndex ? currentParam.editValue : p.value,
      }));

      await handleEditParam(group.name, group.type, allParams);

      setParamGroups((prev) =>
        prev.map((g, gIdx) =>
          gIdx === groupIndex
            ? {
                ...g,
                params: g.params.map((p, pIdx) =>
                  pIdx === paramIndex
                    ? {
                        ...p,
                        value: "*****", // Mask the value again after save
                        isEditing: false,
                        isRevealed: false,
                        isSaving: false,
                      }
                    : p
                ),
              }
            : g
        )
      );

      toast.success("Parameter updated successfully");
    } catch (error) {
      console.error("Error saving param:", error);
      toast.error("Failed to update parameter");

      setParamGroups((prev) =>
        prev.map((g, gIdx) =>
          gIdx === groupIndex
            ? {
                ...g,
                params: g.params.map((p, pIdx) =>
                  pIdx === paramIndex ? { ...p, isSaving: false } : p
                ),
              }
            : g
        )
      );
    }
  };

  // Handle toggle reveal for entire group
  const handleToggleGroupReveal = async (groupIndex: number) => {
    const group = paramGroups[groupIndex];
    const isRevealed = revealedGroups.has(groupIndex);

    if (!isRevealed) {
      try {
        // Decrypt entire group
        const response = await handleDecryptParams(group.name);
        
        if (response && response.data && response.data[0]) {
          const decryptedGroup = response.data[0];
          
          // Update all params in the group with decrypted values
          setParamGroups((prev) =>
            prev.map((g, gIdx) =>
              gIdx === groupIndex
                ? {
                    ...g,
                    params: g.params.map((p) => {
                      const decryptedParam = decryptedGroup.params.find(
                        (dp: Param) => dp.param === p.param
                      );
                      return {
                        ...p,
                        isRevealed: true,
                        decryptedValue: decryptedParam?.value || p.value,
                      };
                    }),
                  }
                : g
            )
          );
          
          // Mark group as revealed
          setRevealedGroups((prev) => new Set(prev).add(groupIndex));
        }
      } catch (error) {
        console.error("Error decrypting values:", error);
        toast.error("Failed to decrypt values");
      }
    } else {
      // Hide all values in group
      setParamGroups((prev) =>
        prev.map((g, gIdx) =>
          gIdx === groupIndex
            ? {
                ...g,
                params: g.params.map((p) => ({
                  ...p,
                  isRevealed: false,
                  decryptedValue: "",
                })),
              }
            : g
        )
      );
      
      // Mark group as not revealed
      setRevealedGroups((prev) => {
        const newSet = new Set(prev);
        newSet.delete(groupIndex);
        return newSet;
      });
    }
  };

  // Handle delete
  const handleDeleteClick = (name: string) => {
    setGroupToDelete(name);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!groupToDelete) return;

    try {
      setIsDeleting(true);
      await handleDeleteParams(groupToDelete);

      toast.success("Payment parameters deleted successfully");
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
      loadData();
    } catch (error) {
      console.error("Error deleting params:", error);
      toast.error("Failed to delete payment settings");
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to get param description
  const getParamDescription = (paramId: string): string => {
    return supportedParams.find((p) => p.id === paramId)?.description || "";
  };

  // Helper to get param display name
  const getParamDisplayName = (paramId: string): string => {
    return supportedParams.find((p) => p.id === paramId)?.name || paramId;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2
            className="w-12 h-12 animate-spin mx-auto mb-4"
            style={{ color: "#EF4217" }}
          />
          <p className="text-gray-600">Loading payment settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#FEE2E2" }}
            >
              <CreditCard className="w-6 h-6" style={{ color: "#EF4217" }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "#141130" }}>
                Payment Parameters
              </h1>
              <p className="text-sm text-gray-500">
                Manage M-Pesa and Flutterwave payment settings
              </p>
            </div>
          </div>

          {/* Add Button */}
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button
                className="text-white shadow-lg hover:shadow-xl transition-shadow"
                style={{ backgroundColor: "#EF4217" }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Payment Settings</DialogTitle>
                <DialogDescription>
                  Configure payment gateway credentials for your property
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="param-name">Setting Name</Label>
                  <Input
                    id="param-name"
                    placeholder="e.g., PlataOcean_Mpesa"
                    value={addFormData.name}
                    onChange={(e) =>
                      setAddFormData({ ...addFormData, name: e.target.value })
                    }
                  />
                  <p className="text-xs text-gray-500">
                    Give a unique name to identify this configuration
                  </p>
                </div>

                {/* Type Select */}
                <div className="space-y-2">
                  <Label htmlFor="param-type">Payment Type</Label>
                  <Select
                    value={addFormData.type}
                    onValueChange={(value) =>
                      handleTypeChange(value as PaymentType)
                    }
                  >
                    <SelectTrigger id="param-type">
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                      <SelectItem value="FlutterWave">FlutterWave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Dynamic Param Fields */}
                {addFormData.type && (
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-sm" style={{ color: "#141130" }}>
                      Required Settings
                    </h3>
                    {addFormData.params.map((param, idx) => (
                      <div key={idx} className="space-y-2">
                        <Label htmlFor={`param-${idx}`}>
                          {getParamDisplayName(param.param)}
                        </Label>
                        <Input
                          id={`param-${idx}`}
                          type="text"
                          placeholder={`Enter ${getParamDisplayName(param.param)}`}
                          value={param.value}
                          onChange={(e) =>
                            handleParamValueChange(param.param, e.target.value)
                          }
                        />
                        <p className="text-xs text-gray-500">
                          {getParamDescription(param.param)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setAddFormData({ name: "", type: "", params: [] });
                  }}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="text-white"
                  style={{ backgroundColor: "#EF4217" }}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Create Settings
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Param Groups Accordion */}
        {paramGroups.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2" style={{ color: "#141130" }}>
              No Payment Settings Yet
            </h3>
            <p className="text-gray-500 mb-4">
              Add your first payment gateway configuration to start accepting payments
            </p>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="text-white"
              style={{ backgroundColor: "#EF4217" }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Settings
            </Button>
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {paramGroups.map((group, groupIndex) => (
              <AccordionItem
                key={groupIndex}
                value={`group-${groupIndex}`}
                className="bg-white rounded-lg border"
              >
                <AccordionTrigger className="px-6 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        
                        <h2 className="text-xl font-semibold" style={{ color: "#141130" }}>
                          {group.name}
                        </h2>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            group.type === "M-Pesa"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {group.type}
                        </span>
                        {group.type === "M-Pesa" ? (
                          <Smartphone className="w-4 h-4 text-blue-600" />
                        ) : (
                          <CreditCard className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {/* <span>{group.params.length} settings configured</span> */}
                        <span className="text-gray-300">•</span>
                        <div className="flex items-center gap-1">
                          <span className={group.verified ? "text-green-600" : "text-gray-500"}>
                            {group.verified ? "Verified" : "Not Verified"}
                          </span>
                          {group.verified ? (
                            <ShieldCheck className="w-4 h-4 text-green-600" />
                          ) : (
                            <Shield className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleGroupReveal(groupIndex)}
                        className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                        title={revealedGroups.has(groupIndex) ? "Hide values" : "Reveal values"}
                      >
                        {revealedGroups.has(groupIndex) ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(group.name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-6 pt-4">
                    {group.params.map((param, paramIndex) => (
                      <div
                        key={paramIndex}
                        className="border-b pb-6 last:border-b-0 last:pb-0"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <Label
                              className="text-sm font-semibold"
                              style={{ color: "#141130" }}
                            >
                              {getParamDisplayName(param.param)}
                            </Label>
                            {getParamDescription(param.param) && (
                              <p className="text-xs text-gray-500 mt-1">
                                {getParamDescription(param.param)}
                              </p>
                            )}
                          </div>
                          {!param.isEditing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(groupIndex, paramIndex)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>

                        {param.isEditing ? (
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <Input
                                value={param.editValue}
                                onChange={(e) => {
                                  const updated = [...paramGroups];
                                  updated[groupIndex].params[paramIndex].editValue =
                                    e.target.value;
                                  setParamGroups(updated);
                                }}
                                className="flex-1"
                                disabled={param.isSaving}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSave(groupIndex, paramIndex)}
                                disabled={param.isSaving}
                                className="text-white"
                                style={{ backgroundColor: "#EF4217" }}
                              >
                                {param.isSaving ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-4 h-4 mr-1" />
                                    Save
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancel(groupIndex, paramIndex)}
                                disabled={param.isSaving}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {param.value === "*****" && !param.isRevealed ? (
                              <span className="font-mono text-gray-600">••••••••••</span>
                            ) : param.value === "*****" && param.isRevealed ? (
                              <span className="text-gray-900 break-all">
                                {param.decryptedValue}
                              </span>
                            ) : (
                              <span className="text-gray-900 break-all">
                                {param.value}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Settings?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{groupToDelete}"? This action cannot be
              undone and will remove all associated payment configurations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}