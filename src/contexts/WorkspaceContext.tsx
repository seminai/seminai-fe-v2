import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { Workspace } from "@/types/workspace";
import { useWorkspaces, useWorkspace } from "@/hooks/useWorkspaces";
import { WorkspaceThemeController } from "@/contexts/workspaceTheme";

const WORKSPACE_STORAGE_KEY = "seminai_current_workspace_id";

type WorkspaceContextValue = {
  /** Currently selected workspace (null = default Seminai environment) */
  currentWorkspace: Workspace | null;
  /** All workspaces the user has access to */
  workspaces: Workspace[];
  /** Whether workspaces are loading */
  isLoading: boolean;
  /** Whether user is in a workspace (vs default environment) */
  isInWorkspace: boolean;
  /** Select a workspace by ID */
  selectWorkspace: (workspaceId: string | null) => void;
  /** Clear current workspace (return to default) */
  exitWorkspace: () => void;
  /** CSS variables for current workspace theme */
  themeVariables: Record<string, string>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

type WorkspaceProviderProps = {
  children: ReactNode;
};

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(
    () => {
      const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      return stored ?? null;
    }
  );

  // Find current workspace from list
  // Also try to get from detail cache if available (for immediate updates)
  const { data: workspaceDetail } = useWorkspace(
    currentWorkspaceId ?? undefined
  );
  const currentWorkspace = useMemo(() => {
    // Prefer detail cache if available (more up-to-date after mutations)
    if (workspaceDetail && workspaceDetail.id === currentWorkspaceId) {
      return workspaceDetail;
    }
    // Fallback to list
    return workspaces.find((w) => w.id === currentWorkspaceId) ?? null;
  }, [workspaces, currentWorkspaceId, workspaceDetail]);

  // Persist selection to localStorage
  useEffect(() => {
    if (currentWorkspaceId) {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, currentWorkspaceId);
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  }, [currentWorkspaceId]);

  // Apply theme variables to document root
  // Recreate controller when workspace or its colors change
  const themeController = useMemo(
    () => new WorkspaceThemeController(currentWorkspace),
    [
      currentWorkspace,
      currentWorkspace?.primaryColor,
      currentWorkspace?.secondaryColor,
      currentWorkspace?.accentColor,
    ]
  );

  const themeVariables = useMemo(
    () => themeController.getThemeVariables(),
    [themeController]
  );

  useEffect(() => {
    const root = document.documentElement;

    Object.entries(themeVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Set data attribute for workspace-aware CSS
    if (currentWorkspace) {
      root.setAttribute("data-workspace-active", "true");
    } else {
      root.removeAttribute("data-workspace-active");
    }
  }, [themeVariables, currentWorkspace]);

  const selectWorkspace = useCallback((workspaceId: string | null) => {
    setCurrentWorkspaceId(workspaceId);
  }, []);

  const exitWorkspace = useCallback(() => {
    setCurrentWorkspaceId(null);
  }, []);

  const contextValue = useMemo<WorkspaceContextValue>(
    () => ({
      currentWorkspace,
      workspaces,
      isLoading,
      isInWorkspace: currentWorkspace !== null,
      selectWorkspace,
      exitWorkspace,
      themeVariables,
    }),
    [
      currentWorkspace,
      workspaces,
      isLoading,
      selectWorkspace,
      exitWorkspace,
      themeVariables,
    ]
  );

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error(
      "useWorkspaceContext must be used within a WorkspaceProvider"
    );
  }
  return context;
}
