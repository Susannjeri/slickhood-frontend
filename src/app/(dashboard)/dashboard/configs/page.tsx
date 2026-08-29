"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Edit,
  Eye,
  EyeOff,
  Check,
  X,
  Info,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

interface ConfigValue {
  id: number;
  name: string;
  stringValue: string;
  intValue: number;
  encrypted: boolean;
}

interface ConfigField {
  key: string;
  value: ConfigValue | null;
  isEditing: boolean;
  editValue: string;
  isRevealed: boolean;
  isSaving: boolean;
  isLoading: boolean;
  decryptedValue: string;
}

interface ConfigSection {
  title: string;
  description: string;
  fields: ConfigField[];
  loaded: boolean; // Track if section has been loaded
}

// Cache configuration
const CACHE_KEY = 'config_cache_v1';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function ConfigurationSettingsPage() {
  const {
    fetchConfigNames,
    fetchConfigValues,
    handleEditConfigValue,
    handleDecryptConfigValue,
  } = useApi();

  const [loading, setLoading] = useState(true);
  const [configNames, setConfigNames] = useState<string[]>([]);
  const [sections, setSections] = useState<ConfigSection[]>([]);
  const [openSections, setOpenSections] = useState<string[]>([]);

  useEffect(() => {
    initializeConfigs();
  }, []);

  const initializeConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetchConfigNames();

      if (response.success && response.data) {
        const names = response.data as string[];
        setConfigNames(names);
        
        // Group configs into sections (without loading values yet)
        const groupedSections = groupConfigsByCategory(names);
        setSections(groupedSections);
      }
    } catch (error: any) {
      console.error("Error loading configurations:", error);
      toast.error("Failed to load configurations");
    } finally {
      setLoading(false);
    }
  };

  const groupConfigsByCategory = (names: string[]): ConfigSection[] => {
    const sections: ConfigSection[] = [];

    const sectionDefinitions = [
      {
        title: "System Configuration",
        description: "General system settings and configurations",
        configNames: ["ROLES_CONFIG"],
      },
      {
        title: "M-Pesa API Endpoints",
        description: "M-Pesa API endpoint URLs",
        configNames: ["MPESA_STK_AUTH_URL", "MPESA_STK_INIT_URL"],
      },
      {
        title: "Callback URLs",
        description: "Payment callback endpoints",
        configNames: [
          "MPESA_STK_CALLBACK_BASE_URL",
          "MPESA_VALIDATION_BASE_URL",
          "MPESA_CONFIRMATION_BASE_URL",
        ],
      },
      {
        title: "M-Pesa Credentials",
        description: "M-Pesa authentication credentials",
        configNames: [
          "GLOBAL_MPESA_PAYBILL",
          "GLOBAL_MPESA_STK_PASSKEY",
          "GLOBAL_MPESA_CONSUMER_KEY",
          "GLOBAL_MPESA_CONSUMER_SECRET",
        ],
      },
      {
        title: "Flutterwave Configuration",
        description: "Flutterwave payment gateway settings",
        configNames: [
          "FW_REDIRECT_URL",
          "FW_PUBLIC_KEY",
          "FW_SECRET_KEY",
          "FW_ENCRYPTION_KEY",
          "FW_CARD_PAYMENT_URL",
          "FW_CALLBACK_URL",
          "FW_LOGO_URL",
          "FW_SESSION_DURATION",
          "FW_MAX_RETRIES",
          "FW_MAX_VERIFY_RETRIES",
        ],
      },
      {
        title: "SMS Configuration",
        description: "Africa's Talking SMS service settings",
        configNames: [
          "AFRICAS_TALKING_SMS_USERNAME",
          "AFRICAS_TALKING_SMS_PASSWORD",
          "AFRICAS_TALKING_SMS_CALLBACK_URL",
          "SMS_SENDERNAME",
          "SMS_THREAD_POOL_SIZE",
          "SMS_MAX_RETRIES",
          "SMS_RETRY_QUEUE_SIZE",
          "SMS_RETRY_DELAY_IN_SECONDS",
        ],
      },
      {
        title: "Email Configuration",
        description: "Email notification settings",
        configNames: [
          "EMAIL_THREAD_POOL_SIZE",
          "EMAIL_MAX_RETRIES",
          "EMAIL_RETRY_QUEUE_SIZE",
          "EMAIL_RETRY_DELAY_IN_SECONDS",
        ],
      },
      {
        title: "Security Settings",
        description: "Authentication and security configurations",
        configNames: [
          "OTP_VALIDITY_SECONDS",
          "JWT_VALIDITY_SECONDS",
          "INVITE_LINK_EXPIRY_DAYS",
          "INVITE_LINK_URL",
        ],
      },
      {
        title: "Application Settings",
        description: "General application configurations",
        configNames: ["MAX_UNIT_DUPLICATE_COUNT"],
      },
    ];

    sectionDefinitions.forEach(({ title, description, configNames }) => {
      const matchingConfigs = configNames.filter((name) => names.includes(name));
      
      if (matchingConfigs.length > 0) {
        sections.push({
          title,
          description,
          fields: matchingConfigs.map((key) => ({
            key,
            value: null,
            isEditing: false,
            editValue: "",
            isRevealed: false,
            isSaving: false,
            isLoading: true,
            decryptedValue: "",
          })),
          loaded: false, // Section not loaded yet
        });
      }
    });

    const categorizedConfigs = sectionDefinitions.flatMap((s) => s.configNames);
    const uncategorized = names.filter((name) => !categorizedConfigs.includes(name));
    
    if (uncategorized.length > 0) {
      sections.push({
        title: "Other Settings",
        description: "Additional system configurations",
        fields: uncategorized.map((key) => ({
          key,
          value: null,
          isEditing: false,
          editValue: "",
          isRevealed: false,
          isSaving: false,
          isLoading: true,
          decryptedValue: "",
        })),
        loaded: false,
      });
    }

    return sections;
  };

  // Load section configs when accordion opens
  const loadSectionConfigs = async (sectionIndex: number) => {
    const section = sections[sectionIndex];
    
    // Already loaded? Skip
    if (section.loaded) return;

    // Check cache first
    const cache = getCache();
    const cachedData = cache[section.title];
    
    if (cachedData && isCacheValid(cachedData.timestamp)) {
      // Use cached data
      console.log(`Using cached data for ${section.title}`);
      updateSectionFromCache(sectionIndex, cachedData.data);
      return;
    }

    // Fetch from API
    console.log(`Fetching data for ${section.title}`);
    const promises = section.fields.map((field, fieldIndex) =>
      fetchConfigValues(field.key)
        .then((response) => ({ fieldIndex, field: field.key, response }))
        .catch((error) => ({ fieldIndex, field: field.key, response: null, error }))
    );

    const results = await Promise.all(promises);

    // Update section with results
    setSections((prevSections) =>
      prevSections.map((sec, idx) =>
        idx === sectionIndex
          ? {
              ...sec,
              loaded: true,
              fields: sec.fields.map((field, fIdx) => {
                const result:any = results.find((r) => r.fieldIndex === fIdx);
                
                if ((result)?.error) {
                  console.error(`Error loading config ${field.key}:`, result.error);
                  return { ...field, isLoading: false };
                }
                
                if (result?.response?.success && result.response.data && result.response.data[0]) {
                  const configValue = result.response.data[0] as ConfigValue;
                  return {
                    ...field,
                    value: configValue,
                    editValue: configValue.stringValue || configValue.intValue.toString(),
                    isLoading: false,
                  };
                }
                
                return { ...field, isLoading: false };
              }),
            }
          : sec
      )
    );

    // Cache the results
    const cacheData = {} as any;
    results.forEach(({ field, response }) => {
      if (response?.success && response.data && response.data[0]) {
        cacheData[field] = response.data[0];
      }
    });
    
    updateCache(section.title, cacheData);
  };

  // Cache helpers
  const getCache = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  };

  const updateCache = (sectionTitle: string, data: any) => {
    try {
      const cache = getCache();
      cache[sectionTitle] = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to update cache:', error);
    }
  };

  const isCacheValid = (timestamp: number) => {
    return Date.now() - timestamp < CACHE_DURATION;
  };

  const updateSectionFromCache = (sectionIndex: number, cachedData: any) => {
    setSections((prevSections) =>
      prevSections.map((sec, idx) =>
        idx === sectionIndex
          ? {
              ...sec,
              loaded: true,
              fields: sec.fields.map((field) => {
                const configValue = cachedData[field.key];
                
                if (configValue) {
                  return {
                    ...field,
                    value: configValue,
                    editValue: configValue.stringValue || configValue.intValue.toString(),
                    isLoading: false,
                  };
                }
                
                return { ...field, isLoading: false };
              }),
            }
          : sec
      )
    );
  };

  // Clear cache (useful for debugging or after config updates)
  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    toast.success("Cache cleared");
  };

  const handleEdit = async (sectionIndex: number, fieldIndex: number) => {
    const field = sections[sectionIndex].fields[fieldIndex];
    
    if (field.value?.encrypted) {
      try {
        const response = await handleDecryptConfigValue(field.key);
        
        if (response.success && response.data && response.data[0]) {
          setSections((prevSections) => 
            prevSections.map((section, sIdx) => 
              sIdx === sectionIndex
                ? {
                    ...section,
                    fields: section.fields.map((field, fIdx) =>
                      fIdx === fieldIndex
                        ? {
                            ...field,
                            isEditing: true,
                            isRevealed: true,
                            editValue: response.data[0],
                            decryptedValue: response.data[0],
                          }
                        : field
                    ),
                  }
                : section
            )
          );
        }
      } catch (error) {
        console.error("Error decrypting value:", error);
        toast.error("Failed to decrypt value");
      }
    } else {
      setSections((prevSections) => 
        prevSections.map((section, sIdx) => 
          sIdx === sectionIndex
            ? {
                ...section,
                fields: section.fields.map((field, fIdx) =>
                  fIdx === fieldIndex
                    ? {
                        ...field,
                        isEditing: true,
                        editValue: field.value?.stringValue || field.value?.intValue.toString() || "",
                      }
                    : field
                ),
              }
            : section
        )
      );
    }
  };

  const handleCancel = (sectionIndex: number, fieldIndex: number) => {
    setSections((prevSections) =>
      prevSections.map((section, sIdx) =>
        sIdx === sectionIndex
          ? {
              ...section,
              fields: section.fields.map((field, fIdx) =>
                fIdx === fieldIndex
                  ? {
                      ...field,
                      isEditing: false,
                      isRevealed: false,
                      editValue: field.value?.stringValue || field.value?.intValue.toString() || "",
                    }
                  : field
              ),
            }
          : section
      )
    );
  };

  const handleSave = async (sectionIndex: number, fieldIndex: number) => {
    const currentField = sections[sectionIndex].fields[fieldIndex];
    const section = sections[sectionIndex];
    
    setSections((prevSections) =>
      prevSections.map((section, sIdx) =>
        sIdx === sectionIndex
          ? {
              ...section,
              fields: section.fields.map((field, fIdx) =>
                fIdx === fieldIndex
                  ? { ...field, isSaving: true }
                  : field
              ),
            }
          : section
      )
    );

    try {
      const response = await handleEditConfigValue(currentField.key, currentField.editValue);
      
      if (response.success) {
        setSections((prevSections) =>
          prevSections.map((section, sIdx) =>
            sIdx === sectionIndex
              ? {
                  ...section,
                  fields: section.fields.map((field, fIdx) =>
                    fIdx === fieldIndex
                      ? {
                          ...field,
                          value: field.value
                            ? { ...field.value, stringValue: field.editValue }
                            : null,
                          isEditing: false,
                          isRevealed: false,
                          isSaving: false,
                        }
                      : field
                  ),
                }
              : section
          )
        );
        
        // Invalidate cache for this section
        const cache = getCache();
        if (cache[section.title]) {
          delete cache[section.title];
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        }
        
        toast.success("Configuration updated successfully");
      }
    } catch (error: any) {
      console.error("Error saving config:", error);
      toast.error("Failed to update configuration");
      
      setSections((prevSections) =>
        prevSections.map((section, sIdx) =>
          sIdx === sectionIndex
            ? {
                ...section,
                fields: section.fields.map((field, fIdx) =>
                  fIdx === fieldIndex
                    ? { ...field, isSaving: false }
                    : field
                ),
              }
            : section
        )
      );
    }
  };

  const handleToggleReveal = async (sectionIndex: number, fieldIndex: number) => {
    const field = sections[sectionIndex].fields[fieldIndex];

    if (!field.isRevealed) {
      try {
        const response = await handleDecryptConfigValue(field.key);
        
        if (response.success && response.data && response.data[0]) {
          setSections((prevSections) =>
            prevSections.map((section, sIdx) =>
              sIdx === sectionIndex
                ? {
                    ...section,
                    fields: section.fields.map((field, fIdx) =>
                      fIdx === fieldIndex
                        ? {
                            ...field,
                            isRevealed: true,
                            decryptedValue: response.data[0],
                            ...(field.isEditing && { editValue: response.data[0] }),
                          }
                        : field
                    ),
                  }
                : section
            )
          );
        }
      } catch (error) {
        console.error("Error decrypting value:", error);
        toast.error("Failed to decrypt value");
      }
    } else {
      setSections((prevSections) =>
        prevSections.map((section, sIdx) =>
          sIdx === sectionIndex
            ? {
                ...section,
                fields: section.fields.map((field, fIdx) =>
                  fIdx === fieldIndex
                    ? {
                        ...field,
                        isRevealed: false,
                        ...(field.isEditing && { editValue: field.value?.stringValue || "" }),
                      }
                    : field
                ),
              }
            : section
        )
      );
    }
  };

  const formatFieldLabel = (key: string) => {
    return key
      .replace(/_/g, " ")
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getFieldDescription = (key: string) => {
    const descriptions: Record<string, string> = {
      GLOBAL_MPESA_PAYBILL: "Your M-Pesa paybill number",
      GLOBAL_MPESA_STK_PASSKEY: "STK push passkey from Safaricom",
      GLOBAL_MPESA_CONSUMER_KEY: "API consumer key",
      GLOBAL_MPESA_CONSUMER_SECRET: "API consumer secret",
      MPESA_STK_AUTH_URL: "OAuth authentication endpoint",
      MPESA_STK_INIT_URL: "STK push request endpoint",
      MPESA_STK_CALLBACK_BASE_URL: "STK push callback endpoint",
      MPESA_VALIDATION_BASE_URL: "Payment validation callback",
      MPESA_CONFIRMATION_BASE_URL: "Payment confirmation callback",
      ROLES_CONFIG: "Set to true to reinitialize system roles",
      OTP_VALIDITY_SECONDS: "OTP expiry time in seconds",
      JWT_VALIDITY_SECONDS: "JWT token validity duration",
      INVITE_LINK_EXPIRY_DAYS: "Days until invite link expires",
    };

    return descriptions[key] || "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2
            className="w-12 h-12 animate-spin mx-auto mb-4"
            style={{ color: "#EF4217" }}
          />
          <p className="text-gray-600">Loading configurations...</p>
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
              <Settings className="w-6 h-6" style={{ color: "#EF4217" }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "#141130" }}>
                Configuration Settings
              </h1>
              <p className="text-sm text-gray-500">
                Manage your system configurations
              </p>
            </div>
          </div>
          
          {/* Debug: Clear cache button */}
          {/* <Button
            variant="outline"
            size="sm"
            onClick={clearCache}
            className="text-gray-600"
          >
            Clear Cache
          </Button> */}
        </div>

        {/* Sections */}
        <Accordion 
          type="multiple" 
          className="space-y-4"
          value={openSections}
          onValueChange={setOpenSections}
        >
          {sections.map((section, sectionIndex) => (
            <AccordionItem
              key={sectionIndex}
              value={`section-${sectionIndex}`}
              className="bg-white rounded-lg border"
            >
              <AccordionTrigger 
                className="px-6 hover:no-underline"
                onClick={() => {
                  // Load section data when opened
                  if (!section.loaded) {
                    loadSectionConfigs(sectionIndex);
                  }
                }}
              >
                <div className="text-left">
                  <h2 className="text-xl font-semibold" style={{ color: "#141130" }}>
                    {section.title}
                  </h2>
                  <p className="text-sm text-gray-500">{section.description}</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-6 pt-4">
                  {section.fields.map((field, fieldIndex) => (
                    <div key={fieldIndex} className="border-b pb-6 last:border-b-0 last:pb-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <Label className="text-sm font-semibold" style={{ color: "#141130" }}>
                            {formatFieldLabel(field.key)}
                          </Label>
                          {getFieldDescription(field.key) && (
                            <p className="text-xs text-gray-500 mt-1">
                              {getFieldDescription(field.key)}
                            </p>
                          )}
                        </div>
                        {!field.isEditing && !field.isLoading && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(sectionIndex, fieldIndex)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>

                      {field.isLoading ? (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Loading...</span>
                        </div>
                      ) : field.isEditing ? (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              value={field.editValue}
                              onChange={(e) => {
                                const updatedSections = [...sections];
                                updatedSections[sectionIndex].fields[fieldIndex].editValue =
                                  e.target.value;
                                setSections(updatedSections);
                              }}
                              className="flex-1"
                              disabled={field.isSaving}
                            />
                            {field.value?.encrypted && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleToggleReveal(sectionIndex, fieldIndex)}
                                disabled={field.isSaving}
                              >
                                {field.isRevealed ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSave(sectionIndex, fieldIndex)}
                              disabled={field.isSaving}
                              className="text-white"
                              style={{ backgroundColor: "#EF4217" }}
                            >
                              {field.isSaving ? (
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
                              onClick={() => handleCancel(sectionIndex, fieldIndex)}
                              disabled={field.isSaving}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {field.value?.encrypted && !field.isRevealed ? (
                            <span className="font-mono text-gray-600">••••••••••</span>
                          ) : field.value?.encrypted && field.isRevealed ? (
                            <span className="text-gray-900 break-all">
                              {field.decryptedValue}
                            </span>
                          ) : (
                            <span className="text-gray-900 break-all">
                              {field.value?.stringValue || field.value?.intValue || "—"}
                            </span>
                          )}
                          {field.value?.encrypted && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleReveal(sectionIndex, fieldIndex)}
                              className="h-8 w-8 text-gray-500 hover:text-gray-700"
                            >
                              {field.isRevealed ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
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

        {/* Info Alert */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            <strong>Configuration Tips:</strong> Sections load automatically when opened. 
            Data is cached for 5 minutes for faster subsequent loads.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}