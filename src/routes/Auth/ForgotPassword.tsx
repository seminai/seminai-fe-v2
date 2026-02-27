import { useState } from "react";
import { Link } from "react-router-dom";
import { useForgotPassword } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const mutation = useForgotPassword();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await mutation.mutateAsync({ email });
      setSubmitted(true);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Errore durante la richiesta";
      toast.error(message);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-agri-green-600" />
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Controlla la tua email
          </h1>
          <p className="text-sm text-slate-500 max-w-sm">
            Se l'indirizzo email è registrato, riceverai a breve un link per
            reimpostare la password.
          </p>
        </div>
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

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Password dimenticata
        </h1>
        <p className="text-sm text-slate-500">
          Inserisci la tua email per ricevere un link di reset
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="nome@esempio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11"
          />
        </div>
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="w-full h-11 bg-agri-green-600 hover:bg-agri-green-700"
        >
          {mutation.isPending ? "Invio in corso..." : "Invia link di reset"}
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
