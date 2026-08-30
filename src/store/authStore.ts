import { create } from "zustand";
import { persist } from "zustand/middleware";
import { RegistrationStep } from "@/types";

export interface Role {
  title: string;
  permissions: string[];
  properties?: {
    id: number;
    name: string;
  }[];
  propertyIds?: number[];
  propertyNames?: string[];
}
interface AuthState {
  token: string | null;
  mfaEnabled: boolean | null;
  totpEnabled: boolean | null;
  step: RegistrationStep;
  email: string | null;
  roleId: number | null;
  selectedBusinessAreaId: string | null;
  inviteToken: string | null;

  // from decoded token
  roles: Role[];
  roleName: string[];
  permissions: string[];
  propertyIds: number[];
  propertyNames: string[];
  activeRole: Role | null;

  // True only after the secure cookie session has been checked/restored.
  sessionReady: boolean;

  // transient UI state — NOT persisted
  switching: boolean;

  // setters
  setToken: (token: string | null) => void;
  setmfaEnabled: (mfaEnabled: boolean) => void;
  settotpEnabled: (totpEnabled: boolean) => void;
  setStep: (s: RegistrationStep) => void;
  setEmail: (email: string) => void;
  setRole: (roleId: number) => void;
  setSelectedBusinessAreaId: (businessAreaId: string | null) => void;
  setInviteToken: (inviteToken: string | null) => void;
  setRoleName: (roleName: string[]) => void;
  setPermissions: (permissions: string[]) => void;
  setRoles: (roles: Role[]) => void;
  setPropertyIds: (propertyIds: number[]) => void;
  setPropertyNames: (propertyNames: string[]) => void;
  setActiveRole: (role: Role) => void;
  setSessionReady: (ready: boolean) => void;
  setSwitching: (switching: boolean) => void; // 👈 NEW

  logout: () => void;
  resetRegistrationData: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      mfaEnabled: false,
      totpEnabled: false,
      step: "role",
      email: null,
      roleId: null,
      selectedBusinessAreaId: null,
      inviteToken: null,
      roles: [],
      roleName: [],
      permissions: [],
      propertyIds: [],
      propertyNames: [],
      activeRole: null,
      sessionReady: false,
      switching: false, // 👈 always starts false (not persisted)

      setToken: (token) => set({ token }),
      setmfaEnabled: (mfaEnabled) => set({ mfaEnabled }),
      settotpEnabled: (totpEnabled) => set({ totpEnabled }),
      setStep: (step) => set({ step }),
      setEmail: (email) => set({ email }),
      setRole: (roleId) => set({ roleId }),
      setSelectedBusinessAreaId: (selectedBusinessAreaId) => set({ selectedBusinessAreaId }),
      setInviteToken: (inviteToken) => set({ inviteToken }),
      setRoleName: (roleName) => set({ roleName }),
      setPermissions: (permissions) => set({ permissions }),
      setRoles: (roles) => set({ roles }),
      setSessionReady: (sessionReady) => set({ sessionReady }),
      setPropertyIds: (propertyIds) => set({ propertyIds }),
      setPropertyNames: (propertyNames) => set({ propertyNames }),
      setSwitching: (switching) => set({ switching }),

      setActiveRole: (role) => {
        const propertyIds = role.properties?.map((p) => p.id) || [];
        const propertyNames = role.properties?.map((p) => p.name) || [];
        
        set({
          activeRole: { 
            ...role,
            propertyIds,
            propertyNames,
          },
          permissions: Array.from(new Set(role.permissions)),
          propertyIds: Array.from(new Set(propertyIds)),
          propertyNames: Array.from(new Set(propertyNames)),
        })},

      logout: () =>
        set({
          token: null,
          mfaEnabled: false,
          totpEnabled: false,
          email: null,
          roleId: null,
          selectedBusinessAreaId: null,
          inviteToken: null,
          roles: [],
          roleName: [],
          permissions: [],
          propertyIds: [],
          propertyNames: [],
          activeRole: null,
          switching: false,
        }),

      resetRegistrationData: () =>
        set({
          email: null,
          roleId: null,
          selectedBusinessAreaId: null,
          token: null,
          mfaEnabled: false,
          totpEnabled: false,
          step: "role",
          inviteToken: null,
          roles: [],
          roleName: [],
          permissions: [],
          propertyIds: [],
          propertyNames: [],
          activeRole: null,
          switching: false,
        }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        mfaEnabled: state.mfaEnabled,
        totpEnabled: state.totpEnabled,
        email: state.email,
        roleId: state.roleId,
        selectedBusinessAreaId: state.selectedBusinessAreaId,
        step: state.step,
        inviteToken: state.inviteToken,
        roles: state.roles,
        roleName: state.roleName,
        permissions: state.permissions,
        propertyIds: state.propertyIds,
        propertyNames: state.propertyNames,
        activeRole: state.activeRole,
        // switching intentionally excluded — always rehydrates as false
      }),
    }
  )
);
