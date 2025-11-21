import { ChangeEvent, FormEvent, useState } from "react";
import { emailApiService } from "@/api/email";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { it } from "date-fns/locale";

interface ContactRequestFormProps {
  className?: string;
  onSuccess?: () => void;
}

export function ContactRequestForm({
  className,
  onSuccess,
}: ContactRequestFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
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

  const handleMessageChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      setErrorMessage("Per favore compila tutti i campi obbligatori.");
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage("Per favore fornisci un indirizzo email valido.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    let finalMessage = "";

    if (date && time) {
      const formattedDate = format(date, "dd/MM/yyyy", { locale: it });
      finalMessage += `DATA DI RICHIESTA INCONTRO: ${formattedDate} alle ${time}\n\n`;
    } else if (date) {
      const formattedDate = format(date, "dd/MM/yyyy", { locale: it });
      finalMessage += `DATA DI RICHIESTA INCONTRO: ${formattedDate} (orario non specificato)\n\n`;
    }

    finalMessage += `TESTO: ${trimmedMessage}`;

    try {
      const response = await emailApiService.sendContactEmail({
        name: trimmedName,
        email: trimmedEmail,
        body: finalMessage,
      });

      setName("");
      setEmail("");
      setMessage("");
      setDate(undefined);
      setTime("");
      setIsSubmitting(false);
      setSuccessMessage(response.message ?? "Richiesta inviata correttamente.");

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
      className={cn("bg-white p-8 border border-gray-100 space-y-6", className)}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 flex flex-col">
          <span className="text-gray-700 font-medium text-left">
            Data incontro
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal h-[58px] rounded-2xl border-gray-200",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? (
                  format(date, "PPP", { locale: it })
                ) : (
                  <span>Seleziona una data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                locale={it}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2 flex flex-col">
          <label className="block text-left flex flex-col space-y-2">
            <span className="text-gray-700 font-medium">Orario</span>
            <input
              type="time"
              className="w-full h-[58px] rounded-2xl border border-gray-200 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-agri-green-500 focus:border-transparent transition"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-left">
          <span className="text-gray-700 font-medium">
            Raccontaci la tua richiesta *
          </span>
          <textarea
            className="mt-2 w-full min-h-[120px] rounded-2xl border border-gray-200 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-agri-green-500 focus:border-transparent transition"
            placeholder="Descrivi come possiamo aiutarti..."
            value={message}
            onChange={handleMessageChange}
            required
          />
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
        {isSubmitting ? "Invio in corso..." : "Invia richiesta"}
      </button>
    </form>
  );
}
