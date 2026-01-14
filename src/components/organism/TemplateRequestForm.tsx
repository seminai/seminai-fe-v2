import { ChangeEvent, FormEvent, useState } from "react";
import { emailApiService } from "@/api/email";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TemplateRequestFormProps {
  className?: string;
  onSuccess?: () => void;
  region?: string;
}

const ITALIAN_REGIONS = [
  "Abruzzo",
  "Basilicata",
  "Calabria",
  "Campania",
  "Emilia-Romagna",
  "Friuli-Venezia Giulia",
  "Lazio",
  "Liguria",
  "Lombardia",
  "Marche",
  "Molise",
  "Piemonte",
  "Puglia",
  "Sardegna",
  "Sicilia",
  "Toscana",
  "Trentino-Alto Adige",
  "Umbria",
  "Valle d'Aosta",
  "Veneto",
];

export function TemplateRequestForm({
  className,
  onSuccess,
  region: initialRegion,
}: TemplateRequestFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState(initialRegion || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedRegion = region.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedName || !trimmedEmail || !trimmedRegion) {
      setErrorMessage("Per favore compila tutti i campi obbligatori.");
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage("Per favore fornisci un indirizzo email valido.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    const message = `RICHIESTA TEMPLATE AGEA - MISURA UNICA\n\nNome: ${trimmedName}\nEmail: ${trimmedEmail}\nRegione: ${trimmedRegion}\n\nL'utente ha richiesto il template Excel nel formato AGEA della misura unica per la regione ${trimmedRegion}.`;

    try {
      const response = await emailApiService.sendContactEmail({
        name: trimmedName,
        email: trimmedEmail,
        body: message,
      });

      setName("");
      setEmail("");
      setRegion(initialRegion || "");
      setIsSubmitting(false);
      setSuccessMessage(
        response.message ?? "Richiesta inviata correttamente. Ti invieremo il template via email."
      );

      if (onSuccess) {
        onSuccess();
      }
    } catch {
      setIsSubmitting(false);
      setErrorMessage(
        "Si è verificato un errore durante l'invio della richiesta."
      );
    }
  };

  return (
    <form
      className={cn(
        "bg-white p-8 border border-gray-100 space-y-6",
        className
      )}
      onSubmit={handleSubmit}
    >
      <div className="space-y-2">
        <label className="block text-left">
          <span className="text-gray-700 font-medium">Nome e cognome *</span>
          <input
            className="mt-2 w-full rounded-2xl border border-gray-200 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-agri-green-500 focus:border-transparent transition"
            placeholder="Mario Rossi"
            value={name}
            onChange={handleNameChange}
            required
          />
        </label>
      </div>

      <div className="space-y-2">
        <label className="block text-left">
          <span className="text-gray-700 font-medium">Email *</span>
          <input
            type="email"
            className="mt-2 w-full rounded-2xl border border-gray-200 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-agri-green-500 focus:border-transparent transition"
            placeholder="mario.rossi@example.com"
            value={email}
            onChange={handleEmailChange}
            required
          />
        </label>
      </div>

      <div className="space-y-2">
        <label className="block text-left">
          <span className="text-gray-700 font-medium">Regione *</span>
          <Select value={region} onValueChange={setRegion} required>
            <SelectTrigger className="mt-2 w-full rounded-2xl border border-gray-200 h-[58px]">
              <SelectValue placeholder="Seleziona una regione" />
            </SelectTrigger>
            <SelectContent>
              {ITALIAN_REGIONS.map((reg) => (
                <SelectItem key={reg} value={reg}>
                  {reg}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
      {successMessage && (
        <p className="text-sm text-agri-green-600">{successMessage}</p>
      )}

      <button
        type="submit"
        className="w-full py-4 px-6 rounded-2xl bg-green-700 text-white font-semibold hover:bg-green-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Invio in corso..." : "Richiedi template"}
      </button>
    </form>
  );
}
