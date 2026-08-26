import type { Request, Response } from "express";
import { z } from "zod";
import { Client } from "../models/Client";
import { Collection } from "../models/Collection";
import { ApiError } from "../utils/status";
import { toClientDTO, toCollectionDTO } from "../utils/mappers";
import { asyncHandler } from "../utils/asyncHandler";

export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  notes: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const listClients = asyncHandler(async (req: Request, res: Response) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  const filter = search
    ? { $or: [{ name: new RegExp(escapeRegex(search), "i") }, { phone: new RegExp(escapeRegex(search), "i") }] }
    : {};

  const clients = await Client.find(filter).sort({ createdAt: -1 });
  res.json({ clients: clients.map(toClientDTO) });
});

export const createClient = asyncHandler(async (req: Request, res: Response) => {
  const client = await Client.create({ ...req.body, createdBy: req.user!.id });
  res.status(201).json({ client: toClientDTO(client) });
});

export const getClient = asyncHandler(async (req: Request, res: Response) => {
  const client = await Client.findById(req.params.id);
  if (!client) throw new ApiError(404, "Client not found");

  const collections = await Collection.find({ client: client.id })
    .populate("client")
    .populate("assignedEmployee")
    .sort({ createdAt: -1 });

  const totals = collections.reduce(
    (acc, c) => {
      acc.totalAmount += c.totalAmount;
      acc.receivedAmount += c.receivedAmount;
      acc.remainingAmount += c.remainingAmount;
      return acc;
    },
    { totalAmount: 0, receivedAmount: 0, remainingAmount: 0 }
  );

  res.json({
    client: { ...toClientDTO(client), ...totals },
    collections: collections.map((c) => toCollectionDTO(c as any)),
  });
});

export const updateClient = asyncHandler(async (req: Request, res: Response) => {
  const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!client) throw new ApiError(404, "Client not found");
  res.json({ client: toClientDTO(client) });
});

export const deleteClient = asyncHandler(async (req: Request, res: Response) => {
  const activeCollections = await Collection.countDocuments({
    client: req.params.id,
    status: { $ne: "COMPLETED" },
  });
  if (activeCollections > 0) {
    throw new ApiError(400, "Cannot delete a client with pending or partially collected collections");
  }

  const client = await Client.findByIdAndDelete(req.params.id);
  if (!client) throw new ApiError(404, "Client not found");
  res.json({ message: "Client deleted" });
});

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
