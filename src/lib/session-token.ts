export interface SessionTokenClaims {
  sub?: string;
  exp?: number;
  roles?: unknown[];
}

export function decodeSessionToken(token: string): SessionTokenClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const encoded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as SessionTokenClaims;
  } catch {
    return null;
  }
}

export function accessTokenMaxAge(token: string, nowSeconds = Math.floor(Date.now() / 1000)): number | null {
  const claims = decodeSessionToken(token);
  if (!claims?.sub || !Number.isFinite(claims.exp)) return null;
  const remaining = Math.floor(claims.exp! - nowSeconds);
  return remaining > 0 ? remaining : null;
}
