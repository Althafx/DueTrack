import type { Request, Response } from "express";
import { z } from "zod";
import { Collection } from "../models/Collection";
import { Client } from "../models/Client";
import { User } from "../models/User";
import { ApiError } from "../utils/status";
import { computeStatus } from "../utils/status";
import { isAfter, isValidDateString } from "../utils/dates";
import { toCollectionDTO } from "../utils/mappers";
import { asyncHandler } from "../utils/asyncHandler";

const dateString = z.string().min(1).refine(isValidDateString, "Invalid date");

export const createCollectionSchema = z
  .object({
    client: z.string().min(1),
    assignedEmployee: z.string().min(1),
    totalAmount: z.number().positive("Total amount must be greater than 0"),
    collectionDate: dateString,
    dueDate: dateString,
    notes: z.string().optional(),
  })
  .refine((data) => isAfter(data.dueDate, data.collectionDate), {
    message: "Due date must be after the collection date",
    path: ["dueDate"],
  });

export const updateCollectionSchema = z
  .object({
    assignedEmployee: z.string().min(1).optional(),
    totalAmount: z.number().positive().optional(),
    collectionDate: dateString.optional(),
    dueDate: dateString.optional(),
    notes: z.string().optional(),
  })
  .refine((data) => !data.collectionDate || !data.dueDate || isAfter(data.dueDate, data.collectionDate), {
    message: "Due date must be after the collection date",
    path: ["dueDate"],
  });

const POPULATE = ["client", "assignedEmployee"];

export const listCollections = asyncHandler(async (req: Request, res: Response) => {
  const { status, employee, client, dateFrom, dateTo } = req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = {};

  if (req.user!.role === "EMPLOYEE") {
    filter.assignedEmployee = req.user!.id;
  } else if (employee) {
    filter.assignedEmployee = employee;
  }

  if (status) filter.status = status;
  if (client) filter.client = client;

  if (dateFrom || dateTo) {
    filter.collectionDate = {};
    if (dateFrom) (filter.collectionDate as Record<string, Date>).$gte = new Date(dateFrom);
    if (dateTo) (filter.collectionDate as Record<string, Date>).$lte = new Date(dateTo);
  }

  const collections = await Collection.find(filter).populate(POPULATE).sort({ createdAt: -1 });
  res.json({ collections: collections.map((c) => toCollectionDTO(c as any)) });
});

export const createCollection = asyncHandler(async (req: Request, res: Response) => {
  const { client, assignedEmployee, totalAmount, collectionDate, dueDate, notes } = req.body as z.infer<
    typeof createCollectionSchema
  >;

  const [clientDoc, employeeDoc] = await Promise.all([
    Client.findById(client),
    User.findOne({ _id: assignedEmployee, role: "EMPLOYEE" }),
  ]);

  if (!clientDoc) throw new ApiError(404, "Client not found");
  if (!employeeDoc) throw new ApiError(404, "Employee not found");
  if (employeeDoc.status !== "ACTIVE") throw new ApiError(400, "Cannot assign to an inactive employee");

  const collection = await Collection.create({
    client,
    assignedEmployee,
    totalAmount,
    receivedAmount: 0,
    remainingAmount: totalAmount,
    status: "PENDING",
    collectionDate: new Date(collectionDate),
    dueDate: new Date(dueDate),
    notes,
  });

  const populated = await collection.populate(POPULATE);
  res.status(201).json({ collection: toCollectionDTO(populated as any) });
});

export const getCollection = asyncHandler(async (req: Request, res: Response) => {
  const collection = await Collection.findById(req.params.id).populate(POPULATE);
  if (!collection) throw new ApiError(404, "Collection not found");

  if (req.user!.role === "EMPLOYEE" && String((collection.assignedEmployee as any).id) !== String(req.user!.id)) {
    throw new ApiError(403, "You can only view your own assigned collections");
  }

  res.json({ collection: toCollectionDTO(collection as any) });
});

export const updateCollection = asyncHandler(async (req: Request, res: Response) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) throw new ApiError(404, "Collection not found");

  const { assignedEmployee, totalAmount, collectionDate, dueDate, notes } = req.body as z.infer<
    typeof updateCollectionSchema
  >;

  if (assignedEmployee) {
    const employeeDoc = await User.findOne({ _id: assignedEmployee, role: "EMPLOYEE" });
    if (!employeeDoc) throw new ApiError(404, "Employee not found");
    if (employeeDoc.status !== "ACTIVE") throw new ApiError(400, "Cannot assign to an inactive employee");
    collection.assignedEmployee = employeeDoc.id;
  }

  if (totalAmount !== undefined) {
    if (totalAmount < collection.receivedAmount) {
      throw new ApiError(400, "Total amount cannot be less than the amount already received");
    }
    collection.totalAmount = totalAmount;
    collection.remainingAmount = totalAmount - collection.receivedAmount;
    collection.status = computeStatus(totalAmount, collection.receivedAmount);
  }

  const nextCollectionDate = collectionDate ? new Date(collectionDate) : collection.collectionDate;
  const nextDueDate = dueDate ? new Date(dueDate) : collection.dueDate;
  if ((collectionDate || dueDate) && nextDueDate <= nextCollectionDate) {
    throw new ApiError(400, "Due date must be after the collection date");
  }

  if (collectionDate) collection.collectionDate = nextCollectionDate;
  if (dueDate) collection.dueDate = nextDueDate;
  if (notes !== undefined) collection.notes = notes;

  await collection.save();
  const populated = await collection.populate(POPULATE);
  res.json({ collection: toCollectionDTO(populated as any) });
});

export const deleteCollection = asyncHandler(async (req: Request, res: Response) => {
  const collection = await Collection.findByIdAndDelete(req.params.id);
  if (!collection) throw new ApiError(404, "Collection not found");
  // Payment records are intentionally left untouched — they store client and
  // employee directly, so payment history remains fully viewable after the
  // parent collection is deleted.
  res.json({ message: "Collection deleted" });
});
