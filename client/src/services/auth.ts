import { api } from "./api";
import type { ChangePasswordRequest, LoginRequest, PasswordViewDTO, UserDTO } from "@shared/types";

export async function login(payload: LoginRequest): Promise<UserDTO> {
  const { data } = await api.post<{ user: UserDTO }>("/auth/login", payload);
  return data.user;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function getMe(): Promise<UserDTO> {
  const { data } = await api.get<{ user: UserDTO }>("/auth/me");
  return data.user;
}

export async function getMyPassword(): Promise<string> {
  const { data } = await api.get<PasswordViewDTO>("/auth/me/password");
  return data.password;
}

export async function changeMyPassword(payload: ChangePasswordRequest): Promise<void> {
  await api.patch("/auth/me/password", payload);
}
