import { useMutation, useQuery } from "@tanstack/react-query";
import {
  login as loginRequest,
  register as registerRequest,
  me as meRequest,
  wakeUp as wakeUpRequest,
  type LoginRequest,
  type RegisterRequest,
  type LoginResponse,
  type RegisterResponse,
  type MeResponse,
  UserRole,
} from "@/api/auth";
import authService from "@/utils/auth";

// Re-export UserRole for convenience
export { UserRole };

export function useLogin() {
  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: async (payload: LoginRequest) => {
      const result = await loginRequest(payload);
      // Il cookie httpOnly viene impostato automaticamente dal backend.
      // Salviamo il token in memoria SOLO per Socket.IO.
      authService.setAuthToken(result.data.token);
      // Salviamo i dati utente per caching locale
      authService.setUserData(result.data.user);
      return result;
    },
  });
}

export function useRegister() {
  return useMutation<RegisterResponse, Error, RegisterRequest>({
    mutationFn: async (payload: RegisterRequest) => {
      const result = await registerRequest(payload);
      return result;
    },
  });
}

export function useMe() {
  return useQuery<MeResponse, Error>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      return await meRequest();
    },
    retry: 0,
    staleTime: 60 * 1000,
  });
}

export function useWakeUp() {
  return useQuery<void, Error>({
    queryKey: ["auth", "wakeUp"],
    queryFn: () => wakeUpRequest(),
    retry: 1, // Riprova una volta se fallisce
    staleTime: Infinity, // Non rieseguire automaticamente la query
  });
}
