ALTER TABLE payments ADD COLUMN verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1));
CREATE INDEX idx_payments_verified ON payments(verified);
