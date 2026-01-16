import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, Plus, Building2, Sparkles, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import type { Workspace } from "@/types/workspace";

type WorkspaceSwitcherProps = {
  collapsed?: boolean;
};

type WorkspaceAvatarProps = {
  workspace: Workspace | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Avatar component for workspace with logo or initials fallback
 */
function WorkspaceAvatar({
  workspace,
  size = "md",
  className,
}: WorkspaceAvatarProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };

  // Default Seminai logo
  if (!workspace) {
    return (
      <img
        src="/logo.png"
        alt="Seminai"
        className={cn(sizeClasses[size], "rounded-lg object-contain", className)}
      />
    );
  }

  // Workspace has logo
  if (workspace.logoUrl || workspace.iconUrl) {
    return (
      <img
        src={workspace.iconUrl ?? workspace.logoUrl ?? ""}
        alt={workspace.name}
        className={cn(sizeClasses[size], "rounded-lg object-cover", className)}
      />
    );
  }

  // Fallback to initials with primary color
  const initials = workspace.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn(
        sizeClasses[size],
        "rounded-lg flex items-center justify-center font-semibold text-white",
        className
      )}
      style={{ backgroundColor: workspace.primaryColor ?? "#64a42e" }}
    >
      {initials}
    </div>
  );
}

type WorkspaceItemProps = {
  workspace: Workspace | null;
  isSelected: boolean;
  onSelect: () => void;
  isDefault?: boolean;
};

function WorkspaceItem({
  workspace,
  isSelected,
  onSelect,
  isDefault,
}: WorkspaceItemProps) {
  return (
    <DropdownMenuItem
      onClick={onSelect}
      className="flex items-center gap-3 cursor-pointer py-2.5 px-3"
    >
      <WorkspaceAvatar workspace={workspace} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {isDefault ? "Seminai" : workspace?.name}
        </p>
        {isDefault && (
          <p className="text-xs text-muted-foreground">Ambiente predefinito</p>
        )}
        {workspace?.description && !isDefault && (
          <p className="text-xs text-muted-foreground truncate">
            {workspace.description}
          </p>
        )}
      </div>
      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
    </DropdownMenuItem>
  );
}

export function WorkspaceSwitcher({ collapsed = false }: WorkspaceSwitcherProps) {
  const navigate = useNavigate();
  const {
    currentWorkspace,
    workspaces,
    isLoading,
    selectWorkspace,
    exitWorkspace,
  } = useWorkspaceContext();

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const displayName = currentWorkspace?.name ?? "Seminai";

  const handleCreateWorkspace = () => {
    setDropdownOpen(false);
    navigate("/new-workspace");
  };

  const handleWorkspaceSettings = () => {
    setDropdownOpen(false);
    navigate("/workspace/settings");
  };

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 w-full rounded-xl transition-all",
          "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-accent",
          collapsed ? "justify-center p-2" : "p-2 pr-3"
        )}
      >
        <WorkspaceAvatar workspace={currentWorkspace} size="md" />
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate">{displayName}</p>
              {currentWorkspace && (
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Workspace
                </p>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={collapsed ? "right" : "bottom"}
        align={collapsed ? "start" : "center"}
        sideOffset={8}
        className="w-72 z-[100]"
      >
        <DropdownMenuLabel className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Workspace
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Default Seminai environment */}
        <WorkspaceItem
          workspace={null}
          isSelected={!currentWorkspace}
          onSelect={exitWorkspace}
          isDefault
        />

        {/* User workspaces */}
        {!isLoading && workspaces.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              I tuoi workspace
            </DropdownMenuLabel>
            {workspaces.map((ws) => (
              <WorkspaceItem
                key={ws.id}
                workspace={ws}
                isSelected={currentWorkspace?.id === ws.id}
                onSelect={() => selectWorkspace(ws.id)}
              />
            ))}
          </>
        )}

        {/* Workspace settings - only visible when a workspace is selected */}
        {currentWorkspace && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleWorkspaceSettings}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="h-6 w-6 rounded-lg bg-accent flex items-center justify-center">
                <Settings className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Impostazioni</p>
                <p className="text-xs text-muted-foreground">
                  Gestisci il workspace
                </p>
              </div>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        {/* Create new workspace - navigates to page */}
        <DropdownMenuItem
          onClick={handleCreateWorkspace}
          className="flex items-center gap-2 cursor-pointer text-primary"
        >
          <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plus className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Crea Workspace</p>
            <p className="text-xs text-muted-foreground">
              Personalizza la tua esperienza
            </p>
          </div>
          <Sparkles className="h-4 w-4 text-amber-500" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
