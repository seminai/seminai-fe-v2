import { FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AdminAccessGateProps = {
  password: string;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  durationMinutes: number;
};

export function AdminAccessGate({
  password,
  onPasswordChange,
  onSubmit,
  isSubmitting,
  durationMinutes,
}: AdminAccessGateProps) {
  return (
    <Card className="mx-auto max-w-xl border-slate-200">
      <CardHeader className="space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <CardTitle>Conferma accesso amministratore</CardTitle>
        <p className="text-sm text-slate-600">
          Inserisci la password secondaria per sbloccare questa area. L&apos;accesso
          resterà valido per {durationMinutes} minuti tramite cookie protetto.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="Admin route password"
            autoComplete="current-password"
          />
          <Button type="submit" disabled={isSubmitting || password.trim().length === 0}>
            {isSubmitting ? "Verifica in corso..." : "Sblocca area admin"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
