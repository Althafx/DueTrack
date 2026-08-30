import type { Request, Response } from "express";
import { z } from "zod";
import { User } from "../models/User";
import { Collection } from "../models/Collection";
import { ApiError } from "../utils/status";
import { toUserDTO } from "../utils/mappers";
import { asyncHandler } from "../utils/asyncHandler";
import { decrypt } from "../utils/crypto";

export const createEmployeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const listEmployees = asyncHandler(async (_req: Request, res: Response) => {
  const employees = await User.find({ role: "EMPLOYEE" }).sort({ createdAt: -1 });
  res.json({ employees: employees.map(toUserDTO) });
});

export const createEmployee = asyncHandler(async (req: Request, res: Response) => {
  const employee = await User.create({ ...req.body, role: "EMPLOYEE" });
  res.status(201).json({ employee: toUserDTO(employee) });
});

export const getEmployee = asyncHandler(async (req: Request, res: Response) => {
  const employee = await User.findOne({ _id: req.params.id, role: "EMPLOYEE" });
  if (!employee) throw new ApiError(404, "Employee not found");

  const collections = await Collection.find({ assignedEmployee: employee.id });

  const performance = collections.reduce(
    (acc, c) => {
      acc.totalAssigned += c.totalAmount;
      acc.totalCollected += c.receivedAmount;
      if (c.status === "PENDING") acc.pendingCount += 1;
      else if (c.status === "PARTIALLY_COLLECTED") acc.partiallyCollectedCount += 1;
      else acc.completedCount += 1;
      return acc;
    },
    { totalAssigned: 0, totalCollected: 0, pendingCount: 0, partiallyCollectedCount: 0, completedCount: 0 }
  );

  res.json({ employee: toUserDTO(employee), performance });
});

export const getEmployeePassword = asyncHandler(async (req: Request, res: Response) => {
  const employee = await User.findOne({ _id: req.params.id, role: "EMPLOYEE" }).select("+encryptedPassword");
  if (!employee) throw new ApiError(404, "Employee not found");
  res.json({ password: decrypt(employee.encryptedPassword) });
});

export const updateEmployee = asyncHandler(async (req: Request, res: Response) => {
  const employee = await User.findOne({ _id: req.params.id, role: "EMPLOYEE" }).select("+password");
  if (!employee) throw new ApiError(404, "Employee not found");

  Object.assign(employee, req.body);
  await employee.save();

  res.json({ employee: toUserDTO(employee) });
});

export const deleteEmployee = asyncHandler(async (req: Request, res: Response) => {
  const activeCollections = await Collection.countDocuments({
    assignedEmployee: req.params.id,
    status: { $ne: "COMPLETED" },
  });
  if (activeCollections > 0) {
    throw new ApiError(
      400,
      "Cannot delete an employee with pending or partially collected collections — reassign them first."
    );
  }

  const employee = await User.findOneAndDelete({ _id: req.params.id, role: "EMPLOYEE" });
  if (!employee) throw new ApiError(404, "Employee not found");

  // Payment records are intentionally left untouched — they store the
  // employee's name/details directly, so History stays fully viewable.
  res.json({ message: "Employee deleted" });
});
