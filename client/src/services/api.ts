import axios from "axios";
import type { ApiErrorResponse } from "@shared/types";

// In production the API is a separate Worker on its own domain, so the base
// URL must be absolute (VITE_API_URL, set at build time — see
// client/.env.production). Locally it falls back to the relative "/api",
// which Vite's dev server proxies to the local API Worker (vite.config.ts).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message ?? "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}
