import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Building2,
  Mail,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  usePendingInvitations,
  useAcceptInvitation,
} from "@/hooks/useWorkspaces";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { WorkspaceMemberRole, type PendingInvitation } from "@/types/workspace";

/**
 * Page to accept workspace invitations.
 * Users arrive here either from email link (?token=xxx) or manually.
 */
export default function AcceptInvitation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token");

  const { selectWorkspace } = useWorkspaceContext();

  const {
    data: pendingInvitations = [],
    isLoading,
    error,
  } = usePendingInvitations();
  const { mutateAsync: acceptInvitation, isPending: isAccepting } =
    useAcceptInvitation();

  const [acceptedInvitation, setAcceptedInvitation] =
    useState<PendingInvitation | null>(null);

  // Find the invitation matching the token from URL
  const invitationFromToken = tokenFromUrl
    ? pendingInvitations.find((inv) => inv.token === tokenFromUrl)
    : null;

  // Auto-accept invitation if token is in URL and we found the invitation
  useEffect(() => {
    if (tokenFromUrl && invitationFromToken && !acceptedInvitation) {
      // Don't auto-accept, let user confirm
    }
  }, [tokenFromUrl, invitationFromToken, acceptedInvitation]);

  const handleAcceptInvitation = async (invitation: PendingInvitation) => {
    try {
      await acceptInvitation(invitation.token);
      setAcceptedInvitation(invitation);
      toast.success(`Sei entrato nel workspace "${invitation.workspace.name}"!`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Errore durante l'accettazione";
      toast.error(errorMessage);
    }
  };

  const handleGoToWorkspace = () => {
    if (acceptedInvitation) {
      // Set the workspace as current and navigate
      selectWorkspace(acceptedInvitation.workspace.id);
      navigate("/dashboard");
    }
  };

  const roleLabels: Record<WorkspaceMemberRole, string> = {
    [WorkspaceMemberRole.OWNER]: "Proprietario",
    [WorkspaceMemberRole.ADMIN]: "Amministratore",
    [WorkspaceMemberRole.MEMBER]: "Membro",
    [WorkspaceMemberRole.VIEWER]: "Visualizzatore",
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento inviti...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Errore</h1>
          <p className="text-muted-foreground mb-6">
            Impossibile caricare gli inviti. Riprova più tardi.
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            Torna alla Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Success state after accepting
  if (acceptedInvitation) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">Invito accettato!</h1>
          <p className="text-muted-foreground mb-6">
            Ora fai parte del workspace{" "}
            <strong>{acceptedInvitation.workspace.name}</strong> come{" "}
            {roleLabels[acceptedInvitation.role]}.
          </p>
          <Button onClick={handleGoToWorkspace} size="lg">
            Vai al Workspace
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Token in URL but invitation not found
  if (tokenFromUrl && !invitationFromToken && pendingInvitations.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <XCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Invito non trovato</h1>
          <p className="text-muted-foreground mb-6">
            L'invito potrebbe essere scaduto, già utilizzato, o non associato al
            tuo account.
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            Torna alla Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // No pending invitations
  if (pendingInvitations.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <Mail className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Nessun invito pendente</h1>
          <p className="text-muted-foreground mb-6">
            Non hai inviti da accettare al momento.
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            Torna alla Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Show pending invitations
  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Inviti pendenti</h1>
          <p className="text-muted-foreground">
            Hai {pendingInvitations.length} invit
            {pendingInvitations.length === 1 ? "o" : "i"} in attesa di essere
            accettat{pendingInvitations.length === 1 ? "o" : "i"}.
          </p>
        </div>

        <div className="space-y-4">
          {/* Show invitation from token first if exists */}
          {invitationFromToken && (
            <InvitationCard
              invitation={invitationFromToken}
              isHighlighted
              onAccept={() => handleAcceptInvitation(invitationFromToken)}
              isAccepting={isAccepting}
              roleLabels={roleLabels}
            />
          )}

          {/* Show other invitations */}
          {pendingInvitations
            .filter((inv) => inv.token !== tokenFromUrl)
            .map((invitation) => (
              <InvitationCard
                key={invitation.id}
                invitation={invitation}
                onAccept={() => handleAcceptInvitation(invitation)}
                isAccepting={isAccepting}
                roleLabels={roleLabels}
              />
            ))}
        </div>

        <div className="text-center mt-8">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            Torna alla Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Single invitation card component
 */
function InvitationCard({
  invitation,
  isHighlighted = false,
  onAccept,
  isAccepting,
  roleLabels,
}: {
  invitation: PendingInvitation;
  isHighlighted?: boolean;
  onAccept: () => void;
  isAccepting: boolean;
  roleLabels: Record<WorkspaceMemberRole, string>;
}) {
  const isExpired = new Date(invitation.expiresAt) < new Date();

  return (
    <div
      className={`bg-white rounded-2xl border p-6 ${
        isHighlighted
          ? "border-primary shadow-lg ring-2 ring-primary/20"
          : "border-neutral-200"
      }`}
    >
      {isHighlighted && (
        <div className="mb-4">
          <Badge className="bg-primary text-white">
            Invito dal link
          </Badge>
        </div>
      )}

      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14">
          {invitation.workspace.logoUrl ? (
            <AvatarImage
              src={invitation.workspace.logoUrl}
              alt={invitation.workspace.name}
            />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary text-lg">
            {invitation.workspace.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg">{invitation.workspace.name}</h3>
          {invitation.workspace.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {invitation.workspace.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-3">
            <Badge variant="secondary">
              {roleLabels[invitation.role]}
            </Badge>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {isExpired ? (
                <span className="text-red-500">Scaduto</span>
              ) : (
                <span>
                  Scade il{" "}
                  {new Date(invitation.expiresAt).toLocaleDateString("it-IT")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0">
          {isExpired ? (
            <Button variant="outline" disabled>
              Scaduto
            </Button>
          ) : (
            <Button onClick={onAccept} disabled={isAccepting}>
              {isAccepting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Accettazione...
                </>
              ) : (
                <>
                  Accetta
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
