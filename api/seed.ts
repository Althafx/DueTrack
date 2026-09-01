// Development/demo data seeder — run manually via `npm run seed`.
// Never invoked automatically on server boot. Safe to re-run: it clears
// only the demo dataset before recreating it.
import "./utils/loadEnv";
import mongoose from "mongoose";
import { User } from "./models/User";
import { Client } from "./models/Client";
import { Collection } from "./models/Collection";
import { Payment } from "./models/Payment";
import { computeStatus } from "./utils/status";

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

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);

  console.log("Clearing existing demo data...");
  await Promise.all([
    User.deleteMany({}),
    Client.deleteMany({}),
    Collection.deleteMany({}),
    Payment.deleteMany({}),
  ]);

  console.log("Creating users...");
  const dealer = await User.create({
    name: "Demo Dealer",
    username: "dealer",
    password: "password123",
    phone: "9876543210",
    role: "DEALER",
    status: "ACTIVE",
  });

  const employeesData = [
    { name: "Rahul Sharma", username: "rahul", phone: "9876500001" },
    { name: "Priya Verma", username: "priya", phone: "9876500002" },
    { name: "Arjun Mehta", username: "arjun", phone: "9876500003" },
    { name: "Sneha Iyer", username: "sneha", phone: "9876500004" },
  ];
  const employees = await Promise.all(
    employeesData.map((e) =>
      User.create({ ...e, password: "password123", role: "EMPLOYEE", status: "ACTIVE" })
    )
  );

  console.log("Creating clients...");
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
  const clients = await Client.insertMany(clientsData.map((c) => ({ ...c, createdBy: dealer.id })));

  console.log("Creating collections and payment history (Feb 2026 - Sep 2026)...");

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

    const collection = await Collection.create({
      client: client.id,
      assignedEmployee: employee.id,
      totalAmount,
      receivedAmount,
      remainingAmount: totalAmount - receivedAmount,
      status: computeStatus(totalAmount, receivedAmount),
      collectionDate,
      dueDate,
      notes: "",
    });

    for (const payment of paymentPlan) {
      await Payment.create({
        collection: collection.id,
        client: client.id,
        employee: employee.id,
        clientName: client.name,
        clientPhone: client.phone,
        employeeName: employee.name,
        amount: payment.amount,
        paymentMethod: payment.method,
        remarks: payment.remarks,
        paymentDate: payment.date,
      });
    }
  }

  console.log("\nSeed complete.\n");
  console.log("Demo credentials (development only):");
  console.log("  Dealer:   dealer / password123");
  for (const e of employeesData) {
    console.log(`  Employee: ${e.username} / password123`);
  }
  console.log("");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
