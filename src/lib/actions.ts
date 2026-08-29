import {jwtDecode} from "jwt-decode";
import currencyData from "currency-codes/data";

interface GoogleIdTokenPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  nbf: number;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  iat: number;
  exp: number;
  jti: string;
}

interface Role {
  title: string;
  permissions: string[];
  properties?: {
    id: number;
    name: string;
  }[];
  propertyIds?: number[];
  propertyNames?: string[];
}

interface ServerToken {
  sub: string;
  iss: string;
  iat: number;
  roles: Role[];
  exp: number;
}
  
export function decodeIdToken(idToken: string): GoogleIdTokenPayload | null {
  try {
    return jwtDecode<GoogleIdTokenPayload>(idToken);
  } catch (error) {
    console.error("Failed to decode ID token:", error);
    return null;
  }
}

export function decodeServerToken(token: string): ServerToken | null {
  try {
    return jwtDecode<ServerToken>(token);
  } catch (error) {
    console.error("Failed to decode server token:", error);
    return null;
  }
}

export const currencyOptions = currencyData.map((c: any) => ({
  value: c.code,
  label: `${c.code} - ${c.currency}`,
}));



// Example usage:
// const idTokenPayload = decodeIdToken(yourIdToken);
// const serverTokenPayload = decodeServerToken(yourServerToken);
  
