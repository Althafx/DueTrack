import type { Request, Response } from "express";
import { z } from "zod";
import { countActiveCollectionsForEmployee, listCollections } from "../db/collections";
import { createUser, deleteEmployeeById, findEmployeeById, listEmployees as listEmployeeRows, updateUser } from "../db/users";
import { ApiError } from "../utils/status";
import { toUserDTO } from "../utils/mappers";
import { asyncHandler } from "../utils/asyncHandler";
import { decrypt } from "../utils/crypto";
import { hashAndEncryptPassword } from "../utils/password";

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
  const employees = await listEmployeeRows();
  res.json({ employees: employees.map(toUserDTO) });
});

export const createEmployee = asyncHandler(async (req: Request, res: Response) => {
  const { name, phone, username, password } = req.body as z.infer<typeof createEmployeeSchema>;
  const { password: hash, encryptedPassword } = await hashAndEncryptPassword(password);

  const employee = await createUser({
    name,
    phone,
    username,
    password: hash,
    encryptedPassword,
    role: "EMPLOYEE",
  });

  res.status(201).json({ employee: toUserDTO(employee) });
});

export const getEmployee = asyncHandler(async (req: Request, res: Response) => {
  const employee = await findEmployeeById(req.params.id);
  if (!employee) throw new ApiError(404, "Employee not found");

  const collections = await listCollections({ assignedEmployeeId: employee.id });

  const performance = collections.reduce(
    (acc, c) => {
      acc.totalAssigned += c.total_amount;
      acc.totalCollected += c.received_amount;
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
  const employee = await findEmployeeById(req.params.id, { withEncryptedPassword: true });
  if (!employee) throw new ApiError(404, "Employee not found");
  res.json({ password: decrypt(employee.encrypted_password!) });
});

export const updateEmployee = asyncHandler(async (req: Request, res: Response) => {
  const employee = await findEmployeeById(req.params.id);
  if (!employee) throw new ApiError(404, "Employee not found");

  const { name, phone, username, password, status } = req.body as z.infer<typeof updateEmployeeSchema>;

  const patch: Parameters<typeof updateUser>[1] = { name, phone, username, status };
  if (password) {
    const { password: hash, encryptedPassword } = await hashAndEncryptPassword(password);
    patch.password = hash;
    patch.encryptedPassword = encryptedPassword;
  }

  await updateUser(employee.id, patch);
  const updated = await findEmployeeById(employee.id);
  res.json({ employee: toUserDTO(updated!) });
});

export const deleteEmployee = asyncHandler(async (req: Request, res: Response) => {
  const activeCollections = await countActiveCollectionsForEmployee(req.params.id);
  if (activeCollections > 0) {
    throw new ApiError(
      400,
      "Cannot delete an employee with pending or partially collected collections — reassign them first."
    );
  }

  const deleted = await deleteEmployeeById(req.params.id);
  if (!deleted) throw new ApiError(404, "Employee not found");

  // Payment records are intentionally left untouched — they store the
  // employee's name/details directly, so History stays fully viewable.
  res.json({ message: "Employee deleted" });
});
