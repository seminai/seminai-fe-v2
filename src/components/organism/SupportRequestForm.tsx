import { ChangeEvent, FormEvent, useState } from "react";
import { emailApiService } from "@/api/email";
import { cn } from "@/lib/utils";

interface SupportRequestFormProps {
  className?: string;
  onSuccess?: () => void;
}

export function SupportRequestForm({
  className,
  onSuccess,
}: SupportRequestFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
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

    const finalMessage = `RICHIESTA SUPPORTO - ESTRAZIONE CAMPI DA CSV\n\nNome: ${trimmedName}\nEmail: ${trimmedEmail}\n\nMessaggio:\n${trimmedMessage}`;

    try {
      const response = await emailApiService.sendContactEmail({
        name: trimmedName,
        email: trimmedEmail,
        body: finalMessage,
      });

      setName("");
      setEmail("");
      setMessage("");
      setIsSubmitting(false);
      setSuccessMessage(
        response.message ??
          "Richiesta inviata correttamente. Ti risponderemo al più presto."
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

      <div className="space-y-2">
        <label className="block text-left">
          <span className="text-gray-700 font-medium">
            Descrivi il problema *
          </span>
          <textarea
            className="mt-2 w-full min-h-[120px] rounded-2xl border border-gray-200 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-agri-green-500 focus:border-transparent transition"
            placeholder="Descrivi il problema che stai riscontrando..."
            value={message}
            onChange={handleMessageChange}
            required
          />
        </label>
      </div>

      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
      {successMessage && <p className="text-sm text-black">{successMessage}</p>}

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
