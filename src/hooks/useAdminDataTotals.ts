import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deactivateAdminUser,
  getAdminAccessStatus,
  getAdminDashboardSummary,
  type AdminAccessStatusResponse,
  type AdminApiError,
  type AdminDashboardSummaryResponse,
  type AdminDeactivateUserRequest,
  type AdminReactivateUserRequest,
  type AdminSetUserBlockedRequest,
  type AdminUnlockRequest,
  reactivateAdminUser,
  setAdminUserBlockedStatus,
  unlockAdminAccess,
} from "@/api/admin";

const adminKeys = {
  accessStatus: () => ["admin-data-totals", "access-status"] as const,
  summary: () => ["admin-data-totals", "summary"] as const,
};

export function useAdminAccessStatusQuery(enabled: boolean) {
  return useQuery<AdminAccessStatusResponse, AdminApiError>({
    queryKey: adminKeys.accessStatus(),
    queryFn: () => getAdminAccessStatus(),
    enabled,
    retry: false,
    staleTime: 60 * 1000,
  });
}

export function useAdminDashboardSummaryQuery(enabled: boolean) {
  return useQuery<AdminDashboardSummaryResponse, AdminApiError>({
    queryKey: adminKeys.summary(),
    queryFn: () => getAdminDashboardSummary(),
    enabled,
    retry: false,
    staleTime: 30 * 1000,
  });
}

export function useAdminUnlockMutation() {
  const queryClient = useQueryClient();
  return useMutation<AdminAccessStatusResponse, AdminApiError, AdminUnlockRequest>({
    mutationFn: (payload) => unlockAdminAccess(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.accessStatus() });
      await queryClient.invalidateQueries({ queryKey: adminKeys.summary() });
    },
  });
}

export function useAdminSetUserBlockedMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, AdminApiError, AdminSetUserBlockedRequest>({
    mutationFn: (payload) => setAdminUserBlockedStatus(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.summary() });
    },
  });
}

export function useAdminDeactivateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, AdminApiError, AdminDeactivateUserRequest>({
    mutationFn: (payload) => deactivateAdminUser(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.summary() });
    },
  });
}

export function useAdminReactivateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, AdminApiError, AdminReactivateUserRequest>({
    mutationFn: (payload) => reactivateAdminUser(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.summary() });
    },
  });
}
