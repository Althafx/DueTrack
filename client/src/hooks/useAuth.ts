import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changeMyPassword,
  createDealer,
  deleteDealer,
  getDealers,
  getMe,
  getMyPassword,
  login,
  logout,
  updateMe,
} from "@/services/auth";
import type { ChangePasswordRequest, CreateDealerRequest, LoginRequest, UpdateMeRequest } from "@shared/types";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: getMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoginRequest) => login(payload),
    onSuccess: (user) => {
      queryClient.setQueryData(["auth", "me"], user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.clear();
    },
  });
}

export function useMyPassword(enabled: boolean) {
  return useQuery({
    queryKey: ["auth", "me", "password"],
    queryFn: getMyPassword,
    enabled,
  });
}

export function useChangeMyPassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordRequest) => changeMyPassword(payload),
  });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateMeRequest) => updateMe(payload),
    onSuccess: (user) => {
      queryClient.setQueryData(["auth", "me"], user);
    },
  });
}

export function useCreateDealer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDealerRequest) => createDealer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "dealers"] });
    },
  });
}

export function useDealers(enabled: boolean) {
  return useQuery({
    queryKey: ["auth", "dealers"],
    queryFn: getDealers,
    enabled,
  });
}

export function useDeleteDealer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDealer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "dealers"] });
    },
  });
}
