import { API } from "@/lib/api";
const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });
export type GateDevice = { deviceCode: string; propertyId: number; displayName: string; gateName?: string; laneName?: string; enabled: boolean; lastSeenAt?: string };
export type AccessEvent = { id: number; visitorId?: number; source: string; direction: string; outcome: string; reasonCode: string; correlationId: string; vehiclePlate?: string; occurredAt: string };
export type RegisterGateDevice = { propertyId: number; displayName: string; gateName?: string; laneName?: string; ed25519PublicKey: string };
export const getGateDevices = (propertyId: number, token: string) => API.get<GateDevice[]>("/smart-gate/devices", { ...auth(token), params: { propertyId } });
export const getGateEvents = (propertyId: number, token: string) => API.get("/smart-gate/events", { ...auth(token), params: { propertyId, size: 50 } });
export const registerGateDevice = (payload: RegisterGateDevice, token: string) => API.post<GateDevice>("/smart-gate/devices", payload, auth(token));
export const setGateDeviceEnabled = (deviceCode: string, enabled: boolean, token: string) => API.put<GateDevice>(`/smart-gate/devices/${deviceCode}/status`, { enabled }, auth(token));
