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
import { useUserId } from "@/contexts/UserIdContext";
import {
  getScopedStorageItem,
  removeScopedStorageItem,
  setScopedStorageItem,
} from "@/utils/storageKeys";

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
  const userId = useUserId();
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(
    () => {
      try {
        const stored = getScopedStorageItem(WORKSPACE_STORAGE_KEY, userId);
        return stored ?? null;
      } catch {
        return null;
      }
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
    try {
      if (currentWorkspaceId) {
        setScopedStorageItem(WORKSPACE_STORAGE_KEY, userId, currentWorkspaceId);
      } else {
        removeScopedStorageItem(WORKSPACE_STORAGE_KEY, userId);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [currentWorkspaceId, userId]);

  // Apply theme variables to document root
  // Recreate controller when workspace or its colors change
  const themeController = useMemo(
    () => new WorkspaceThemeController(currentWorkspace),
    [
      currentWorkspace?.id,
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

    // Get all CSS variables currently set on root
    const currentStyles = root.style;
    const existingWorkspaceVars: string[] = [];
    const existingPaletteVars: string[] = [];
    
    // Collect all existing workspace and palette variables
    for (let i = 0; i < currentStyles.length; i++) {
      const propertyName = currentStyles[i];
      if (propertyName.startsWith("--workspace-") || 
          propertyName.startsWith("--palette-") ||
          propertyName === "--accent" ||
          propertyName === "--accent-foreground") {
        if (propertyName.startsWith("--workspace-")) {
          existingWorkspaceVars.push(propertyName);
        } else {
          existingPaletteVars.push(propertyName);
        }
      }
    }

    // Remove all existing workspace and palette variables
    [...existingWorkspaceVars, ...existingPaletteVars].forEach((varName) => {
      root.style.removeProperty(varName);
    });

    // Apply new theme variables
    Object.entries(themeVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Set data attribute for workspace-aware CSS
    if (currentWorkspace) {
      root.setAttribute("data-workspace-active", "true");
    } else {
      root.removeAttribute("data-workspace-active");
    }

    // Force a repaint to ensure styles are applied
    root.style.display = "none";
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    root.offsetHeight; // Trigger reflow
    root.style.display = "";
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
