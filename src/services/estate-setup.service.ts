import { API } from "@/lib/api";

export type EstateSetupNextAction =
  | "ADD_UNITS"
  | "LINK_OPERATING_ACCOUNT"
  | "ASSIGN_HOMEOWNERS"
  | "CREATE_ESTATE_BUDGET"
  | "INVITE_ESTATE_TEAM"
  | "READY";

export interface EstateSetupStatus {
  propertyId: number;
  propertyName: string;
  managementMode: "RENTAL" | "SALE" | "SERVICE_CHARGE";
  activeUnits: number;
  activeStaff: number;
  operatingAccounts: number;
  activeHomeowners: number;
  currentBudgets: number;
  unitsConfigured: boolean;
  billingConfigured: boolean;
  homeownerOperationsConfigured: boolean;
  readyForHomeownerOperations: boolean;
  nextAction: EstateSetupNextAction;
}

export const estateSetupService = {
  status: (propertyId: number) =>
    API.get<{ data: EstateSetupStatus }>(`/estate/setup/properties/${propertyId}`),
};
