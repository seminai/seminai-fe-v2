import { useMemo, useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CheckCircle2, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  getAgreementLineType,
  buildBetaTesterPdfBlob,
} from "@/utils/buildBetaTesterPdf";

// ── Types ──────────────────────────────────────────────────────────────────

export type BetaTesterAgreementCheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Registration form values used to populate the agreement preview. */
  formData: {
    name: string;
    surname: string;
    email: string;
    fiscalCode: string;
    address: string;
  };
};

// ── Agreement text preview ─────────────────────────────────────────────────

function AgreementPreviewContent({ text }: { text: string }) {
  return (
    <div className="space-y-0 text-sm text-gray-800">
      {text.split("\n").map((rawLine, index) => {
        const lineType = getAgreementLineType(rawLine, index);
        const line = rawLine.trim();
        if (lineType === "empty")
          return <div key={index} className="h-2" aria-hidden />;
        if (lineType === "main-title")
          return (
            <h2
              key={index}
              className="text-base font-bold text-gray-900 mt-4 first:mt-0"
            >
              {line}
            </h2>
          );
        if (lineType === "section")
          return (
            <h3 key={index} className="text-sm font-bold text-gray-900 mt-3">
              {line}
            </h3>
          );
        if (lineType === "subsection" || lineType === "short-heading")
          return (
            <p
              key={index}
              className="text-sm font-semibold text-gray-800 mt-2"
            >
              {line}
            </p>
          );
        if (lineType === "bullet")
          return (
            <p
              key={index}
              className="text-sm text-gray-800 pl-4 ml-1 border-l-2 border-gray-200 mt-1"
            >
              {line}
            </p>
          );
        return (
          <p key={index} className="text-sm leading-relaxed mt-1">
            {line}
          </p>
        );
      })}
    </div>
  );
}

// ── Agreement table ────────────────────────────────────────────────────────

function AgreementTable({
  headers,
  rows,
}: {
  headers: readonly string[];
  rows: readonly (readonly string[])[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border border-gray-300 text-sm text-left">
        <thead>
          <tr className="bg-gray-100">
            {headers.map((h) => (
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
          {rows.map((row, i) => (
            <tr key={i} className="bg-white">
              {row.map((cell, j) => (
                <td key={j} className="border border-gray-300 px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function BetaTesterAgreementCheckbox({
  checked,
  onCheckedChange,
  formData,
}: BetaTesterAgreementCheckboxProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const now = useMemo(() => new Date(), []);

  const placeholders = useMemo(
    () => ({
      currentDate: format(now, "dd/MM/yyyy HH:mm", { locale: it }),
      partnerName:
        `${formData.name.trim()} ${formData.surname.trim()}`.trim() ||
        "_______________________________",
      registeredOfficeAddress:
        formData.address.trim() || "__________indirizzo completo___________",
      vatNumber: formData.fiscalCode.trim() || "______________________",
    }),
    [formData.name, formData.surname, formData.address, formData.fiscalCode, now],
  );

  const part1Text = useMemo(
    () => replacePlaceholders(AGREEMENT_PART_1, placeholders),
    [placeholders],
  );
  const part2Text = useMemo(
    () => replacePlaceholders(AGREEMENT_PART_2, placeholders),
    [placeholders],
  );

  const handleDownloadPdf = () => {
    const { blob, fileName } = buildBetaTesterPdfBlob({
      placeholders,
      checkboxAcceptance: {
        timestamp: format(now, "dd/MM/yyyy HH:mm:ss", { locale: it }),
        email: formData.email.trim(),
        fullName:
          `${formData.name.trim()} ${formData.surname.trim()}`.trim(),
      },
      fileNameHint: `${formData.name.trim()}_${formData.surname.trim()}`,
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Checkbox row */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="beta-tester-agreement"
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          className="mt-0.5 size-6 rounded-md border-2 shrink-0"
        />
        <span
          className="text-sm text-slate-700 cursor-pointer hover:underline select-none leading-relaxed"
          onClick={(e) => {
            e.preventDefault();
            setDialogOpen(true);
          }}
        >
          Accetto i{" "}
          <span className="font-semibold text-agri-green-700 underline underline-offset-2">
            termini commerciali per i Beta Tester
          </span>
          <span className="text-red-500 ml-0.5">*</span>
        </span>
      </div>

      {/* Agreement preview dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-w-[95vw] bg-white max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              Accordo Commerciale Beta Tester
            </DialogTitle>
          </DialogHeader>

          <div
            className="min-h-0 flex-1 overflow-y-auto pr-2 -mr-2 border-t pt-4"
            style={{ maxHeight: "min(65vh, 500px)" }}
          >
            <div className="space-y-4 pb-4">
              <AgreementPreviewContent text={part1Text} />
              <AgreementTable
                headers={PLANS_TABLE_HEADERS}
                rows={PLANS_TABLE_ROWS}
              />
              <p className="text-sm font-semibold text-gray-900">
                {PRICING_TABLE_TITLE}
              </p>
              <AgreementTable
                headers={PRICING_TABLE_HEADERS}
                rows={PRICING_TABLE_ROWS}
              />
              <AgreementPreviewContent text={part2Text} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t shrink-0">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleDownloadPdf}
            >
              <Download className="w-4 h-4 mr-2" />
              Scarica PDF
            </Button>
            {checked ? (
              <div
                className="flex flex-1 items-center justify-center gap-2 rounded-md border border-agri-green-200 bg-agri-green-50 px-4 py-3 text-sm font-medium text-agri-green-800"
                aria-live="polite"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 text-agri-green-600" />
                Termini già accettati
              </div>
            ) : (
              <Button
                type="button"
                className="flex-1 bg-agri-green-600 hover:bg-agri-green-700"
                onClick={() => {
                  onCheckedChange(true);
                  setDialogOpen(false);
                }}
              >
                Accetto i termini
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
