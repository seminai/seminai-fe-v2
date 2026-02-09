import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { emailApiService } from "@/api/email";
import { SignaturePadField } from "@/components/molecules/SignaturePadField";
import {
  AGREEMENT_PART_1,
  AGREEMENT_PART_2,
  PLANS_TABLE_HEADERS,
  PLANS_TABLE_ROWS,
  PRICING_TABLE_HEADERS,
  PRICING_TABLE_ROWS,
  PRICING_TABLE_TITLE,
  replacePlaceholders,
} from "@/constants/betaTesterAgreement";

type AgreementFormState = {
  firstName: string;
  lastName: string;
  email: string;
  vatNumber: string;
  birthDate: string;
  registeredOfficeAddress: string;
  signatureDataUrl: string;
};

const INITIAL_FORM_STATE: AgreementFormState = {
  firstName: "",
  lastName: "",
  email: "",
  vatNumber: "",
  birthDate: "",
  registeredOfficeAddress: "",
  signatureDataUrl: "",
};

function buildPlaceholders(formState: AgreementFormState, signedAt: Date) {
  const partnerName =
    `${formState.firstName.trim()} ${formState.lastName.trim()}`.trim() ||
    "_______________________________";
  return {
    currentDate: format(signedAt, "dd/MM/yyyy", { locale: it }),
    partnerName,
    registeredOfficeAddress:
      formState.registeredOfficeAddress.trim() ||
      "__________indirizzo completo___________",
    vatNumber: formState.vatNumber.trim() || "______________________",
  };
}

function isStep1Complete(formState: AgreementFormState): boolean {
  return (
    Boolean(formState.firstName.trim()) &&
    Boolean(formState.lastName.trim()) &&
    Boolean(formState.email.trim()) &&
    Boolean(formState.vatNumber.trim()) &&
    Boolean(formState.birthDate) &&
    Boolean(formState.registeredOfficeAddress.trim())
  );
}

function isSubmitDisabled(
  formState: AgreementFormState,
  isSubmitting: boolean,
): boolean {
  return (
    isSubmitting || !isStep1Complete(formState) || !formState.signatureDataUrl
  );
}

type AgreementLineType =
  | "main-title"
  | "section"
  | "subsection"
  | "bullet"
  | "short-heading"
  | "empty"
  | "paragraph";

function getAgreementLineType(line: string, index: number): AgreementLineType {
  const t = line.trim();
  if (t === "") return "empty";
  if (index === 0 && t.startsWith("ACCORDO COMMERCIALE")) return "main-title";
  if (/^\d+\.\s+/.test(t)) return "section";
  if (/^[a-z]\)\s+/.test(t)) return "subsection";
  if (/^•\s+/.test(t)) return "bullet";
  if (t.length <= 35 && /^[A-Z]/.test(t) && !/^\d/.test(t))
    return "short-heading";
  return "paragraph";
}

function AgreementPreviewContent({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-0 text-sm text-gray-800">
      {lines.map((rawLine, index) => {
        const lineType = getAgreementLineType(rawLine, index);
        const line = rawLine.trim();
        if (lineType === "empty") {
          return <div key={index} className="h-2" aria-hidden />;
        }
        if (lineType === "main-title") {
          return (
            <h2
              key={index}
              className="text-base font-bold text-gray-900 mt-4 first:mt-0"
            >
              {line}
            </h2>
          );
        }
        if (lineType === "section") {
          return (
            <h3 key={index} className="text-sm font-bold text-gray-900 mt-3">
              {line}
            </h3>
          );
        }
        if (lineType === "subsection" || lineType === "short-heading") {
          return (
            <p key={index} className="text-sm font-semibold text-gray-800 mt-2">
              {line}
            </p>
          );
        }
        if (lineType === "bullet") {
          return (
            <p
              key={index}
              className="text-sm text-gray-800 pl-4 ml-1 border-l-2 border-gray-200 mt-1"
            >
              {line}
            </p>
          );
        }
        return (
          <p key={index} className="text-sm leading-relaxed mt-1">
            {line}
          </p>
        );
      })}
    </div>
  );
}

