import { useMutation, useQuery } from "@tanstack/react-query";
import {
  login as loginRequest,
  googleLogin as googleLoginRequest,
  register as registerRequest,
  me as meRequest,
  wakeUp as wakeUpRequest,
  forgotPassword as forgotPasswordRequest,
  resetPassword as resetPasswordRequest,
  type LoginRequest,
  type GoogleLoginRequest,
  type LoginResponse,
  type GoogleLoginResponse,
  type RegisterRequest,
  type RegisterResponse,
  type MeResponse,
  type ForgotPasswordRequest,
  type ForgotPasswordResponse,
  type ResetPasswordRequest,
  type ResetPasswordResponse,
  type AuthApiError,
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
      // NOTA: I dati utente NON vengono salvati in cookie per sicurezza.
      // React Query gestisce il caching tramite /auth/me (useMe hook).
      return result;
    },
  });
}

export function useGoogleLogin() {
  return useMutation<GoogleLoginResponse, AuthApiError, GoogleLoginRequest>({
    mutationFn: async (payload: GoogleLoginRequest) => {
      const result = await googleLoginRequest(payload);
      authService.setAuthToken(result.data.token);
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
    retry: 1,
    staleTime: Infinity,
  });
}

export function useForgotPassword() {
  return useMutation<ForgotPasswordResponse, AuthApiError, ForgotPasswordRequest>({
    mutationFn: (payload) => forgotPasswordRequest(payload),
  });
}

export function useResetPassword() {
  return useMutation<ResetPasswordResponse, AuthApiError, ResetPasswordRequest>({
    mutationFn: (payload) => resetPasswordRequest(payload),
  });
}
