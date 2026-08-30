import type { IUser } from "../models/User";
import type { IClient } from "../models/Client";
import type { ICollection } from "../models/Collection";
import type { IPayment } from "../models/Payment";
import type { ClientDTO, CollectionDTO, PaymentDTO, UserDTO } from "@shared/types";

export function toUserDTO(user: IUser): UserDTO {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    phone: user.phone,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toClientDTO(client: IClient): ClientDTO {
  return {
    id: client.id,
    name: client.name,
    phone: client.phone,
    address: client.address,
    notes: client.notes,
    createdAt: client.createdAt.toISOString(),
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

export function toCollectionDTO(
  collection: ICollection & { client: IClient | null; assignedEmployee: IUser | null }
): CollectionDTO {
  // A Collection's client/employee can become a dangling reference if that
  // Client or Employee is later deleted (deletion is only blocked while a
  // collection is still active — a COMPLETED collection can outlive them).
  // Fall back to a placeholder rather than crashing; the real audit trail
  // for a completed collection lives in its Payment records, which snapshot
  // the client/employee's name independently of this reference.
  const client = collection.client
    ? toClientDTO(collection.client)
    : { id: "", createdAt: collection.createdAt.toISOString(), ...DELETED_CLIENT_PLACEHOLDER };

  const assignedEmployee = collection.assignedEmployee
    ? toUserDTO(collection.assignedEmployee)
    : { id: "", createdAt: collection.createdAt.toISOString(), ...DELETED_EMPLOYEE_PLACEHOLDER };

  return {
    id: collection.id,
    client,
    assignedEmployee,
    totalAmount: collection.totalAmount,
    receivedAmount: collection.receivedAmount,
    remainingAmount: collection.remainingAmount,
    status: collection.status,
    collectionDate: collection.collectionDate.toISOString(),
    dueDate: collection.dueDate.toISOString(),
    notes: collection.notes,
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
  };
}

export function toPaymentDTO(payment: IPayment & { client: IClient | null; employee: IUser | null }): PaymentDTO {
  // Prefer the live populated document (reflects any later edits to the
  // client/employee's details), but fall back to the snapshot captured at
  // payment time when the referenced Client or Employee has since been
  // deleted — Payment is a permanent audit record and must stay readable.
  const client = payment.client
    ? toClientDTO(payment.client)
    : {
        id: "",
        name: payment.clientName,
        phone: payment.clientPhone,
        address: "",
        createdAt: payment.createdAt.toISOString(),
      };

  const employee = payment.employee
    ? toUserDTO(payment.employee)
    : {
        id: "",
        name: payment.employeeName,
        username: "",
        phone: "",
        role: "EMPLOYEE" as const,
        status: "INACTIVE" as const,
        createdAt: payment.createdAt.toISOString(),
      };

  return {
    id: payment.id,
    collection: payment.collection.toString(),
    client,
    employee,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    remarks: payment.remarks,
    paymentDate: payment.paymentDate.toISOString(),
    createdAt: payment.createdAt.toISOString(),
  };
}