export default function BetaTesterAgreement() {
  const [formState, setFormState] =
    useState<AgreementFormState>(INITIAL_FORM_STATE);
  const [step, setStep] = useState<1 | 2>(1);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signedAt] = useState(() => new Date());

  const agreementPlaceholders = useMemo(
    () => buildPlaceholders(formState, signedAt),
    [formState, signedAt],
  );

  const part1Text = useMemo(
    () => replacePlaceholders(AGREEMENT_PART_1, agreementPlaceholders),
    [agreementPlaceholders],
  );
  const part2Text = useMemo(
    () => replacePlaceholders(AGREEMENT_PART_2, agreementPlaceholders),
    [agreementPlaceholders],
  );

  const handleChange =
    (key: keyof AgreementFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormState((currentState) => ({
        ...currentState,
        [key]: event.target.value,
      }));
      setErrorMessage("");
      setSuccessMessage("");
    };

  function buildPdfBlob(): { blob: Blob; fileName: string } {
    const doc = new jsPDF({
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const maxTextWidth = pageWidth - margin * 2;

    let cursorY = margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Accordo Commerciale Beta Tester - Seminai", margin, cursorY);
    cursorY += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const addAgreementContent = (text: string, spaceAfter = 2) => {
      const lines = text.split("\n");
      lines.forEach((rawLine, index) => {
        const lineType = getAgreementLineType(rawLine, index);
        if (lineType === "empty") {
          cursorY += 3;
          return;
        }
        if (cursorY > pageHeight - margin) {
          doc.addPage();
          cursorY = margin;
        }
        const line = rawLine.trim();
        if (lineType === "main-title") {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          const wrapped = doc.splitTextToSize(line, maxTextWidth);
          wrapped.forEach((l: string) => {
            doc.text(l, margin, cursorY);
            cursorY += 5;
          });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          cursorY += 2;
          return;
        }
        if (lineType === "section") {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          const wrapped = doc.splitTextToSize(line, maxTextWidth);
          wrapped.forEach((l: string) => {
            doc.text(l, margin, cursorY);
            cursorY += 4;
          });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          cursorY += 1;
          return;
        }
        if (lineType === "subsection" || lineType === "short-heading") {
          doc.setFont("helvetica", "bold");
          const wrapped = doc.splitTextToSize(line, maxTextWidth);
          wrapped.forEach((l: string) => {
            doc.text(l, margin, cursorY);
            cursorY += 4;
          });
          doc.setFont("helvetica", "normal");
          cursorY += 1;
          return;
        }
        if (lineType === "bullet") {
          const bulletIndent = margin + 4;
          const bulletWidth = maxTextWidth - 4;
          const wrapped = doc.splitTextToSize(line, bulletWidth);
          wrapped.forEach((l: string) => {
            doc.text(l, bulletIndent, cursorY);
            cursorY += 4;
          });
          cursorY += 1;
          return;
        }
        const wrapped = doc.splitTextToSize(line, maxTextWidth);
        wrapped.forEach((l: string) => {
          doc.text(l, margin, cursorY);
          cursorY += 4;
        });
        cursorY += 1;
      });
      cursorY += spaceAfter;
    };

    addAgreementContent(part1Text, 6);

    autoTable(doc, {
      head: [PLANS_TABLE_HEADERS],
      body: PLANS_TABLE_ROWS.map((r) => [...r]),
      startY: cursorY,
      margin: { left: margin },
      tableWidth: pageWidth - margin * 2,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [240, 240, 240] },
    });
    cursorY =
      (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 6;

    if (cursorY > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.text(PRICING_TABLE_TITLE, margin, cursorY);
    cursorY += 6;
    doc.setFont("helvetica", "normal");

    autoTable(doc, {
      head: [PRICING_TABLE_HEADERS],
      body: PRICING_TABLE_ROWS.map((r) => [...r]),
      startY: cursorY,
      margin: { left: margin },
      tableWidth: pageWidth - margin * 2,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [240, 240, 240] },
    });
    cursorY =
      (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 6;

    addAgreementContent(part2Text, 2);

    if (formState.signatureDataUrl) {
      const signatureHeight = 28;
      const signatureWidth = 80;

      if (cursorY + signatureHeight + 12 > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }

      doc.setFont("helvetica", "bold");
      doc.text("Firma Partner:", margin, cursorY + 5);
      doc.setFont("helvetica", "normal");
      doc.addImage(
        formState.signatureDataUrl,
        "PNG",
        margin,
        cursorY + 8,
        signatureWidth,
        signatureHeight,
      );
    }

    const sanitizedName =
      `${formState.firstName.trim()}_${formState.lastName.trim()}`
        .trim()
        .replace(/\s+/g, "_")
        .toLowerCase();
    const fileName = sanitizedName
      ? `accordo_beta_tester_${sanitizedName}.pdf`
      : "accordo_beta_tester.pdf";

    const blob = doc.output("blob");
    return { blob, fileName };
  }

  const handleConfirmAndDownloadPdf = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const {
      firstName,
      lastName,
      email,
      vatNumber,
      birthDate,
      registeredOfficeAddress,
    } = formState;

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !vatNumber.trim() ||
      !birthDate ||
      !registeredOfficeAddress.trim()
    ) {
      setErrorMessage("Compila tutti i campi obbligatori prima di inviare.");
      return;
    }

    if (!formState.signatureDataUrl) {
      setErrorMessage("Inserisci la firma per completare l'accordo.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    const formattedBirthDate = format(new Date(birthDate), "dd/MM/yyyy", {
      locale: it,
    });

    try {
      const { blob, fileName } = buildPdfBlob();

      // Download PDF to user
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(downloadUrl);

      // Prepare email body (PDF will be attached)
      const emailBody = `Nuovo accordo Beta Tester sottoscritto.

Dati partner:
- Nome e cognome: ${firstName.trim()} ${lastName.trim()}
- Email: ${email.trim()}
- Partita IVA / C.F.: ${vatNumber.trim()}
- Data di nascita: ${formattedBirthDate}
- Sede legale: ${registeredOfficeAddress.trim()}
- Data sottoscrizione: ${format(signedAt, "dd/MM/yyyy", { locale: it })}

Il PDF firmato è allegato a questa email.`;

      // Create File from blob to attach to email
      const pdfFile = new File([blob], fileName, { type: "application/pdf" });

      // Send email with PDF attachment
      await emailApiService.sendContactEmail({
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim(),
        body: emailBody,
        files: [pdfFile],
      });

      setSuccessMessage("Accordo inviato correttamente con PDF allegato. Grazie!");
      setFormState(INITIAL_FORM_STATE);
      setStep(1);
    } catch (err) {
      // Only fail if upload/download failed (not just email)
      setErrorMessage(
        err instanceof Error ? err.message : "Errore durante l'invio. Riprova.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black px-4 py-10 md:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">
            Diventa Beta Tester
          </h1>
          <p className="text-gray-600">
            {step === 1
              ? "Compila i dati del Partner e clicca Procedi per visualizzare l'accordo e firmare."
              : "Verifica l'accordo con i tuoi dati, firma e invia."}
          </p>
        </header>

        {step === 1 ? (
          <form
            className="rounded-2xl border border-gray-200 p-6 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (isStep1Complete(formState)) setStep(2);
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="text-gray-700 font-medium">Nome *</span>
                <input
                  className="w-full rounded-2xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-agri-green-500"
                  placeholder="Mario"
                  value={formState.firstName}
                  onChange={handleChange("firstName")}
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-gray-700 font-medium">Cognome *</span>
                <input
                  className="w-full rounded-2xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-agri-green-500"
                  placeholder="Rossi"
                  value={formState.lastName}
                  onChange={handleChange("lastName")}
                  required
                />
              </label>
            </div>

            <label className="space-y-2 block">
              <span className="text-gray-700 font-medium">Email *</span>
              <input
                type="email"
                className="w-full rounded-2xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-agri-green-500"
                placeholder="mario.rossi@example.com"
                value={formState.email}
                onChange={handleChange("email")}
                required
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="text-gray-700 font-medium">
                  Partita IVA / C.F. *
                </span>
                <input
                  className="w-full rounded-2xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-agri-green-500"
                  placeholder="01234567890"
                  value={formState.vatNumber}
                  onChange={handleChange("vatNumber")}
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-gray-700 font-medium">
                  Data nascita *
                </span>
                <input
                  type="date"
                  className="w-full rounded-2xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-agri-green-500"
                  value={formState.birthDate}
                  onChange={handleChange("birthDate")}
                  required
                />
              </label>
            </div>

            <label className="space-y-2 block">
              <span className="text-gray-700 font-medium">
                Indirizzo sede legale *
              </span>
              <input
                className="w-full rounded-2xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-agri-green-500"
                placeholder="Via Roma 1, 20100 Milano (MI)"
                value={formState.registeredOfficeAddress}
                onChange={handleChange("registeredOfficeAddress")}
                required
              />
            </label>

            <button
              type="submit"
              className="w-full py-3 px-6 rounded-2xl bg-agri-green-600 text-white font-semibold hover:bg-agri-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!isStep1Complete(formState)}
            >
              Procedi
            </button>
          </form>
        ) : (
          <>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 md:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-gray-600">
                  Data compilata automaticamente:{" "}
                  <span className="font-semibold text-gray-900">
                    {format(signedAt, "dd/MM/yyyy", { locale: it })}
                  </span>
                </p>
                <button
                  type="button"
                  className="text-sm text-agri-green-600 font-medium hover:underline"
                  onClick={() => setStep(1)}
                >
                  Modifica dati
                </button>
              </div>
              <AgreementPreviewContent text={part1Text} />
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 text-sm text-left">
                  <thead>
                    <tr className="bg-gray-100">
                      {PLANS_TABLE_HEADERS.map((h) => (
                        <th
                          key={h}
                          className="border border-gray-300 px-3 py-2 font-semibold"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PLANS_TABLE_ROWS.map((row, i) => (
                      <tr key={i} className="bg-white">
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className="border border-gray-300 px-3 py-2"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {PRICING_TABLE_TITLE}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 text-sm text-left">
                  <thead>
                    <tr className="bg-gray-100">
                      {PRICING_TABLE_HEADERS.map((h) => (
                        <th
                          key={h}
                          className="border border-gray-300 px-3 py-2 font-semibold"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PRICING_TABLE_ROWS.map((row, i) => (
                      <tr key={i} className="bg-white">
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className="border border-gray-300 px-3 py-2"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AgreementPreviewContent text={part2Text} />
            </div>

            <form
              className="rounded-2xl border border-gray-200 p-6 space-y-5"
              onSubmit={handleConfirmAndDownloadPdf}
            >
              <SignaturePadField
                value={formState.signatureDataUrl}
                onChange={(signatureDataUrl) => {
                  setFormState((currentState) => ({
                    ...currentState,
                    signatureDataUrl,
                  }));
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
              />

              {errorMessage && (
                <p className="text-sm text-red-500">{errorMessage}</p>
              )}
              {successMessage && (
                <p className="text-sm text-green-700">{successMessage}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 px-6 rounded-2xl bg-agri-green-600 text-white font-semibold hover:bg-agri-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isSubmitDisabled(formState, isSubmitting)}
              >
                {isSubmitting
                  ? "Elaborazione in corso..."
                  : "Conferma e scarica PDF"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
