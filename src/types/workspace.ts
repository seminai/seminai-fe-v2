/**
 * Workspace types for the multi-tenant workspace system
 */

export enum WorkspacePlan {
  FREE = "FREE",
  PROFESSIONAL = "PROFESSIONAL",
  ENTERPRISE = "ENTERPRISE",
}

export enum WorkspaceMemberRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  VIEWER = "VIEWER",
}

export enum RuleCategory {
  DISCIPLINARE = "DISCIPLINARE",
  STANDARD = "STANDARD",
  BEST_PRACTICE = "BEST_PRACTICE",
  METHODOLOGY = "METHODOLOGY",
  CUSTOM = "CUSTOM",
}

export enum RuleStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
  DEPRECATED = "DEPRECATED",
}

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  iconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  customCss: string | null;
  plan: WorkspacePlan;
  isActive: boolean;
  maxMembers: number;
  maxRules: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    members: number;
    rules: number;
  };
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
  canManageRules: boolean;
  canInviteMembers: boolean;
  joinedAt: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
};

export type WorkspaceInvitation = {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceMemberRole;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  invitedById: string;
  createdAt: string;
};

export type Rule = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  category: RuleCategory;
  status: RuleStatus;
  content: Record<string, unknown>;
  sourceUrl: string | null;
  sourceDocument: string | null;
  region: string | null;
  validFrom: string | null;
  validUntil: string | null;
  version: string | null;
  isPublic: boolean;
  isTemplate: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  companiesCount?: number;
  cropsCount?: number;
  companies?: Array<{
    id: string;
    name: string;
  }>;
  _count?: {
    companies: number;
    crops: number;
  };
};

export type RuleCompanyAssignment = {
  id: string;
  ruleId: string;
  companyId: string;
  isActive: boolean;
  priority: number;
  overrides: Record<string, unknown> | null;
  notes: string | null;
  assignedAt: string;
  assignedById: string;
};

// Request/Response types
export type CreateWorkspaceRequest = {
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  iconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  plan?: WorkspacePlan;
};

export type UpdateWorkspaceRequest = Partial<CreateWorkspaceRequest> & {
  isActive?: boolean;
  customCss?: string;
};

export type InviteMemberRequest = {
  email: string;
  role?: WorkspaceMemberRole;
};

export type UpdateMemberRequest = {
  role?: WorkspaceMemberRole;
  canManageRules?: boolean;
  canInviteMembers?: boolean;
};

export type CreateRuleRequest = {
  name: string;
  slug?: string;
  description?: string;
  category: RuleCategory;
  content: Record<string, unknown>;
  sourceUrl?: string;
  sourceDocument?: string;
  region?: string;
  validFrom?: string;
  validUntil?: string;
  version?: string;
  isPublic?: boolean;
  isTemplate?: boolean;
};

export type UpdateRuleRequest = Partial<CreateRuleRequest> & {
  status?: RuleStatus;
};

export type AssignRuleToCompanyRequest = {
  companyId: string;
  priority?: number;
  overrides?: Record<string, unknown>;
  notes?: string;
};

export type RulesFilterParams = {
  category?: RuleCategory;
  status?: RuleStatus;
  region?: string;
  search?: string;
};

// API Response wrappers
export type WorkspaceListResponse = {
  status: "success";
  data: {
    workspaces: Workspace[];
  };
};

export type WorkspaceResponse = {
  status: "success";
  data: {
    workspace: Workspace;
  };
};

export type WorkspaceCreateResponse = {
  status: "success";
  data: {
    workspace: Workspace;
    member: WorkspaceMember;
  };
};

export type WorkspaceMembersResponse = {
  status: "success";
  data: {
    members: WorkspaceMember[];
    invitations: Array<WorkspaceInvitation & { user?: { id: string; name: string; email: string } }>;
  };
};

export type WorkspaceMemberResponse = {
  status: "success";
  data: {
    member: WorkspaceMember;
  };
};

export type InvitationResponse = {
  status: "success";
  data: {
    invitation: WorkspaceInvitation;
  };
};

export type RulesListResponse = {
  status: "success";
  data: {
    rules: Rule[];
  };
};

export type RuleResponse = {
  status: "success";
  data: {
    rule: Rule;
  };
};

export type RuleAssignmentResponse = {
  status: "success";
  data: {
    assignment: RuleCompanyAssignment;
  };
};

export type CompanyRulesResponse = {
  status: "success";
  data: {
    rules: Array<{
      rule: Rule;
      assignment: RuleCompanyAssignment;
    }>;
  };
};

export type LogoUploadResponse = {
  status: "success";
  data: {
    workspace: Workspace;
    logoUrl: string;
    extractedColors: {
      primaryColor: string;
      secondaryColor: string;
      accentColor: string;
    };
  };
};
