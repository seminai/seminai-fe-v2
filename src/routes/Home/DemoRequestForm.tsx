import { useEffect, useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { emailApiService } from "@/api/email";
import { RichHtml } from "./RichHtml";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Optional leading +, then 8-15 digits once spaces, dots, dashes and brackets are ignored. */
function isValidPhone(value: string): boolean {
  return /^\+?\d{8,15}$/.test(value.replace(/[\s.\-()/]/g, ""));
}

const CONTACT_PREFERENCES = ["email", "phone"] as const;
type ContactPreference = (typeof CONTACT_PREFERENCES)[number];

/** 09:00 to 17:30, every 30 minutes. */
const TIME_SLOTS = Array.from({ length: 18 }, (_, slot) => {
  const minutes = 9 * 60 + slot * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

type Field = "name" | "email" | "phone" | "sector" | "interests" | "day" | "time";
type Status = "idle" | "submitting" | "success" | "error";

interface Values {
  name: string;
  email: string;
  phone: string;
  contactPreference: ContactPreference;
  sector: string;
  interests: string[];
  day: string;
  time: string;
  notes: string;
}

const EMPTY: Values = {
  name: "",
  email: "",
  phone: "",
  contactPreference: "email",
  sector: "",
  interests: [],
  day: "",
  time: "",
  notes: "",
};

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseIsoDate(value: string): Date | null {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function isWeekday(date: Date): boolean {
  const weekday = date.getDay();
  return weekday !== 0 && weekday !== 6;
}

export function DemoRequestForm() {
  const { t, i18n } = useTranslation();
  const id = useId();
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<Status>("idle");
  // Computed on the client only, so the prerendered HTML and hydration agree.
  const [minDay, setMinDay] = useState<string | undefined>(undefined);

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setMinDay(toIsoDate(tomorrow));
  }, []);

  const sectors = t("landing.booking.sectors", { returnObjects: true }) as string[];
  const interests = t("landing.booking.interests", { returnObjects: true }) as string[];

  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const toggleInterest = (interest: string) =>
    set(
      "interests",
      values.interests.includes(interest)
        ? values.interests.filter((item) => item !== interest)
        : [...values.interests, interest],
    );

  function validate(): Partial<Record<Field, string>> {
    const found: Partial<Record<Field, string>> = {};
    if (values.name.trim().length < 2) found.name = t("landing.booking.errors.name");
    if (!EMAIL_REGEX.test(values.email.trim())) found.email = t("landing.booking.errors.email");
    // The phone is required only for visitors who want a call; if given anyway it must be valid.
    const phone = values.phone.trim();
    if ((values.contactPreference === "phone" || phone) && !isValidPhone(phone)) {
      found.phone = t("landing.booking.errors.phone");
    }
    if (!values.sector) found.sector = t("landing.booking.errors.sector");
    if (values.interests.length === 0) found.interests = t("landing.booking.errors.interests");
    const day = parseIsoDate(values.day);
    if (!day || !isWeekday(day) || (minDay !== undefined && values.day < minDay)) {
      found.day = t("landing.booking.errors.day");
    }
    if (!values.time) found.time = t("landing.booking.errors.time");
    return found;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const day = parseIsoDate(values.day);
    const dayLabel = day
      ? day.toLocaleDateString(i18n.language, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : values.day;
    const lines = [
      `${t("landing.booking.emailSubject")} seminai.tech`,
      "",
      `${t("landing.booking.emailLines.contactPref")}: ${t(`landing.booking.contactOptions.${values.contactPreference}`)}`,
      `${t("landing.booking.emailLines.phone")}: ${values.phone.trim() || "-"}`,
      `${t("landing.booking.emailLines.day")}: ${dayLabel}`,
      `${t("landing.booking.emailLines.time")}: ${values.time}`,
      `${t("landing.booking.emailLines.sector")}: ${values.sector}`,
      `${t("landing.booking.emailLines.interests")}: ${values.interests.join(", ")}`,
      `${t("landing.booking.emailLines.notes")}: ${values.notes.trim() || "-"}`,
    ];

    setStatus("submitting");
    try {
      await emailApiService.sendContactEmail({
        name: values.name.trim(),
        email: values.email.trim(),
        body: lines.join("\n"),
      });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="booking-form booking-success" role="status">
        <p className="booking-success-title">{t("landing.booking.successTitle")}</p>
        <p>
          {values.contactPreference === "phone"
            ? t("landing.booking.successPhone", { phone: values.phone.trim() })
            : t("landing.booking.success", { email: values.email.trim() })}
        </p>
      </div>
    );
  }

  const fieldId = (name: string) => `${id}-${name}`;
  const errorFor = (field: Field) =>
    errors[field] ? (
      <span className="field-error" id={fieldId(`${field}-error`)}>
        {errors[field]}
      </span>
    ) : null;
  const describedBy = (field: Field) => (errors[field] ? fieldId(`${field}-error`) : undefined);

  return (
    <form className="booking-form" onSubmit={handleSubmit} noValidate>
      <div className="field-row">
        <label className="field" htmlFor={fieldId("name")}>
          <span>{t("landing.booking.fields.name")} *</span>
          <input
            id={fieldId("name")}
            autoComplete="name"
            value={values.name}
            placeholder={t("landing.booking.placeholders.name")}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describedBy("name")}
            onChange={(event) => set("name", event.target.value)}
          />
          {errorFor("name")}
        </label>
        <label className="field" htmlFor={fieldId("email")}>
          <span>{t("landing.booking.fields.email")} *</span>
          <input
            id={fieldId("email")}
            type="email"
            autoComplete="email"
            value={values.email}
            placeholder={t("landing.booking.placeholders.email")}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={describedBy("email")}
            onChange={(event) => set("email", event.target.value)}
          />
          {errorFor("email")}
        </label>
      </div>

      <div className="field-row">
        <label className="field" htmlFor={fieldId("phone")}>
          <span>
            {t("landing.booking.fields.phone")}
            {values.contactPreference === "phone" ? " *" : ""}
          </span>
          <input
            id={fieldId("phone")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={values.phone}
            placeholder={t("landing.booking.placeholders.phone")}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={describedBy("phone")}
            onChange={(event) => set("phone", event.target.value)}
          />
          {errorFor("phone")}
        </label>
        <fieldset className="field">
          <legend>{t("landing.booking.fields.contactPref")} *</legend>
          <div className="interest-chips">
            {CONTACT_PREFERENCES.map((option) => {
              const checked = values.contactPreference === option;
              return (
                <label key={option} className={`chip chip-toggle${checked ? " is-on" : ""}`}>
                  <input
                    type="radio"
                    name={fieldId("contact-preference")}
                    value={option}
                    checked={checked}
                    onChange={() => set("contactPreference", option)}
                  />
                  {t(`landing.booking.contactOptions.${option}`)}
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>

      <label className="field" htmlFor={fieldId("sector")}>
        <span>{t("landing.booking.fields.sector")} *</span>
        <select
          id={fieldId("sector")}
          value={values.sector}
          aria-invalid={Boolean(errors.sector)}
          aria-describedby={describedBy("sector")}
          onChange={(event) => set("sector", event.target.value)}
        >
          <option value="">{t("landing.booking.placeholders.sector")}</option>
          {sectors.map((sector) => (
            <option key={sector} value={sector}>
              {sector}
            </option>
          ))}
        </select>
        {errorFor("sector")}
      </label>

      <fieldset className="field" aria-describedby={describedBy("interests")}>
        <legend>{t("landing.booking.fields.interests")} *</legend>
        <div className="interest-chips">
          {interests.map((interest) => {
            const checked = values.interests.includes(interest);
            return (
              <label key={interest} className={`chip chip-toggle${checked ? " is-on" : ""}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleInterest(interest)}
                />
                {interest}
              </label>
            );
          })}
        </div>
        {errorFor("interests")}
      </fieldset>

      <div className="field-row">
        <label className="field" htmlFor={fieldId("day")}>
          <span>{t("landing.booking.fields.day")} *</span>
          <input
            id={fieldId("day")}
            type="date"
            min={minDay}
            value={values.day}
            aria-invalid={Boolean(errors.day)}
            aria-describedby={describedBy("day")}
            onChange={(event) => set("day", event.target.value)}
          />
          {errorFor("day")}
        </label>
        <label className="field" htmlFor={fieldId("time")}>
          <span>{t("landing.booking.fields.time")} *</span>
          <select
            id={fieldId("time")}
            value={values.time}
            aria-invalid={Boolean(errors.time)}
            aria-describedby={describedBy("time")}
            onChange={(event) => set("time", event.target.value)}
          >
            <option value="">{t("landing.booking.placeholders.time")}</option>
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
          {errorFor("time")}
        </label>
      </div>

      <label className="field" htmlFor={fieldId("notes")}>
        <span>{t("landing.booking.fields.notes")}</span>
        <textarea
          id={fieldId("notes")}
          rows={2}
          maxLength={1500}
          value={values.notes}
          placeholder={t("landing.booking.placeholders.notes")}
          onChange={(event) => set("notes", event.target.value)}
        />
      </label>

      {status === "error" ? (
        <p className="form-error" role="alert">
          <RichHtml html={t("landing.booking.error")} />
        </p>
      ) : null}

      <button type="submit" className="btn-primary booking-submit" disabled={status === "submitting"}>
        {status === "submitting" ? t("landing.booking.submitting") : t("landing.booking.submit")}
      </button>
      <p className="booking-privacy">
        <RichHtml html={t("landing.booking.privacy")} />
      </p>
    </form>
  );
}
