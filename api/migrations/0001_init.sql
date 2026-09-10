CREATE TABLE users (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  username            TEXT NOT NULL UNIQUE,
  phone               TEXT NOT NULL,
  password            TEXT NOT NULL,
  encrypted_password  TEXT NOT NULL,
  role                TEXT NOT NULL CHECK (role IN ('DEALER','EMPLOYEE')),
  status              TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE clients (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  address     TEXT NOT NULL,
  notes       TEXT,
  created_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE collections (
  id                    TEXT PRIMARY KEY,
  client_id             TEXT REFERENCES clients(id) ON DELETE SET NULL,
  assigned_employee_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  total_amount          REAL NOT NULL CHECK (total_amount >= 1),
  received_amount       REAL NOT NULL DEFAULT 0 CHECK (received_amount >= 0),
  remaining_amount      REAL NOT NULL CHECK (remaining_amount >= 0),
  status                TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PARTIALLY_COLLECTED','COMPLETED')),
  collection_date       TEXT NOT NULL,
  due_date              TEXT NOT NULL,
  notes                 TEXT,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_collections_status ON collections(status);
CREATE INDEX idx_collections_assigned_employee_id ON collections(assigned_employee_id);
CREATE INDEX idx_collections_client_id ON collections(client_id);

CREATE TABLE payments (
  id             TEXT PRIMARY KEY,
  collection_id  TEXT REFERENCES collections(id) ON DELETE SET NULL,
  client_id      TEXT REFERENCES clients(id) ON DELETE SET NULL,
  employee_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  client_name    TEXT NOT NULL,
  client_phone   TEXT NOT NULL,
  employee_name  TEXT NOT NULL,
  amount         REAL NOT NULL CHECK (amount >= 1),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH','BANK_TRANSFER','UPI','OTHER')),
  remarks        TEXT,
  payment_date   TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_payments_collection_id_created_at ON payments(collection_id, created_at DESC);
CREATE INDEX idx_payments_employee_id ON payments(employee_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
