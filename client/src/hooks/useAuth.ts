import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changeMyPassword, getMe, getMyPassword, login, logout } from "@/services/auth";
import type { ChangePasswordRequest, LoginRequest } from "@shared/types";

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
