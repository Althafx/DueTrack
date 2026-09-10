import type { ClientRow, CollectionWithRefsRow, PaymentWithRefsRow, UserRow } from "../db/rows";
import type { ClientDTO, CollectionDTO, PaymentDTO, UserDTO } from "@shared/types";

export function toUserDTO(user: UserRow): UserDTO {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    phone: user.phone,
    role: user.role,
    status: user.status,
    createdAt: user.created_at,
  };
}

export function toClientDTO(client: ClientRow): ClientDTO {
  return {
    id: client.id,
    name: client.name,
    phone: client.phone,
    address: client.address,
    notes: client.notes ?? undefined,
    createdAt: client.created_at,
  };
}

const DELETED_CLIENT_PLACEHOLDER: Omit<ClientDTO, "id" | "createdAt"> = {
  name: "Deleted client",
  phone: "",
  address: "",
};

const DELETED_EMPLOYEE_PLACEHOLDER: Omit<UserDTO, "id" | "createdAt"> = {
  name: "Deleted employee",
  username: "",
  phone: "",
  role: "EMPLOYEE",
  status: "INACTIVE",
};

export function toCollectionDTO(collection: CollectionWithRefsRow): CollectionDTO {
  // A Collection's client/employee can become a dangling reference if that
  // Client or Employee is later deleted (deletion is only blocked while a
  // collection is still active — a COMPLETED collection can outlive them).
  // Fall back to a placeholder rather than crashing; the real audit trail
  // for a completed collection lives in its Payment records, which snapshot
  // the client/employee's name independently of this reference.
  const client = collection.client
    ? toClientDTO(collection.client)
    : { id: "", createdAt: collection.created_at, ...DELETED_CLIENT_PLACEHOLDER };

  const assignedEmployee = collection.assignedEmployee
    ? toUserDTO(collection.assignedEmployee)
    : { id: "", createdAt: collection.created_at, ...DELETED_EMPLOYEE_PLACEHOLDER };

  return {
    id: collection.id,
    client,
    assignedEmployee,
    totalAmount: collection.total_amount,
    receivedAmount: collection.received_amount,
    remainingAmount: collection.remaining_amount,
    status: collection.status,
    collectionDate: collection.collection_date,
    dueDate: collection.due_date,
    notes: collection.notes ?? undefined,
    createdAt: collection.created_at,
    updatedAt: collection.updated_at,
  };
}

export function toPaymentDTO(payment: PaymentWithRefsRow): PaymentDTO {
  // Prefer the live joined row (reflects any later edits to the
  // client/employee's details), but fall back to the snapshot captured at
  // payment time when the referenced Client or Employee has since been
  // deleted — Payment is a permanent audit record and must stay readable.
  const client = payment.client
    ? toClientDTO(payment.client)
    : {
        id: "",
        name: payment.client_name,
        phone: payment.client_phone,
        address: "",
        createdAt: payment.created_at,
      };

  const employee = payment.employee
    ? toUserDTO(payment.employee)
    : {
        id: "",
        name: payment.employee_name,
        username: "",
        phone: "",
        role: "EMPLOYEE" as const,
        status: "INACTIVE" as const,
        createdAt: payment.created_at,
      };

  return {
    id: payment.id,
    collection: payment.collection_id ?? "",
    client,
    employee,
    amount: payment.amount,
    paymentMethod: payment.payment_method,
    remarks: payment.remarks ?? undefined,
    paymentDate: payment.payment_date,
    createdAt: payment.created_at,
  };
}
