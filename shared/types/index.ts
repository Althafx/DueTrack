// Shared types imported by both `client` and `api` — single source of truth
// for domain shapes so frontend and backend never drift apart.

export type Role = "DEALER" | "EMPLOYEE";

export type UserStatus = "ACTIVE" | "INACTIVE";

export type CollectionStatus = "PENDING" | "PARTIALLY_COLLECTED" | "COMPLETED";

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "UPI" | "OTHER";

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export interface ClientDTO {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
  createdAt: string;
}

export interface ClientWithTotalsDTO extends ClientDTO {
  totalAmount: number;
  receivedAmount: number;
  remainingAmount: number;
}

export interface CollectionDTO {
  id: string;
  client: ClientDTO;
  assignedEmployee: UserDTO;
  totalAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  status: CollectionStatus;
  collectionDate: string;
  dueDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDTO {
  id: string;
  collection: string;
  client: ClientDTO;
  employee: UserDTO;
  amount: number;
  paymentMethod: PaymentMethod;
  remarks?: string;
  paymentDate: string;
  createdAt: string;
}

export interface DashboardSummaryDTO {
  totalAmount: number;
  totalReceived: number;
  totalRemaining: number;
  pendingCount: number;
  partiallyCollectedCount: number;
  completedCount: number;
  recentCollections: CollectionDTO[];
}

export interface EmployeePerformanceDTO {
  employee: UserDTO;
  totalAssigned: number;
  totalCollected: number;
  pendingCount: number;
  partiallyCollectedCount: number;
  completedCount: number;
}

export type ReportPeriod = "today" | "week" | "month" | "year" | "all";

export interface PeriodReportDTO {
  period: ReportPeriod;
  totalCollected: number;
  paymentCount: number;
  employeeBreakdown: Array<{
    employeeId: string;
    employeeName: string;
    totalCollected: number;
    paymentCount: number;
  }>;
  statusBreakdown: {
    pending: number;
    partiallyCollected: number;
    completed: number;
  };
}

export interface ApiErrorResponse {
  message: string;
  errors?: Record<string, string>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateClientRequest {
  name: string;
  phone: string;
  address: string;
  notes?: string;
}

export interface CreateEmployeeRequest {
  name: string;
  phone: string;
  email: string;
  password: string;
}

export interface CreateCollectionRequest {
  client: string;
  assignedEmployee: string;
  totalAmount: number;
  collectionDate: string;
  dueDate: string;
  notes?: string;
}

export interface CreatePaymentRequest {
  collection: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  remarks?: string;
}

export interface CollectionFilters {
  status?: CollectionStatus;
  employee?: string;
  client?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}
