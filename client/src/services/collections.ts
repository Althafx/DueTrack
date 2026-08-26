import { api } from "./api";
import type { CollectionDTO, CollectionFilters, CreateCollectionRequest } from "@shared/types";

export async function fetchCollections(filters: CollectionFilters = {}): Promise<CollectionDTO[]> {
  const { data } = await api.get<{ collections: CollectionDTO[] }>("/collections", { params: filters });
  return data.collections;
}

export async function fetchCollection(id: string): Promise<CollectionDTO> {
  const { data } = await api.get<{ collection: CollectionDTO }>(`/collections/${id}`);
  return data.collection;
}

export async function createCollection(payload: CreateCollectionRequest): Promise<CollectionDTO> {
  const { data } = await api.post<{ collection: CollectionDTO }>("/collections", payload);
  return data.collection;
}

export async function updateCollection(
  id: string,
  payload: Partial<CreateCollectionRequest>
): Promise<CollectionDTO> {
  const { data } = await api.patch<{ collection: CollectionDTO }>(`/collections/${id}`, payload);
  return data.collection;
}

export async function deleteCollection(id: string): Promise<void> {
  await api.delete(`/collections/${id}`);
}
