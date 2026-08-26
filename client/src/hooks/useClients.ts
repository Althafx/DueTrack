import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient, deleteClient, fetchClient, fetchClients, updateClient } from "@/services/clients";
import type { CreateClientRequest } from "@shared/types";

export function useClients(search?: string) {
  return useQuery({
    queryKey: ["clients", { search }],
    queryFn: () => fetchClients(search),
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: () => fetchClient(id as string),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClientRequest) => createClient(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useUpdateClient(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CreateClientRequest>) => updateClient(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });
}
