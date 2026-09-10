// Development/demo data seeder for D1 — run manually via `npm run seed`.
// Generates a .sql file (printed to stdout) that wipes and recreates the
// demo dataset; apply it with `wrangler d1 execute ... --file=...`.
// Never invoked automatically — safe to re-run, it's a full wipe+recreate.
import "./utils/loadEnv";
import { computeStatus } from "./utils/status";
import { hashAndEncryptPassword } from "./utils/password";
import { newId } from "./db/ids";

type PaymentMethod = "CASH" | "BANK_TRANSFER" | "UPI" | "OTHER";
const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "UPI", "OTHER"];

// Deterministic pseudo-random generator so the demo dataset is reproducible
// across re-seeds instead of shuffling every time `npm run seed` is run.
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(20260901);
const pick = <T,>(arr: T[]): T => arr[Math.floor(random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;

function sqlQuote(value: string | number | null): string {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${value.replace(/'/g, "''")}'`;
}

async function seed() {
  const statements: string[] = [];
  statements.push("DELETE FROM payments;");
  statements.push("DELETE FROM collections;");
  statements.push("DELETE FROM clients;");
  statements.push("DELETE FROM users;");

  console.error("Creating users...");
  const dealerId = newId();
  const dealerAuth = await hashAndEncryptPassword("password123");
  const dealerCreatedAt = new Date().toISOString();
  statements.push(
    `INSERT INTO users (id, name, username, phone, password, encrypted_password, role, status, created_at) VALUES (${sqlQuote(dealerId)}, ${sqlQuote("Demo Dealer")}, ${sqlQuote("dealer")}, ${sqlQuote("9876543210")}, ${sqlQuote(dealerAuth.password)}, ${sqlQuote(dealerAuth.encryptedPassword)}, 'DEALER', 'ACTIVE', ${sqlQuote(dealerCreatedAt)});`
  );

  const employeesData = [
    { name: "Rahul Sharma", username: "rahul", phone: "9876500001" },
    { name: "Priya Verma", username: "priya", phone: "9876500002" },
    { name: "Arjun Mehta", username: "arjun", phone: "9876500003" },
    { name: "Sneha Iyer", username: "sneha", phone: "9876500004" },
  ];
  const employees: Array<{ id: string; name: string; username: string }> = [];
  for (const e of employeesData) {
    const id = newId();
    const auth = await hashAndEncryptPassword("password123");
    const createdAt = new Date().toISOString();
    statements.push(
      `INSERT INTO users (id, name, username, phone, password, encrypted_password, role, status, created_at) VALUES (${sqlQuote(id)}, ${sqlQuote(e.name)}, ${sqlQuote(e.username)}, ${sqlQuote(e.phone)}, ${sqlQuote(auth.password)}, ${sqlQuote(auth.encryptedPassword)}, 'EMPLOYEE', 'ACTIVE', ${sqlQuote(createdAt)});`
    );
    employees.push({ id, name: e.name, username: e.username });
  }

  console.error("Creating clients...");
  const clientsData = [
    { name: "Amit Traders", phone: "9111100001", address: "MG Road, Pune", notes: "Wholesale buyer" },
    { name: "Singh Enterprises", phone: "9111100002", address: "Sector 18, Noida" },
    { name: "Kumar & Sons", phone: "9111100003", address: "Anna Nagar, Chennai" },
    { name: "Sunrise Distributors", phone: "9111100004", address: "Salt Lake, Kolkata" },
    { name: "Green Valley Store", phone: "9111100005", address: "Banjara Hills, Hyderabad" },
    { name: "Metro Wholesale", phone: "9111100006", address: "Andheri East, Mumbai" },
    { name: "Coastal Traders", phone: "9111100007", address: "Marine Drive, Kochi" },
    { name: "Highland Retailers", phone: "9111100008", address: "Sector 5, Shimla" },
    { name: "Delta Distributors", phone: "9111100009", address: "Civil Lines, Jaipur" },
    { name: "Riverside Mart", phone: "9111100010", address: "Riverside Road, Ahmedabad" },
    { name: "Prime Traders", phone: "9111100011", address: "Park Street, Kolkata" },
    { name: "Nova Enterprises", phone: "9111100012", address: "HSR Layout, Bengaluru" },
  ];
  const clients: Array<{ id: string; name: string; phone: string }> = [];
  for (const c of clientsData) {
    const id = newId();
    const createdAt = new Date().toISOString();
    statements.push(
      `INSERT INTO clients (id, name, phone, address, notes, created_by, created_at) VALUES (${sqlQuote(id)}, ${sqlQuote(c.name)}, ${sqlQuote(c.phone)}, ${sqlQuote(c.address)}, ${sqlQuote(c.notes ?? null)}, ${sqlQuote(dealerId)}, ${sqlQuote(createdAt)});`
    );
    clients.push({ id, name: c.name, phone: c.phone });
  }

  console.error("Creating collections and payment history (Feb 2026 - Sep 2026)...");

  // Seed window: 1 Feb 2026 through "today" (the seed is meant to always
  // reach up to the current date so the demo never looks stale).
  const seedStart = new Date(2026, 1, 1); // 1 Feb 2026
  const seedEnd = new Date(); // today
  const totalSeedDays = Math.max(1, Math.floor((seedEnd.getTime() - seedStart.getTime()) / (24 * 60 * 60 * 1000)));

  function randomDateInWindow(): Date {
    const offset = randInt(0, totalSeedDays);
    return new Date(seedStart.getTime() + offset * 24 * 60 * 60 * 1000);
  }

  function addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  const REMARKS_POOL = [
    "Partial payment",
    "Second installment",
    "Full settlement",
    "Cash collected on-site",
    "Cleared outstanding balance",
    "Advance payment",
    "Monthly installment",
  ];

  const NUM_COLLECTIONS = 60;

  for (let i = 0; i < NUM_COLLECTIONS; i++) {
    const client = pick(clients);
    const employee = pick(employees);
    const totalAmount = randInt(4, 40) * 5000; // 20,000 - 200,000
    const collectionDate = randomDateInWindow();
    const dueDate = addDays(collectionDate, randInt(14, 45));

    // Bias outcomes: ~35% pending (no payments), ~35% partially collected,
    // ~30% fully completed — gives every status a healthy sample size.
    const outcomeRoll = random();
    let targetReceived: number;
    if (outcomeRoll < 0.35) {
      targetReceived = 0;
    } else if (outcomeRoll < 0.7) {
      targetReceived = Math.round((totalAmount * randInt(20, 80)) / 100 / 500) * 500;
    } else {
      targetReceived = totalAmount;
    }

    const numPayments = targetReceived === 0 ? 0 : randInt(1, 3);
    const paymentPlan: Array<{ amount: number; method: PaymentMethod; date: Date; remarks: string }> = [];
    let remainingToAllocate = targetReceived;

    for (let p = 0; p < numPayments; p++) {
      const isLast = p === numPayments - 1;
      const amount = isLast
        ? remainingToAllocate
        : Math.min(remainingToAllocate, Math.round((remainingToAllocate * randInt(30, 70)) / 100 / 500) * 500 || remainingToAllocate);
      if (amount <= 0) continue;
      remainingToAllocate -= amount;

      // Spread payment dates between the collection date and today (or due
      // date, whichever is earlier), never in the future.
      const latestPossible = new Date(Math.min(dueDate.getTime(), seedEnd.getTime()));
      const spanDays = Math.max(1, Math.floor((latestPossible.getTime() - collectionDate.getTime()) / (24 * 60 * 60 * 1000)));
      const paymentDate = addDays(collectionDate, randInt(1, spanDays));

      paymentPlan.push({ amount, method: pick(PAYMENT_METHODS), date: paymentDate, remarks: pick(REMARKS_POOL) });
    }

    const receivedAmount = paymentPlan.reduce((sum, p) => sum + p.amount, 0);
    const collectionId = newId();
    const collectionCreatedAt = new Date().toISOString();
    const status = computeStatus(totalAmount, receivedAmount);

    statements.push(
      `INSERT INTO collections (id, client_id, assigned_employee_id, total_amount, received_amount, remaining_amount, status, collection_date, due_date, notes, created_at, updated_at) VALUES (${sqlQuote(collectionId)}, ${sqlQuote(client.id)}, ${sqlQuote(employee.id)}, ${totalAmount}, ${receivedAmount}, ${totalAmount - receivedAmount}, ${sqlQuote(status)}, ${sqlQuote(collectionDate.toISOString())}, ${sqlQuote(dueDate.toISOString())}, ${sqlQuote("")}, ${sqlQuote(collectionCreatedAt)}, ${sqlQuote(collectionCreatedAt)});`
    );

    for (const payment of paymentPlan) {
      const paymentId = newId();
      const paymentCreatedAt = new Date().toISOString();
      statements.push(
        `INSERT INTO payments (id, collection_id, client_id, employee_id, client_name, client_phone, employee_name, amount, payment_method, remarks, payment_date, created_at) VALUES (${sqlQuote(paymentId)}, ${sqlQuote(collectionId)}, ${sqlQuote(client.id)}, ${sqlQuote(employee.id)}, ${sqlQuote(client.name)}, ${sqlQuote(client.phone)}, ${sqlQuote(employee.name)}, ${payment.amount}, ${sqlQuote(payment.method)}, ${sqlQuote(payment.remarks)}, ${sqlQuote(payment.date.toISOString())}, ${sqlQuote(paymentCreatedAt)});`
      );
    }
  }

  console.log(statements.join("\n"));

  console.error("\nSeed SQL generated.\n");
  console.error("Demo credentials (development only):");
  console.error("  Dealer:   dealer / password123");
  for (const e of employeesData) {
    console.error(`  Employee: ${e.username} / password123`);
  }
  console.error("");
}

seed().catch((err) => {
  console.error("Seed generation failed:", err);
  process.exit(1);
});
