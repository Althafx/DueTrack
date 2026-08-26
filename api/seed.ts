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
    email: "dealer@example.com",
    password: "password123",
    phone: "9876543210",
    role: "DEALER",
    status: "ACTIVE",
  });

  const employee1 = await User.create({
    name: "Rahul Sharma",
    email: "employee@example.com",
    password: "password123",
    phone: "9876500001",
    role: "EMPLOYEE",
    status: "ACTIVE",
  });

  const employee2 = await User.create({
    name: "Priya Verma",
    email: "priya@example.com",
    password: "password123",
    phone: "9876500002",
    role: "EMPLOYEE",
    status: "ACTIVE",
  });

  console.log("Creating clients...");
  const clientsData = [
    { name: "Amit Traders", phone: "9111100001", address: "MG Road, Pune", notes: "Wholesale buyer" },
    { name: "Singh Enterprises", phone: "9111100002", address: "Sector 18, Noida" },
    { name: "Kumar & Sons", phone: "9111100003", address: "Anna Nagar, Chennai" },
    { name: "Sunrise Distributors", phone: "9111100004", address: "Salt Lake, Kolkata" },
    { name: "Green Valley Store", phone: "9111100005", address: "Banjara Hills, Hyderabad" },
  ];
  const clients = await Client.insertMany(
    clientsData.map((c) => ({ ...c, createdBy: dealer.id }))
  );

  console.log("Creating collections and payment history...");

  const today = new Date();
  const daysAgo = (n: number) => new Date(today.getTime() - n * 24 * 60 * 60 * 1000);

  type SeedPlan = {
    client: (typeof clients)[number];
    employee: typeof employee1;
    totalAmount: number;
    payments: Array<{ amount: number; method: "CASH" | "BANK_TRANSFER" | "UPI" | "OTHER"; daysAgo: number; remarks: string }>;
  };

  const plans: SeedPlan[] = [
    {
      client: clients[0],
      employee: employee1,
      totalAmount: 100000,
      payments: [
        { amount: 10000, method: "CASH", daysAgo: 3, remarks: "Partial payment" },
        { amount: 20000, method: "UPI", daysAgo: 1, remarks: "Second payment" },
      ],
    },
    {
      client: clients[1],
      employee: employee1,
      totalAmount: 50000,
      payments: [{ amount: 50000, method: "BANK_TRANSFER", daysAgo: 5, remarks: "Full settlement" }],
    },
    {
      client: clients[2],
      employee: employee2,
      totalAmount: 40000,
      payments: [{ amount: 40000, method: "CASH", daysAgo: 90, remarks: "Old settlement, outside the last month" }],
    },
    {
      client: clients[2],
      employee: employee2,
      totalAmount: 75000,
      payments: [],
    },
    {
      client: clients[3],
      employee: employee2,
      totalAmount: 30000,
      payments: [{ amount: 15000, method: "CASH", daysAgo: 0, remarks: "Collected today" }],
    },
    {
      client: clients[4],
      employee: employee1,
      totalAmount: 20000,
      payments: [{ amount: 20000, method: "UPI", daysAgo: 0, remarks: "Paid in full today" }],
    },
  ];

  for (const plan of plans) {
    const receivedAmount = plan.payments.reduce((sum, p) => sum + p.amount, 0);
    const collection = await Collection.create({
      client: plan.client.id,
      assignedEmployee: plan.employee.id,
      totalAmount: plan.totalAmount,
      receivedAmount,
      remainingAmount: plan.totalAmount - receivedAmount,
      status: computeStatus(plan.totalAmount, receivedAmount),
      collectionDate: daysAgo(7),
      dueDate: daysAgo(-14),
      notes: "",
    });

    for (const payment of plan.payments) {
      await Payment.create({
        collection: collection.id,
        client: plan.client.id,
        employee: plan.employee.id,
        clientName: plan.client.name,
        clientPhone: plan.client.phone,
        employeeName: plan.employee.name,
        amount: payment.amount,
        paymentMethod: payment.method,
        remarks: payment.remarks,
        paymentDate: daysAgo(payment.daysAgo),
      });
    }
  }

  console.log("\nSeed complete.\n");
  console.log("Demo credentials (development only):");
  console.log("  Dealer:   dealer@example.com / password123");
  console.log("  Employee: employee@example.com / password123");
  console.log("  Employee: priya@example.com / password123\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
