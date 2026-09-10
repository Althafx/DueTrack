import { getDB } from "./client";
import { newId } from "./ids";
import type { ClientRow } from "./rows";

export async function listClients(search?: string): Promise<ClientRow[]> {
  const db = getDB();
  if (search && search.trim()) {
    const like = `%${search.trim()}%`;
    const { results } = await db
      .prepare(`SELECT * FROM clients WHERE name LIKE ? OR phone LIKE ? ORDER BY created_at DESC`)
      .bind(like, like)
      .all<ClientRow>();
    return results;
  }
  const { results } = await db.prepare(`SELECT * FROM clients ORDER BY created_at DESC`).all<ClientRow>();
  return results;
}

export async function findClientById(id: string): Promise<ClientRow | null> {
  const db = getDB();
  const row = await db.prepare(`SELECT * FROM clients WHERE id = ?`).bind(id).first<ClientRow>();
  return row ?? null;
}

export interface CreateClientInput {
  name: string;
  phone: string;
  address: string;
  notes?: string;
  createdBy: string;
}

export async function createClient(input: CreateClientInput): Promise<ClientRow> {
  const db = getDB();
  const id = newId();
  const createdAt = new Date().toISOString();

  await db
    .prepare(`INSERT INTO clients (id, name, phone, address, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, input.name, input.phone, input.address, input.notes ?? null, input.createdBy, createdAt)
    .run();

  return {
    id,
    name: input.name,
    phone: input.phone,
    address: input.address,
    notes: input.notes ?? null,
    created_by: input.createdBy,
    created_at: createdAt,
  };
}

export interface UpdateClientPatch {
  name?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export async function updateClient(id: string, patch: UpdateClientPatch): Promise<void> {
  const db = getDB();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (patch.name !== undefined) {
    sets.push("name = ?");
    values.push(patch.name);
  }
  if (patch.phone !== undefined) {
    sets.push("phone = ?");
    values.push(patch.phone);
  }
  if (patch.address !== undefined) {
    sets.push("address = ?");
    values.push(patch.address);
  }
  if (patch.notes !== undefined) {
    sets.push("notes = ?");
    values.push(patch.notes);
  }

  if (sets.length === 0) return;

  values.push(id);
  await db
    .prepare(`UPDATE clients SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}

export async function deleteClient(id: string): Promise<boolean> {
  const db = getDB();
  const result = await db.prepare(`DELETE FROM clients WHERE id = ?`).bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}
