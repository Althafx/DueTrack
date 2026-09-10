// Minimal, hand-picked ambient types for the Cloudflare Workers runtime APIs
// this project actually uses (D1 binding + the Express-on-Workers adapter).
//
// We deliberately do NOT pull in the full `@cloudflare/workers-types` package
// as a global `types` entry: it declares its own loose `Buffer`/global stubs
// that collide with `@types/node`'s real `Buffer` class (used throughout this
// codebase via Node's `crypto`/`bcryptjs`), causing spurious type errors like
// `Buffer.toString()` losing its `encoding` parameter. Extracting just the D1
// interfaces (verbatim from `@cloudflare/workers-types`) avoids that clash
// while still giving full type safety for D1 access.

interface D1Meta {
  duration: number;
  size_after: number;
  rows_read: number;
  rows_written: number;
  last_row_id: number;
  changed_db: boolean;
  changes: number;
  served_by_region?: string;
  served_by_colo?: string;
  served_by_primary?: boolean;
  timings?: {
    sql_duration_ms: number;
  };
  total_attempts?: number;
}

interface D1Response {
  success: true;
  meta: D1Meta & Record<string, unknown>;
  error?: never;
}

type D1Result<T = unknown> = D1Response & {
  results: T[];
};

interface D1ExecResult {
  count: number;
  duration: number;
}

declare abstract class D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName: string): Promise<T | null>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(options: { columnNames: true }): Promise<[string[], ...T[]]>;
  raw<T = unknown[]>(options?: { columnNames?: false }): Promise<T[]>;
}

declare abstract class D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}

declare module "cloudflare:node" {
  export function httpServerHandler(options: { port: number }): {
    fetch(request: Request, env: unknown, ctx: unknown): Promise<Response>;
  };
}
