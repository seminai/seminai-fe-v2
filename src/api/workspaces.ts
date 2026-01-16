import { authenticatedHttpClient } from "./http";
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  Rule,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  InviteMemberRequest,
  UpdateMemberRequest,
  CreateRuleRequest,
  UpdateRuleRequest,
  AssignRuleToCompanyRequest,
  RulesFilterParams,
  WorkspaceListResponse,
  WorkspaceResponse,
  WorkspaceCreateResponse,
  WorkspaceMembersResponse,
  WorkspaceMemberResponse,
  InvitationResponse,
  RulesListResponse,
  RuleResponse,
  RuleAssignmentResponse,
  CompanyRulesResponse,
  LogoUploadResponse,
} from "@/types/workspace";

const BASE_URL = import.meta.env.VITE_API_URL;

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

// ============ WORKSPACES ============

export async function getWorkspaces(
  baseUrl: string = BASE_URL
): Promise<Workspace[]> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/workspaces`,
    { method: "GET" }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to fetch workspaces");
  }

  const result = (await response.json()) as WorkspaceListResponse;
  return result.data.workspaces;
}

export async function getWorkspace(
  workspaceId: string,
  baseUrl: string = BASE_URL
): Promise<Workspace> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/workspaces/${workspaceId}`,
    { method: "GET" }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to fetch workspace");
  }

  const result = (await response.json()) as WorkspaceResponse;
  return result.data.workspace;
}

export async function createWorkspace(
  payload: CreateWorkspaceRequest,
  baseUrl: string = BASE_URL
): Promise<{ workspace: Workspace; member: WorkspaceMember }> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/workspaces`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to create workspace");
  }

  const result = (await response.json()) as WorkspaceCreateResponse;
  return result.data;
}

export async function updateWorkspace(
  workspaceId: string,
  payload: UpdateWorkspaceRequest,
  baseUrl: string = BASE_URL
): Promise<Workspace> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/workspaces/${workspaceId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to update workspace");
  }

  const result = (await response.json()) as WorkspaceResponse;
  return result.data.workspace;
}

export async function deleteWorkspace(
  workspaceId: string,
  baseUrl: string = BASE_URL
): Promise<void> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/workspaces/${workspaceId}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to delete workspace");
  }
}

export async function uploadWorkspaceLogo(
  workspaceId: string,
  file: File,
  baseUrl: string = BASE_URL
): Promise<LogoUploadResponse["data"]> {
  const formData = new FormData();
  formData.append("logo", file);

  const response = await authenticatedHttpClient.request(
    `${baseUrl}/workspaces/${workspaceId}/logo`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to upload logo");
  }

  const result = (await response.json()) as LogoUploadResponse;
  return result.data;
}

// ============ WORKSPACE MEMBERS ============

export async function getWorkspaceMembers(
  workspaceId: string,
  baseUrl: string = BASE_URL
): Promise<{
  members: WorkspaceMember[];
  invitations: Array<WorkspaceInvitation & { user?: { id: string; name: string; email: string } }>;
}> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/workspaces/${workspaceId}/members`,
    { method: "GET" }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to fetch members");
  }

  const result = (await response.json()) as WorkspaceMembersResponse;
  return {
    members: result.data.members,
    invitations: result.data.invitations,
  };
}

export async function inviteMember(
  workspaceId: string,
  payload: InviteMemberRequest,
  baseUrl: string = BASE_URL
): Promise<InvitationResponse["data"]["invitation"]> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/workspaces/${workspaceId}/invite`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to invite member");
  }

  const result = (await response.json()) as InvitationResponse;
  return result.data.invitation;
}

export async function acceptInvitation(
  token: string,
  baseUrl: string = BASE_URL
): Promise<WorkspaceMember> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/workspaces/invitations/${token}/accept`,
    { method: "POST" }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to accept invitation");
  }

  const result = (await response.json()) as WorkspaceMemberResponse;
  return result.data.member;
}

export async function updateMember(
  workspaceId: string,
  memberId: string,
  payload: UpdateMemberRequest,
  baseUrl: string = BASE_URL
): Promise<WorkspaceMember> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/workspaces/${workspaceId}/members/${memberId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to update member");
  }

  const result = (await response.json()) as WorkspaceMemberResponse;
  return result.data.member;
}

export async function removeMember(
  workspaceId: string,
  memberId: string,
  baseUrl: string = BASE_URL
): Promise<void> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/workspaces/${workspaceId}/members/${memberId}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to remove member");
  }
}

// ============ RULES ============

export async function getWorkspaceRules(
  workspaceId: string,
  filters?: RulesFilterParams,
  baseUrl: string = BASE_URL
): Promise<Rule[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.set("category", filters.category);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.region) params.set("region", filters.region);
  if (filters?.search) params.set("search", filters.search);

  const queryString = params.toString();
  const url = `${baseUrl}/workspaces/${workspaceId}/rules${
    queryString ? `?${queryString}` : ""
  }`;

  const response = await authenticatedHttpClient.request(url, { method: "GET" });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to fetch rules");
  }

  const result = (await response.json()) as RulesListResponse;
  return result.data.rules;
}

export async function getRule(
  ruleId: string,
  baseUrl: string = BASE_URL
): Promise<Rule> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/rules/${ruleId}`,
    { method: "GET" }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to fetch rule");
  }

  const result = (await response.json()) as RuleResponse;
  return result.data.rule;
}

export async function createRule(
  workspaceId: string,
  payload: CreateRuleRequest,
  baseUrl: string = BASE_URL
): Promise<Rule> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/workspaces/${workspaceId}/rules`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to create rule");
  }

  const result = (await response.json()) as RuleResponse;
  return result.data.rule;
}

export async function updateRule(
  ruleId: string,
  payload: UpdateRuleRequest,
  baseUrl: string = BASE_URL
): Promise<Rule> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/rules/${ruleId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to update rule");
  }

  const result = (await response.json()) as RuleResponse;
  return result.data.rule;
}

export async function deleteRule(
  ruleId: string,
  baseUrl: string = BASE_URL
): Promise<void> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/rules/${ruleId}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to delete rule");
  }
}

export async function assignRuleToCompany(
  ruleId: string,
  payload: AssignRuleToCompanyRequest,
  baseUrl: string = BASE_URL
): Promise<RuleAssignmentResponse["data"]["assignment"]> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/rules/${ruleId}/companies`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to assign rule to company");
  }

  const result = (await response.json()) as RuleAssignmentResponse;
  return result.data.assignment;
}

export async function removeRuleFromCompany(
  ruleId: string,
  companyId: string,
  baseUrl: string = BASE_URL
): Promise<void> {
  const response = await authenticatedHttpClient.request(
    `${baseUrl}/rules/${ruleId}/companies/${companyId}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to remove rule from company");
  }
}

export async function getCompanyRules(
  companyId: string,
  onlyActive: boolean = false,
  baseUrl: string = BASE_URL
): Promise<CompanyRulesResponse["data"]["rules"]> {
  const url = `${baseUrl}/companies/${companyId}/rules${
    onlyActive ? "?onlyActive=true" : ""
  }`;

  const response = await authenticatedHttpClient.request(url, { method: "GET" });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || "Failed to fetch company rules");
  }

  const result = (await response.json()) as CompanyRulesResponse;
  return result.data.rules;
}
