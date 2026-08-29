import axios from "axios";

export function apiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ description?: string }>(error)) {
    return error.response?.data?.description ?? fallback;
  }
  return fallback;
}
