import type { Request, Response } from "express";
import { z } from "zod";
import { countActiveCollectionsForClient, listCollectionsWithRefs } from "../db/collections";
import {
  createClient as createClientRow,
  deleteClient as deleteClientRow,
  findClientById,
  listClients as listClientRows,
  updateClient as updateClientRow,
} from "../db/clients";
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

  const clients = await listClientRows(search || undefined);
  res.json({ clients: clients.map(toClientDTO) });
});

export const createClient = asyncHandler(async (req: Request, res: Response) => {
  const client = await createClientRow({ ...req.body, createdBy: req.user!.id });
  res.status(201).json({ client: toClientDTO(client) });
});

export const getClient = asyncHandler(async (req: Request, res: Response) => {
  const client = await findClientById(req.params.id);
  if (!client) throw new ApiError(404, "Client not found");

  const collections = await listCollectionsWithRefs({ clientId: client.id });

  const totals = collections.reduce(
    (acc, c) => {
      acc.totalAmount += c.total_amount;
      acc.receivedAmount += c.received_amount;
      acc.remainingAmount += c.remaining_amount;
      return acc;
    },
    { totalAmount: 0, receivedAmount: 0, remainingAmount: 0 }
  );

  res.json({
    client: { ...toClientDTO(client), ...totals },
    collections: collections.map(toCollectionDTO),
  });
});

export const updateClient = asyncHandler(async (req: Request, res: Response) => {
  const existing = await findClientById(req.params.id);
  if (!existing) throw new ApiError(404, "Client not found");

  await updateClientRow(req.params.id, req.body);
  const client = await findClientById(req.params.id);
  res.json({ client: toClientDTO(client!) });
});

export const deleteClient = asyncHandler(async (req: Request, res: Response) => {
  const activeCollections = await countActiveCollectionsForClient(req.params.id);
  if (activeCollections > 0) {
    throw new ApiError(400, "Cannot delete a client with pending or partially collected collections");
  }

  const deleted = await deleteClientRow(req.params.id);
  if (!deleted) throw new ApiError(404, "Client not found");
  res.json({ message: "Client deleted" });
});
