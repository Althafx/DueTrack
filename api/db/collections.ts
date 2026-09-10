import type { CollectionStatus } from "@shared/types";
import { getDB } from "./client";
import { newId } from "./ids";
import type { ClientRow, CollectionRow, CollectionWithRefsRow, UserRow } from "./rows";

export interface CollectionListFilter {
  status?: CollectionStatus;
  assignedEmployeeId?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
}

function buildFilter(filter: CollectionListFilter, tableAlias?: string): { where: string; values: unknown[] } {
  const prefix = tableAlias ? `${tableAlias}.` : "";
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (filter.status) {
    clauses.push(`${prefix}status = ?`);
    values.push(filter.status);
  }
  if (filter.assignedEmployeeId) {
    clauses.push(`${prefix}assigned_employee_id = ?`);
    values.push(filter.assignedEmployeeId);
  }
  if (filter.clientId) {
    clauses.push(`${prefix}client_id = ?`);
    values.push(filter.clientId);
  }
  if (filter.dateFrom) {
    clauses.push(`${prefix}collection_date >= ?`);
    values.push(filter.dateFrom);
  }
  if (filter.dateTo) {
    clauses.push(`${prefix}collection_date <= ?`);
    values.push(filter.dateTo);
  }

  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", values };
}

export async function listCollections(filter: CollectionListFilter): Promise<CollectionRow[]> {
  const db = getDB();
  const { where, values } = buildFilter(filter);
  const { results } = await db
    .prepare(`SELECT * FROM collections ${where} ORDER BY created_at DESC`)
    .bind(...values)
    .all<CollectionRow>();
  return results;
}

const REF_JOIN_SELECT = `
  SELECT
    c.*,
    cl.id AS cl_id, cl.name AS cl_name, cl.phone AS cl_phone, cl.address AS cl_address, cl.notes AS cl_notes, cl.created_by AS cl_created_by, cl.created_at AS cl_created_at,
    u.id AS u_id, u.name AS u_name, u.username AS u_username, u.phone AS u_phone, u.role AS u_role, u.status AS u_status, u.created_at AS u_created_at
  FROM collections c
  LEFT JOIN clients cl ON cl.id = c.client_id
  LEFT JOIN users u ON u.id = c.assigned_employee_id
`;

interface RawJoinRow {
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

function shapeJoinRow(row: RawJoinRow): CollectionWithRefsRow {
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

  const assignedEmployee: UserRow | null = row.u_id
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
    client_id: row.client_id,
    assigned_employee_id: row.assigned_employee_id,
    total_amount: row.total_amount,
    received_amount: row.received_amount,
    remaining_amount: row.remaining_amount,
    status: row.status,
    collection_date: row.collection_date,
    due_date: row.due_date,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    client,
    assignedEmployee,
  };
}

export async function findCollectionById(id: string): Promise<CollectionRow | null> {
  const db = getDB();
  const row = await db.prepare(`SELECT * FROM collections WHERE id = ?`).bind(id).first<CollectionRow>();
  return row ?? null;
}

export async function findCollectionWithRefs(id: string): Promise<CollectionWithRefsRow | null> {
  const db = getDB();
  const row = await db.prepare(`${REF_JOIN_SELECT} WHERE c.id = ?`).bind(id).first<RawJoinRow>();
  return row ? shapeJoinRow(row) : null;
}

export async function listCollectionsWithRefs(filter: CollectionListFilter): Promise<CollectionWithRefsRow[]> {
  const db = getDB();
  const { where, values } = buildFilter(filter, "c");
  const { results } = await db
    .prepare(`${REF_JOIN_SELECT} ${where} ORDER BY c.created_at DESC`)
    .bind(...values)
    .all<RawJoinRow>();
  return results.map(shapeJoinRow);
}

export async function listRecentCollections(filter: CollectionListFilter, limit: number): Promise<CollectionWithRefsRow[]> {
  const db = getDB();
  const { where, values } = buildFilter(filter, "c");
  const { results } = await db
    .prepare(`${REF_JOIN_SELECT} ${where} ORDER BY c.updated_at DESC LIMIT ?`)
    .bind(...values, limit)
    .all<RawJoinRow>();
  return results.map(shapeJoinRow);
}

export interface CreateCollectionInput {
  clientId: string;
  assignedEmployeeId: string;
  totalAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  status: CollectionStatus;
  collectionDate: string;
  dueDate: string;
  notes?: string;
}

export async function createCollection(input: CreateCollectionInput): Promise<CollectionRow> {
  const db = getDB();
  const id = newId();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO collections (id, client_id, assigned_employee_id, total_amount, received_amount, remaining_amount, status, collection_date, due_date, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.clientId,
      input.assignedEmployeeId,
      input.totalAmount,
      input.receivedAmount,
      input.remainingAmount,
      input.status,
      input.collectionDate,
      input.dueDate,
      input.notes ?? null,
      now,
      now
    )
    .run();

  return {
    id,
    client_id: input.clientId,
    assigned_employee_id: input.assignedEmployeeId,
    total_amount: input.totalAmount,
    received_amount: input.receivedAmount,
    remaining_amount: input.remainingAmount,
    status: input.status,
    collection_date: input.collectionDate,
    due_date: input.dueDate,
    notes: input.notes ?? null,
    created_at: now,
    updated_at: now,
  };
}

export interface UpdateCollectionPatch {
  assignedEmployeeId?: string;
  totalAmount?: number;
  remainingAmount?: number;
  status?: CollectionStatus;
  collectionDate?: string;
  dueDate?: string;
  notes?: string;
}

export async function updateCollection(id: string, patch: UpdateCollectionPatch): Promise<void> {
  const db = getDB();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (patch.assignedEmployeeId !== undefined) {
    sets.push("assigned_employee_id = ?");
    values.push(patch.assignedEmployeeId);
  }
  if (patch.totalAmount !== undefined) {
    sets.push("total_amount = ?");
    values.push(patch.totalAmount);
  }
  if (patch.remainingAmount !== undefined) {
    sets.push("remaining_amount = ?");
    values.push(patch.remainingAmount);
  }
  if (patch.status !== undefined) {
    sets.push("status = ?");
    values.push(patch.status);
  }
  if (patch.collectionDate !== undefined) {
    sets.push("collection_date = ?");
    values.push(patch.collectionDate);
  }
  if (patch.dueDate !== undefined) {
    sets.push("due_date = ?");
    values.push(patch.dueDate);
  }
  if (patch.notes !== undefined) {
    sets.push("notes = ?");
    values.push(patch.notes);
  }

  sets.push("updated_at = ?");
  values.push(new Date().toISOString());

  values.push(id);
  await db
    .prepare(`UPDATE collections SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}

export async function deleteCollection(id: string): Promise<boolean> {
  const db = getDB();
  const result = await db.prepare(`DELETE FROM collections WHERE id = ?`).bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function countActiveCollectionsForClient(clientId: string): Promise<number> {
  const db = getDB();
  const row = await db
    .prepare(`SELECT COUNT(*) AS count FROM collections WHERE client_id = ? AND status != 'COMPLETED'`)
    .bind(clientId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function countActiveCollectionsForEmployee(employeeId: string): Promise<number> {
  const db = getDB();
  const row = await db
    .prepare(`SELECT COUNT(*) AS count FROM collections WHERE assigned_employee_id = ? AND status != 'COMPLETED'`)
    .bind(employeeId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}
