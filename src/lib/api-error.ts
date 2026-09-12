import axios from "axios";

export function apiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ description?: string }>(error)) {
    const description = error.response?.data?.description?.trim();
    if (!description) return fallback;
    if (/^data integrity violation\.?$/i.test(description)) {
      return "This action conflicts with an existing record. Refresh the page and check for an existing item before trying again.";
    }
    return description;
  }
  return fallback;
}
