import { ChangeEvent, FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { enUS, it } from "date-fns/locale";
import { normalizeLanguage } from "@/i18n";

interface ContactRequestFormProps {
  className?: string;
  onSuccess?: () => void;
}

export function ContactRequestForm({
  className,
  onSuccess,
}: ContactRequestFormProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = normalizeLanguage(i18n.language) === "en" ? enUS : it;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
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
      setErrorMessage(t("contactRequest.validation.required"));
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage(t("contactRequest.validation.invalidEmail"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    let finalMessage = "";

    if (date && time) {
      const formattedDate = format(date, "dd/MM/yyyy", { locale: dateLocale });
      finalMessage += `${t("contactRequest.email.dateWithTime", {
        date: formattedDate,
        time,
      })}\n\n`;
    } else if (date) {
      const formattedDate = format(date, "dd/MM/yyyy", { locale: dateLocale });
      finalMessage += `${t("contactRequest.email.dateOnly", {
        date: formattedDate,
      })}\n\n`;
    }

    finalMessage += t("contactRequest.email.bodyLabel", {
      message: trimmedMessage,
    });

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
      setSuccessMessage(response.message ?? t("contactRequest.status.success"));

      if (onSuccess) {
        onSuccess();
      }
    } catch {
      setIsSubmitting(false);
      setErrorMessage(t("contactRequest.status.error"));
    }
  };

  return (
    <form
      className={cn("bg-white p-8 border border-gray-100 space-y-6", className)}
      onSubmit={handleSubmit}
    >
      <div className="space-y-2">
        <label className="block text-left">
          <span className="text-gray-700 font-medium">
            {t("contactRequest.fields.name")}
          </span>
          <input
            className="mt-2 w-full rounded-2xl border border-gray-200 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-agri-green-500 focus:border-transparent transition"
            placeholder={t("contactRequest.placeholders.name")}
            value={name}
            onChange={handleNameChange}
            required
          />
        </label>
      </div>

      <div className="space-y-2">
        <label className="block text-left">
          <span className="text-gray-700 font-medium">
            {t("contactRequest.fields.email")}
          </span>
          <input
            type="email"
            className="mt-2 w-full rounded-2xl border border-gray-200 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-agri-green-500 focus:border-transparent transition"
            placeholder={t("contactRequest.placeholders.email")}
            value={email}
            onChange={handleEmailChange}
            required
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 flex flex-col">
          <span className="text-gray-700 font-medium text-left">
            {t("contactRequest.fields.meetingDate")}
          </span>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
                  format(date, "PPP", { locale: dateLocale })
                ) : (
                  <span>{t("contactRequest.placeholders.date")}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setIsCalendarOpen(false);
                }}
                initialFocus
                locale={dateLocale}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <label className="block text-left">
            <span className="text-gray-700 font-medium">
              {t("contactRequest.fields.meetingTime")}
            </span>
            <input
              type="time"
              className="mt-2 w-full h-[58px] rounded-2xl border border-gray-200 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-agri-green-500 focus:border-transparent transition"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-left">
          <span className="text-gray-700 font-medium">
            {t("contactRequest.fields.message")}
          </span>
          <textarea
            className="mt-2 w-full min-h-[120px] rounded-2xl border border-gray-200 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-agri-green-500 focus:border-transparent transition"
            placeholder={t("contactRequest.placeholders.message")}
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
        {isSubmitting
          ? t("contactRequest.status.submitting")
          : t("contactRequest.status.submit")}
      </button>
    </form>
  );
}
