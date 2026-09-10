import type { Request, Response } from "express";
import { z } from "zod";
import {
  createCollection as createCollectionRow,
  deleteCollection as deleteCollectionRow,
  findCollectionById,
  findCollectionWithRefs,
  listCollectionsWithRefs,
  updateCollection as updateCollectionRow,
  type CollectionListFilter,
} from "../db/collections";
import { findClientById } from "../db/clients";
import { findEmployeeById } from "../db/users";
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

export const listCollections = asyncHandler(async (req: Request, res: Response) => {
  const { status, employee, client, dateFrom, dateTo } = req.query as Record<string, string | undefined>;

  const filter: CollectionListFilter = {};

  if (req.user!.role === "EMPLOYEE") {
    filter.assignedEmployeeId = req.user!.id;
  } else if (employee) {
    filter.assignedEmployeeId = employee;
  }

  if (status) filter.status = status as CollectionListFilter["status"];
  if (client) filter.clientId = client;
  if (dateFrom) filter.dateFrom = dateFrom;
  if (dateTo) filter.dateTo = dateTo;

  const collections = await listCollectionsWithRefs(filter);
  res.json({ collections: collections.map(toCollectionDTO) });
});

export const createCollection = asyncHandler(async (req: Request, res: Response) => {
  const { client, assignedEmployee, totalAmount, collectionDate, dueDate, notes } = req.body as z.infer<
    typeof createCollectionSchema
  >;

  const [clientRow, employeeRow] = await Promise.all([findClientById(client), findEmployeeById(assignedEmployee)]);

  if (!clientRow) throw new ApiError(404, "Client not found");
  if (!employeeRow) throw new ApiError(404, "Employee not found");
  if (employeeRow.status !== "ACTIVE") throw new ApiError(400, "Cannot assign to an inactive employee");

  const created = await createCollectionRow({
    clientId: client,
    assignedEmployeeId: assignedEmployee,
    totalAmount,
    receivedAmount: 0,
    remainingAmount: totalAmount,
    status: "PENDING",
    collectionDate: new Date(collectionDate).toISOString(),
    dueDate: new Date(dueDate).toISOString(),
    notes,
  });

  const populated = await findCollectionWithRefs(created.id);
  res.status(201).json({ collection: toCollectionDTO(populated!) });
});

export const getCollection = asyncHandler(async (req: Request, res: Response) => {
  const collection = await findCollectionWithRefs(req.params.id);
  if (!collection) throw new ApiError(404, "Collection not found");

  if (req.user!.role === "EMPLOYEE" && String(collection.assigned_employee_id) !== String(req.user!.id)) {
    throw new ApiError(403, "You can only view your own assigned collections");
  }

  res.json({ collection: toCollectionDTO(collection) });
});

export const updateCollection = asyncHandler(async (req: Request, res: Response) => {
  const collection = await findCollectionById(req.params.id);
  if (!collection) throw new ApiError(404, "Collection not found");

  const { assignedEmployee, totalAmount, collectionDate, dueDate, notes } = req.body as z.infer<
    typeof updateCollectionSchema
  >;

  const patch: Parameters<typeof updateCollectionRow>[1] = {};

  if (assignedEmployee) {
    const employeeRow = await findEmployeeById(assignedEmployee);
    if (!employeeRow) throw new ApiError(404, "Employee not found");
    if (employeeRow.status !== "ACTIVE") throw new ApiError(400, "Cannot assign to an inactive employee");
    patch.assignedEmployeeId = employeeRow.id;
  }

  if (totalAmount !== undefined) {
    if (totalAmount < collection.received_amount) {
      throw new ApiError(400, "Total amount cannot be less than the amount already received");
    }
    patch.totalAmount = totalAmount;
    patch.remainingAmount = totalAmount - collection.received_amount;
    patch.status = computeStatus(totalAmount, collection.received_amount);
  }

  const nextCollectionDate = collectionDate ? new Date(collectionDate) : new Date(collection.collection_date);
  const nextDueDate = dueDate ? new Date(dueDate) : new Date(collection.due_date);
  if ((collectionDate || dueDate) && nextDueDate <= nextCollectionDate) {
    throw new ApiError(400, "Due date must be after the collection date");
  }

  if (collectionDate) patch.collectionDate = nextCollectionDate.toISOString();
  if (dueDate) patch.dueDate = nextDueDate.toISOString();
  if (notes !== undefined) patch.notes = notes;

  await updateCollectionRow(req.params.id, patch);
  const populated = await findCollectionWithRefs(req.params.id);
  res.json({ collection: toCollectionDTO(populated!) });
});

export const deleteCollection = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await deleteCollectionRow(req.params.id);
  if (!deleted) throw new ApiError(404, "Collection not found");
  // Payment records are intentionally left untouched — they store client and
  // employee directly, so payment history remains fully viewable after the
  // parent collection is deleted.
  res.json({ message: "Collection deleted" });
});
