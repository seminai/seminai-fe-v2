import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  uploadWorkspaceLogo,
  getWorkspaceMembers,
  inviteMember,
  updateMember,
  removeMember,
  getWorkspaceRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
  assignRuleToCompany,
  removeRuleFromCompany,
  getCompanyRules,
} from "@/api/workspaces";
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  InviteMemberRequest,
  UpdateMemberRequest,
  Rule,
  CreateRuleRequest,
  UpdateRuleRequest,
  AssignRuleToCompanyRequest,
  RulesFilterParams,
  RuleCompanyAssignment,
} from "@/types/workspace";

// Query keys
export const workspaceKeys = {
  all: ["workspaces"] as const,
  lists: () => [...workspaceKeys.all, "list"] as const,
  list: () => [...workspaceKeys.lists()] as const,
  details: () => [...workspaceKeys.all, "detail"] as const,
  detail: (id: string) => [...workspaceKeys.details(), id] as const,
  members: (workspaceId: string) =>
    [...workspaceKeys.all, "members", workspaceId] as const,
  rules: (workspaceId: string) =>
    [...workspaceKeys.all, "rules", workspaceId] as const,
  rule: (ruleId: string) => [...workspaceKeys.all, "rule", ruleId] as const,
  companyRules: (companyId: string) =>
    [...workspaceKeys.all, "company-rules", companyId] as const,
};

// ============ WORKSPACE QUERIES ============

export function useWorkspaces() {
  return useQuery<Workspace[], Error>({
    queryKey: workspaceKeys.list(),
    queryFn: () => getWorkspaces(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useWorkspace(workspaceId: string | undefined) {
  return useQuery<Workspace, Error>({
    queryKey: workspaceKeys.detail(workspaceId ?? ""),
    queryFn: () => getWorkspace(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============ WORKSPACE MUTATIONS ============

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateWorkspaceRequest) => createWorkspace(payload),
    onSuccess: ({ workspace }) => {
      // Add to list cache
      queryClient.setQueryData<Workspace[]>(workspaceKeys.list(), (old) =>
        old ? [...old, workspace] : [workspace]
      );
      // Set detail cache
      queryClient.setQueryData(workspaceKeys.detail(workspace.id), workspace);
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      payload,
    }: {
      workspaceId: string;
      payload: UpdateWorkspaceRequest;
    }) => updateWorkspace(workspaceId, payload),
    onSuccess: (workspace) => {
      // Update detail cache
      queryClient.setQueryData(workspaceKeys.detail(workspace.id), workspace);
      // Update in list cache
      queryClient.setQueryData<Workspace[]>(
        workspaceKeys.list(),
        (old) => old?.map((w) => (w.id === workspace.id ? workspace : w)) ?? []
      );

      // Force re-render of any components using these queries
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.detail(workspace.id),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.list(),
      });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => deleteWorkspace(workspaceId),
    onSuccess: (_, workspaceId) => {
      // Remove from list cache
      queryClient.setQueryData<Workspace[]>(
        workspaceKeys.list(),
        (old) => old?.filter((w) => w.id !== workspaceId) ?? []
      );
      // Invalidate detail cache
      queryClient.removeQueries({
        queryKey: workspaceKeys.detail(workspaceId),
      });
    },
  });
}

export function useUploadWorkspaceLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, file }: { workspaceId: string; file: File }) =>
      uploadWorkspaceLogo(workspaceId, file),
    onSuccess: ({ workspace }) => {
      // Update detail cache
      queryClient.setQueryData(workspaceKeys.detail(workspace.id), workspace);
      // Update in list cache
      queryClient.setQueryData<Workspace[]>(
        workspaceKeys.list(),
        (old) => old?.map((w) => (w.id === workspace.id ? workspace : w)) ?? []
      );
    },
  });
}

// ============ MEMBERS QUERIES ============

export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery<
    {
      members: WorkspaceMember[];
      invitations: Array<
        WorkspaceInvitation & {
          user?: { id: string; name: string; email: string };
        }
      >;
    },
    Error
  >({
    queryKey: workspaceKeys.members(workspaceId ?? ""),
    queryFn: () => getWorkspaceMembers(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============ MEMBERS MUTATIONS ============

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      payload,
    }: {
      workspaceId: string;
      payload: InviteMemberRequest;
    }) => inviteMember(workspaceId, payload),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate members list (invitation creates pending member)
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.members(workspaceId),
      });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      memberId,
      payload,
    }: {
      workspaceId: string;
      memberId: string;
      payload: UpdateMemberRequest;
    }) => updateMember(workspaceId, memberId, payload),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate members list to refetch with updated data
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.members(workspaceId),
      });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      memberId,
    }: {
      workspaceId: string;
      memberId: string;
    }) => removeMember(workspaceId, memberId),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate members list to refetch with updated data
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.members(workspaceId),
      });
    },
  });
}

