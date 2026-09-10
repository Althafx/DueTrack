import type { CollectionStatus, PaymentMethod, Role, UserStatus } from "@shared/types";

export interface UserRow {
  id: string;
  name: string;
  username: string;
  phone: string;
  password?: string;
  encrypted_password?: string;
  role: Role;
  status: UserStatus;
  created_at: string;
}

export interface ClientRow {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CollectionRow {
  id: string;
  client_id: string | null;
  assigned_employee_id: string | null;
  total_amount: number;
  received_amount: number;
  remaining_amount: number;
  status: CollectionStatus;
  collection_date: string;
  due_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollectionWithRefsRow extends CollectionRow {
  client: ClientRow | null;
  assignedEmployee: UserRow | null;
}

export interface PaymentRow {
  id: string;
  collection_id: string | null;
  client_id: string | null;
  employee_id: string | null;
  client_name: string;
  client_phone: string;
  employee_name: string;
  amount: number;
  payment_method: PaymentMethod;
  remarks: string | null;
  payment_date: string;
  created_at: string;
}

export interface PaymentWithRefsRow extends PaymentRow {
  client: ClientRow | null;
  employee: UserRow | null;
}
