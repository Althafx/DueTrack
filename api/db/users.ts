import type { Role, UserStatus } from "@shared/types";
import { getDB } from "./client";
import { newId } from "./ids";
import type { UserRow } from "./rows";

interface SelectOpts {
  withPassword?: boolean;
  withEncryptedPassword?: boolean;
}

function selectColumns(opts?: SelectOpts): string {
  const columns = ["id", "name", "username", "phone", "role", "status", "created_at"];
  if (opts?.withPassword) columns.push("password");
  if (opts?.withEncryptedPassword) columns.push("encrypted_password");
  return columns.join(", ");
}

export async function findUserByUsername(username: string, opts?: SelectOpts): Promise<UserRow | null> {
  const db = getDB();
  const row = await db
    .prepare(`SELECT ${selectColumns(opts)} FROM users WHERE username = ?`)
    .bind(username)
    .first<UserRow>();
  return row ?? null;
}

export async function findUserById(id: string, opts?: SelectOpts): Promise<UserRow | null> {
  const db = getDB();
  const row = await db
    .prepare(`SELECT ${selectColumns(opts)} FROM users WHERE id = ?`)
    .bind(id)
    .first<UserRow>();
  return row ?? null;
}

export async function findEmployeeById(id: string, opts?: SelectOpts): Promise<UserRow | null> {
  const db = getDB();
  const row = await db
    .prepare(`SELECT ${selectColumns(opts)} FROM users WHERE id = ? AND role = 'EMPLOYEE'`)
    .bind(id)
    .first<UserRow>();
  return row ?? null;
}

export async function listEmployees(): Promise<UserRow[]> {
  const db = getDB();
  const { results } = await db
    .prepare(`SELECT ${selectColumns()} FROM users WHERE role = 'EMPLOYEE' ORDER BY created_at DESC`)
    .all<UserRow>();
  return results;
}

export interface CreateUserInput {
  name: string;
  username: string;
  phone: string;
  password: string;
  encryptedPassword: string;
  role: Role;
  status?: UserStatus;
}

export async function createUser(input: CreateUserInput): Promise<UserRow> {
  const db = getDB();
  const id = newId();
  const createdAt = new Date().toISOString();
  const status = input.status ?? "ACTIVE";

  await db
    .prepare(
      `INSERT INTO users (id, name, username, phone, password, encrypted_password, role, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, input.name, input.username.toLowerCase(), input.phone, input.password, input.encryptedPassword, input.role, status, createdAt)
    .run();

  return {
    id,
    name: input.name,
    username: input.username.toLowerCase(),
    phone: input.phone,
    role: input.role,
    status,
    created_at: createdAt,
  };
}

export interface UpdateUserPatch {
  name?: string;
  username?: string;
  phone?: string;
  status?: UserStatus;
  password?: string;
  encryptedPassword?: string;
}

export async function updateUser(id: string, patch: UpdateUserPatch): Promise<void> {
  const db = getDB();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (patch.name !== undefined) {
    sets.push("name = ?");
    values.push(patch.name);
  }
  if (patch.username !== undefined) {
    sets.push("username = ?");
    values.push(patch.username.toLowerCase());
  }
  if (patch.phone !== undefined) {
    sets.push("phone = ?");
    values.push(patch.phone);
  }
  if (patch.status !== undefined) {
    sets.push("status = ?");
    values.push(patch.status);
  }
  if (patch.password !== undefined) {
    sets.push("password = ?");
    values.push(patch.password);
  }
  if (patch.encryptedPassword !== undefined) {
    sets.push("encrypted_password = ?");
    values.push(patch.encryptedPassword);
  }

  if (sets.length === 0) return;

  values.push(id);
  await db
    .prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}

export async function updateUserPassword(id: string, passwords: { password: string; encryptedPassword: string }): Promise<void> {
  await updateUser(id, passwords);
}

export async function deleteEmployeeById(id: string): Promise<boolean> {
  const db = getDB();
  const result = await db.prepare(`DELETE FROM users WHERE id = ? AND role = 'EMPLOYEE'`).bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}
