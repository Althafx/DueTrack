import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCollection,
  deleteCollection,
  fetchCollection,
  fetchCollections,
  updateCollection,
} from "@/services/collections";
import type { CollectionFilters, CreateCollectionRequest } from "@shared/types";

export function useCollections(filters: CollectionFilters = {}) {
  return useQuery({
    queryKey: ["collections", filters],
    queryFn: () => fetchCollections(filters),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useCollection(id: string | undefined) {
  return useQuery({
    queryKey: ["collections", "detail", id],
    queryFn: () => fetchCollection(id as string),
    enabled: !!id,
    refetchInterval: 15_000,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCollectionRequest) => createCollection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateCollection(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CreateCollectionRequest>) => updateCollection(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
