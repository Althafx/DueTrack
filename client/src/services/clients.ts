import { api } from "./api";
import type { ClientDTO, ClientWithTotalsDTO, CollectionDTO, CreateClientRequest } from "@shared/types";

export async function fetchClients(search?: string): Promise<ClientDTO[]> {
  const { data } = await api.get<{ clients: ClientDTO[] }>("/clients", { params: { search } });
  return data.clients;
}

export async function fetchClient(id: string): Promise<{ client: ClientWithTotalsDTO; collections: CollectionDTO[] }> {
  const { data } = await api.get(`/clients/${id}`);
  return data;
}

export async function createClient(payload: CreateClientRequest): Promise<ClientDTO> {
  const { data } = await api.post<{ client: ClientDTO }>("/clients", payload);
  return data.client;
}

export async function updateClient(id: string, payload: Partial<CreateClientRequest>): Promise<ClientDTO> {
  const { data } = await api.patch<{ client: ClientDTO }>(`/clients/${id}`, payload);
  return data.client;
}

export async function deleteClient(id: string): Promise<void> {
  await api.delete(`/clients/${id}`);
}
