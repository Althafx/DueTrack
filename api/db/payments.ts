import type { PaymentMethod } from "@shared/types";
import { getDB } from "./client";
import { newId } from "./ids";
import type { ClientRow, PaymentRow, PaymentWithRefsRow, UserRow } from "./rows";

export interface PaymentListFilter {
  collectionId?: string;
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
}

function buildFilter(filter: PaymentListFilter, tableAlias?: string): { where: string; values: unknown[] } {
  const prefix = tableAlias ? `${tableAlias}.` : "";
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (filter.collectionId) {
    clauses.push(`${prefix}collection_id = ?`);
    values.push(filter.collectionId);
  }
  if (filter.employeeId) {
    clauses.push(`${prefix}employee_id = ?`);
    values.push(filter.employeeId);
  }
  if (filter.dateFrom) {
    clauses.push(`${prefix}payment_date >= ?`);
    values.push(filter.dateFrom);
  }
  if (filter.dateTo) {
    clauses.push(`${prefix}payment_date <= ?`);
    values.push(filter.dateTo);
  }

  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", values };
}

export async function listPayments(filter: PaymentListFilter): Promise<PaymentRow[]> {
  const db = getDB();
  const { where, values } = buildFilter(filter);
  const { results } = await db
    .prepare(`SELECT * FROM payments ${where} ORDER BY created_at DESC`)
    .bind(...values)
    .all<PaymentRow>();
  return results;
}

export async function listPaymentsForReport(filter: PaymentListFilter): Promise<PaymentRow[]> {
  return listPayments(filter);
}

const REF_JOIN_SELECT = `
  SELECT
    p.*,
    cl.id AS cl_id, cl.name AS cl_name, cl.phone AS cl_phone, cl.address AS cl_address, cl.notes AS cl_notes, cl.created_by AS cl_created_by, cl.created_at AS cl_created_at,
    u.id AS u_id, u.name AS u_name, u.username AS u_username, u.phone AS u_phone, u.role AS u_role, u.status AS u_status, u.created_at AS u_created_at
  FROM payments p
  LEFT JOIN clients cl ON cl.id = p.client_id
  LEFT JOIN users u ON u.id = p.employee_id
`;

interface RawJoinRow {
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
  cl_id: string | null;
  cl_name: string | null;
  cl_phone: string | null;
  cl_address: string | null;
  cl_notes: string | null;
  cl_created_by: string | null;
  cl_created_at: string | null;
  u_id: string | null;
  u_name: string | null;
  u_username: string | null;
  u_phone: string | null;
  u_role: UserRow["role"] | null;
  u_status: UserRow["status"] | null;
  u_created_at: string | null;
}

function shapeJoinRow(row: RawJoinRow): PaymentWithRefsRow {
  const client: ClientRow | null = row.cl_id
    ? {
        id: row.cl_id,
        name: row.cl_name!,
        phone: row.cl_phone!,
        address: row.cl_address!,
        notes: row.cl_notes,
        created_by: row.cl_created_by,
        created_at: row.cl_created_at!,
      }
    : null;

  const employee: UserRow | null = row.u_id
    ? {
        id: row.u_id,
        name: row.u_name!,
        username: row.u_username!,
        phone: row.u_phone!,
        role: row.u_role!,
        status: row.u_status!,
        created_at: row.u_created_at!,
      }
    : null;

  return {
    id: row.id,
    collection_id: row.collection_id,
    client_id: row.client_id,
    employee_id: row.employee_id,
    client_name: row.client_name,
    client_phone: row.client_phone,
    employee_name: row.employee_name,
    amount: row.amount,
    payment_method: row.payment_method,
    remarks: row.remarks,
    payment_date: row.payment_date,
    created_at: row.created_at,
    client,
    employee,
  };
}

export async function findPaymentById(id: string): Promise<PaymentRow | null> {
  const db = getDB();
  const row = await db.prepare(`SELECT * FROM payments WHERE id = ?`).bind(id).first<PaymentRow>();
  return row ?? null;
}

export async function findPaymentWithRefs(id: string): Promise<PaymentWithRefsRow | null> {
  const db = getDB();
  const row = await db.prepare(`${REF_JOIN_SELECT} WHERE p.id = ?`).bind(id).first<RawJoinRow>();
  return row ? shapeJoinRow(row) : null;
}

export async function listPaymentsWithRefs(filter: PaymentListFilter): Promise<PaymentWithRefsRow[]> {
  const db = getDB();
  const { where, values } = buildFilter(filter, "p");
  const { results } = await db
    .prepare(`${REF_JOIN_SELECT} ${where} ORDER BY p.created_at DESC`)
    .bind(...values)
    .all<RawJoinRow>();
  return results.map(shapeJoinRow);
}

export interface CreatePaymentAndUpdateCollectionInput {
  collectionId: string;
  clientId: string | null;
  employeeId: string;
  clientName: string;
  clientPhone: string;
  employeeName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  remarks?: string;
  paymentDate: string;
  nextReceivedAmount: number;
  nextRemainingAmount: number;
  nextStatus: string;
}

export async function createPaymentAndUpdateCollection(input: CreatePaymentAndUpdateCollectionInput): Promise<string> {
  const db = getDB();
  const id = newId();
  const createdAt = new Date().toISOString();
  const updatedAt = createdAt;

  await db.batch([
    db
      .prepare(
        `INSERT INTO payments (id, collection_id, client_id, employee_id, client_name, client_phone, employee_name, amount, payment_method, remarks, payment_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        input.collectionId,
        input.clientId,
        input.employeeId,
        input.clientName,
        input.clientPhone,
        input.employeeName,
        input.amount,
        input.paymentMethod,
        input.remarks ?? null,
        input.paymentDate,
        createdAt
      ),
    db
      .prepare(`UPDATE collections SET received_amount = ?, remaining_amount = ?, status = ?, updated_at = ? WHERE id = ?`)
      .bind(input.nextReceivedAmount, input.nextRemainingAmount, input.nextStatus, updatedAt, input.collectionId),
  ]);

  return id;
}

export interface UpdatePaymentAndCollectionInput {
  paymentId: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  remarks?: string;
  collectionId: string;
  nextReceivedAmount: number;
  nextRemainingAmount: number;
  nextStatus: string;
}

export async function updatePaymentAndCollection(input: UpdatePaymentAndCollectionInput): Promise<void> {
  const db = getDB();
  const updatedAt = new Date().toISOString();

  const paymentSets: string[] = ["amount = ?"];
  const paymentValues: unknown[] = [input.amount];
  if (input.paymentMethod !== undefined) {
    paymentSets.push("payment_method = ?");
    paymentValues.push(input.paymentMethod);
  }
  if (input.remarks !== undefined) {
    paymentSets.push("remarks = ?");
    paymentValues.push(input.remarks);
  }
  paymentValues.push(input.paymentId);

  await db.batch([
    db.prepare(`UPDATE payments SET ${paymentSets.join(", ")} WHERE id = ?`).bind(...paymentValues),
    db
      .prepare(`UPDATE collections SET received_amount = ?, remaining_amount = ?, status = ?, updated_at = ? WHERE id = ?`)
      .bind(input.nextReceivedAmount, input.nextRemainingAmount, input.nextStatus, updatedAt, input.collectionId),
  ]);
}
