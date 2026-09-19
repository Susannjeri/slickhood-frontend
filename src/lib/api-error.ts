import axios from "axios";

type ErrorEnvelope = { description?: string; data?: unknown };

function firstDetail(data: unknown): string | undefined {
  if (typeof data === "string" && data.trim()) return data.trim();
  if (Array.isArray(data)) {
    return data.find((item): item is string => typeof item === "string" && Boolean(item.trim()))?.trim();
  }
  return undefined;
}

export function apiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<ErrorEnvelope>(error)) {
    const description = error.response?.data?.description?.trim();
    const detail = firstDetail(error.response?.data?.data);
    if (detail && (!description || /^invalid field data\.?$/i.test(description))) {
      return detail;
    }
    if (!description) return fallback;
    if (/^data integrity violation\.?$/i.test(description)) {
      return "The system could not save this information. Refresh the page and try again. If it continues, contact support so the request can be checked.";
    }
    return description;
  }
  return fallback;
}
