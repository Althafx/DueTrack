import { api } from "./api";
import type { CreateEmployeeRequest, EmployeePerformanceDTO, PasswordViewDTO, UpdateEmployeeRequest, UserDTO } from "@shared/types";

export async function fetchEmployees(): Promise<UserDTO[]> {
  const { data } = await api.get<{ employees: UserDTO[] }>("/employees");
  return data.employees;
}

export async function fetchEmployee(id: string): Promise<{ employee: UserDTO; performance: EmployeePerformanceDTO }> {
  const { data } = await api.get(`/employees/${id}`);
  return data;
}

export async function fetchEmployeePassword(id: string): Promise<string> {
  const { data } = await api.get<PasswordViewDTO>(`/employees/${id}/password`);
  return data.password;
}

export async function createEmployee(payload: CreateEmployeeRequest): Promise<UserDTO> {
  const { data } = await api.post<{ employee: UserDTO }>("/employees", payload);
  return data.employee;
}

export async function updateEmployee(id: string, payload: UpdateEmployeeRequest): Promise<UserDTO> {
  const { data } = await api.patch<{ employee: UserDTO }>(`/employees/${id}`, payload);
  return data.employee;
}

export async function deleteEmployee(id: string): Promise<void> {
  await api.delete(`/employees/${id}`);
}
