import type { CollectionStatus } from "@shared/types";

export function computeStatus(totalAmount: number, receivedAmount: number): CollectionStatus {
  if (receivedAmount <= 0) return "PENDING";
  if (receivedAmount >= totalAmount) return "COMPLETED";
  return "PARTIALLY_COLLECTED";
}

export class ApiError extends Error {
  statusCode: number;
  errors?: Record<string, string>;

  constructor(statusCode: number, message: string, errors?: Record<string, string>) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}
