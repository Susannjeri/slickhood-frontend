import axios from "axios";

export function apiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ description?: string }>(error)) {
    const description = error.response?.data?.description?.trim();
    if (!description) return fallback;
    if (/^data integrity violation\.?$/i.test(description)) {
      return "The system could not save this information. Refresh the page and try again. If it continues, contact support so the request can be checked.";
    }
    return description;
  }
  return fallback;
}