// ============ RULES QUERIES ============

export function useWorkspaceRules(
  workspaceId: string | undefined,
  filters?: RulesFilterParams
) {
  return useQuery<Rule[], Error>({
    queryKey: [...workspaceKeys.rules(workspaceId ?? ""), filters],
    queryFn: () => getWorkspaceRules(workspaceId!, filters),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRule(ruleId: string | undefined) {
  return useQuery<Rule, Error>({
    queryKey: workspaceKeys.rule(ruleId ?? ""),
    queryFn: () => getRule(ruleId!),
    enabled: !!ruleId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCompanyRules(
  companyId: string | undefined,
  onlyActive: boolean = false
) {
  return useQuery<
    Array<{
      rule: Rule;
      assignment: RuleCompanyAssignment;
    }>,
    Error
  >({
    queryKey: [...workspaceKeys.companyRules(companyId ?? ""), onlyActive],
    queryFn: () => getCompanyRules(companyId!, onlyActive),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============ RULES MUTATIONS ============

export function useCreateRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      payload,
    }: {
      workspaceId: string;
      payload: CreateRuleRequest;
    }) => createRule(workspaceId, payload),
    onSuccess: (rule, { workspaceId }) => {
      // Set detail cache
      queryClient.setQueryData(workspaceKeys.rule(rule.id), rule);
      // Invalidate all rules queries for this workspace to ensure cache is updated
      // This includes queries with and without filters
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.rules(workspaceId),
      });
      // Invalidate workspace detail to update _count
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.detail(workspaceId),
      });
    },
  });
}

export function useUpdateRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ruleId,
      payload,
    }: {
      ruleId: string;
      payload: UpdateRuleRequest;
    }) => updateRule(ruleId, payload),
    onSuccess: (rule) => {
      // Update detail cache
      queryClient.setQueryData(workspaceKeys.rule(rule.id), rule);
      // Update in rules list cache
      queryClient.setQueryData<Rule[]>(
        workspaceKeys.rules(rule.workspaceId),
        (old) => old?.map((r) => (r.id === rule.id ? rule : r)) ?? []
      );
      // Invalidate company rules that might include this rule
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.companyRules(""),
      });
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleId: string) => deleteRule(ruleId),
    onSuccess: (_, ruleId) => {
      // Get rule from cache to get workspaceId
      const rule = queryClient.getQueryData<Rule>(workspaceKeys.rule(ruleId));
      if (rule) {
        // Remove from rules list
        queryClient.setQueryData<Rule[]>(
          workspaceKeys.rules(rule.workspaceId),
          (old) => old?.filter((r) => r.id !== ruleId) ?? []
        );
        // Invalidate workspace detail to update _count
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.detail(rule.workspaceId),
        });
      }
      // Remove detail cache
      queryClient.removeQueries({
        queryKey: workspaceKeys.rule(ruleId),
      });
      // Invalidate company rules
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.companyRules(""),
      });
    },
  });
}

export function useAssignRuleToCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ruleId,
      payload,
    }: {
      ruleId: string;
      payload: AssignRuleToCompanyRequest;
    }) => assignRuleToCompany(ruleId, payload),
    onSuccess: (assignment, { ruleId }) => {
      // Invalidate company rules
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.companyRules(assignment.companyId),
      });
      // Invalidate rule detail to update companies list and count
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.rule(ruleId),
      });
      // Get workspaceId from rule cache to invalidate rules list
      const rule = queryClient.getQueryData<Rule>(workspaceKeys.rule(ruleId));
      if (rule) {
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.rules(rule.workspaceId),
        });
      }
    },
  });
}

export function useRemoveRuleFromCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ruleId,
      companyId,
    }: {
      ruleId: string;
      companyId: string;
    }) => removeRuleFromCompany(ruleId, companyId),
    onSuccess: (_, { ruleId, companyId }) => {
      // Invalidate company rules
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.companyRules(companyId),
      });
      // Invalidate rule detail to update companies list and count
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.rule(ruleId),
      });
      // Get workspaceId from rule cache to invalidate rules list
      const rule = queryClient.getQueryData<Rule>(workspaceKeys.rule(ruleId));
      if (rule) {
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.rules(rule.workspaceId),
        });
      }
    },
  });
}
