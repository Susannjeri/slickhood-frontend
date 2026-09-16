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

const normalizedRole = (title?: string | null) => (title ?? "").toLowerCase().replace(/[\s_-]/g, "");

export function isolateSuperadminRoles(roles: Role[]): Role[] {
  const superadmin = roles.find(role => normalizedRole(role.title) === "superadmin");
  return superadmin ? [superadmin] : roles;
}
interface AuthState {
  token: string | null;
  mfaEnabled: boolean | null;
  totpEnabled: boolean | null;
  step: RegistrationStep;
  email: string | null;
  roleId: number | null;
  selectedBusinessAreaId: string | null;
  activeWorkspaceId: number | null;
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
  setActiveWorkspaceId: (workspaceId: number | null) => void;
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
    (set, get) => ({
      token: null,
      mfaEnabled: false,
      totpEnabled: false,
      step: "role",
      email: null,
      roleId: null,
      selectedBusinessAreaId: null,
      activeWorkspaceId: null,
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
      setActiveWorkspaceId: (activeWorkspaceId) => set({ activeWorkspaceId }),
      setInviteToken: (inviteToken) => set({ inviteToken }),
      setRoleName: (roleName) => set({
        roleName: get().roles.some(role => normalizedRole(role.title) === "superadmin")
          ? [get().roles.find(role => normalizedRole(role.title) === "superadmin")!.title]
          : roleName,
      }),
      setPermissions: (permissions) => set({ permissions }),
      setRoles: (roles) => {
        const isolated = isolateSuperadminRoles(roles);
        const superadmin = isolated.find(role => normalizedRole(role.title) === "superadmin");
        set(superadmin ? {
          roles: isolated,
          roleName: [superadmin.title],
          activeRole: { ...superadmin, propertyIds: [], propertyNames: [] },
          permissions: Array.from(new Set(superadmin.permissions)),
          propertyIds: [],
          propertyNames: [],
          selectedBusinessAreaId: null,
          activeWorkspaceId: null,
        } : { roles: isolated });
      },
      setSessionReady: (sessionReady) => set({ sessionReady }),
      setPropertyIds: (propertyIds) => set({ propertyIds }),
      setPropertyNames: (propertyNames) => set({ propertyNames }),
      setSwitching: (switching) => set({ switching }),

      setActiveRole: (role) => {
        const superadmin = get().roles.find(candidate => normalizedRole(candidate.title) === "superadmin");
        const effectiveRole = superadmin ?? role;
        const propertyIds = effectiveRole.properties?.map((p) => p.id) || [];
        const propertyNames = effectiveRole.properties?.map((p) => p.name) || [];
        
        set({
          activeRole: { 
            ...effectiveRole,
            propertyIds,
            propertyNames,
          },
          permissions: Array.from(new Set(effectiveRole.permissions)),
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
          activeWorkspaceId: null,
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
          activeWorkspaceId: null,
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
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<AuthState>) };
        const isolated = isolateSuperadminRoles(merged.roles ?? []);
        const superadmin = isolated.find(role => normalizedRole(role.title) === "superadmin");
        if (!superadmin) return { ...merged, roles: isolated };
        return {
          ...merged,
          roles: isolated,
          roleName: [superadmin.title],
          activeRole: { ...superadmin, propertyIds: [], propertyNames: [] },
          permissions: Array.from(new Set(superadmin.permissions)),
          propertyIds: [],
          propertyNames: [],
          selectedBusinessAreaId: null,
          activeWorkspaceId: null,
        };
      },
      partialize: (state) => ({
        mfaEnabled: state.mfaEnabled,
        totpEnabled: state.totpEnabled,
        email: state.email,
        roleId: state.roleId,
        selectedBusinessAreaId: state.selectedBusinessAreaId,
        activeWorkspaceId: state.activeWorkspaceId,
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
