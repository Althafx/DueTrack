import axios from "axios";
import type { ApiErrorResponse } from "@shared/types";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message ?? "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}
