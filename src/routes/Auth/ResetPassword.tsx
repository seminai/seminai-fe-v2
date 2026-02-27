import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useResetPassword } from "@/hooks/useAuth";
import { type AuthApiError } from "@/api/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle } from "lucide-react";

function mapErrorCodeToMessage(error: AuthApiError): string {
  switch (error.code) {
    case "INVALID_TOKEN":
    case "INVALID_TOKEN_TYPE":
      return "Link scaduto o non valido. Richiedi un nuovo link.";
    case "PASSWORD_MISMATCH":
      return "Le due password non coincidono.";
    case "PASSWORD_TOO_SHORT":
      return "La password deve avere almeno 6 caratteri.";
    default:
      return error.message || "Errore durante il reset della password.";
  }
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");
  const mutation = useResetPassword();

  if (!token) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Link non valido
          </h1>
          <p className="text-sm text-slate-500 max-w-sm">
            Il link di reset non è valido o è incompleto. Richiedi un nuovo
            link per reimpostare la password.
          </p>
        </div>
        <Link
          to="/auth/forgot-password"
          className="flex items-center justify-center gap-2 text-sm text-agri-green-600 hover:text-agri-green-700 font-medium"
        >
          Richiedi un nuovo link
        </Link>
        <Link
          to="/auth"
          className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna al login
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError("");

    if (newPassword.length < 6) {
      setValidationError("La password deve avere almeno 6 caratteri.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationError("Le due password non coincidono.");
      return;
    }

    try {
      await mutation.mutateAsync({ token: token!, newPassword, confirmPassword });
      navigate("/auth", {
        replace: true,
        state: { message: "Password reimpostata con successo. Accedi con la nuova password." },
      });
    } catch (error: unknown) {
      const apiError = error as AuthApiError;
      const message = mapErrorCodeToMessage(apiError);
      toast.error(message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Reimposta password
        </h1>
        <p className="text-sm text-slate-500">
          Inserisci la tua nuova password
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Nuova password
          </label>
          <Input
            type="password"
            placeholder="Minimo 6 caratteri"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setValidationError("");
            }}
            required
            minLength={6}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Conferma password
          </label>
          <Input
            type="password"
            placeholder="Ripeti la password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setValidationError("");
            }}
            required
            minLength={6}
            className="h-11"
          />
        </div>

        {validationError && (
          <p className="text-sm text-red-500">{validationError}</p>
        )}

        <Button
          type="submit"
          disabled={mutation.isPending}
          className="w-full h-11 bg-agri-green-600 hover:bg-agri-green-700"
        >
          {mutation.isPending ? "Reset in corso..." : "Reimposta password"}
        </Button>
      </form>

      <Link
        to="/auth"
        className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-black"
      >
        <ArrowLeft className="h-4 w-4" />
        Torna al login
      </Link>
    </div>
  );
}
