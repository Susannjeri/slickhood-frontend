export type ApiEnvelope<T> = { data?: { data?: T | T[] } };

export function envelopeItem<T>(response: ApiEnvelope<T>, fallback: T): T {
  const payload = response.data?.data;
  if (Array.isArray(payload)) return (payload[0] as T | undefined) ?? fallback;
  return (payload as T | undefined) ?? fallback;
}

export function envelopeList<T>(response: ApiEnvelope<T[]>, fallback: T[] = []): T[] {
  const payload = response.data?.data;
  return Array.isArray(payload) ? payload.filter((item): item is T => item != null) : fallback;
}

export function envelopePageList<T>(response: ApiEnvelope<T[] | { content?: T[] }>, fallback: T[] = []): T[] {
  const payload = response.data?.data;
  if (Array.isArray(payload)) {
    if (payload.length === 1 && payload[0] && typeof payload[0] === "object" && "content" in payload[0]) {
      return ((payload[0] as { content?: T[] }).content ?? fallback);
    }
    return payload.filter((item): item is T => item != null);
  }
  return payload && typeof payload === "object" && "content" in payload
    ? ((payload as { content?: T[] }).content ?? fallback)
    : fallback;
}
