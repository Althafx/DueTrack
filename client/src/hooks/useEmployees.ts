import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEmployee, deleteEmployee, fetchEmployee, fetchEmployees, updateEmployee } from "@/services/employees";
import type { CreateEmployeeRequest } from "@shared/types";

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: fetchEmployees,
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ["employees", id],
    queryFn: () => fetchEmployee(id as string),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEmployeeRequest) => createEmployee(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useUpdateEmployee(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CreateEmployeeRequest & { status: "ACTIVE" | "INACTIVE" }>) =>
      updateEmployee(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });
}
