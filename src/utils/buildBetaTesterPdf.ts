import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AGREEMENT_PART_1,
  AGREEMENT_PART_2,
  PLANS_TABLE_HEADERS,
  PLANS_TABLE_ROWS,
  PRICING_TABLE_HEADERS,
  PRICING_TABLE_ROWS,
  PRICING_TABLE_TITLE,
  replacePlaceholders,
  type AgreementPlaceholders,
} from "@/constants/betaTesterAgreement";

// ── Line type classification (shared with preview components) ──────────────

export type AgreementLineType =
  | "main-title"
  | "section"
  | "subsection"
  | "bullet"
  | "short-heading"
  | "empty"
  | "paragraph";

export function getAgreementLineType(
  line: string,
  index: number,
): AgreementLineType {
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

// ── PDF builder ────────────────────────────────────────────────────────────

export type BuildPdfOptions = {
  placeholders: AgreementPlaceholders;
  /** Base64 data URL of a hand-drawn signature (SignaturePad). */
  signatureDataUrl?: string;
  /** Metadata recorded when the user accepted via checkbox at registration. */
  checkboxAcceptance?: {
    timestamp: string;
    email: string;
    fullName: string;
  };
  /** Human-friendly hint used to build the filename (e.g. "mario_rossi"). */
  fileNameHint?: string;
};

export function buildBetaTesterPdfBlob(
  options: BuildPdfOptions,
): { blob: Blob; fileName: string } {
  const { placeholders, signatureDataUrl, checkboxAcceptance, fileNameHint } =
    options;

  const part1Text = replacePlaceholders(AGREEMENT_PART_1, placeholders);
  const part2Text = replacePlaceholders(AGREEMENT_PART_2, placeholders);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
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

  // Helper – render a block of agreement text
  const addContent = (text: string, spaceAfter = 2) => {
    text.split("\n").forEach((rawLine, index) => {
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
        doc.splitTextToSize(line, maxTextWidth).forEach((l: string) => {
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
        doc.splitTextToSize(line, maxTextWidth).forEach((l: string) => {
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
        doc.splitTextToSize(line, maxTextWidth).forEach((l: string) => {
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
        doc.splitTextToSize(line, bulletWidth).forEach((l: string) => {
          doc.text(l, bulletIndent, cursorY);
          cursorY += 4;
        });
        cursorY += 1;
        return;
      }
      doc.splitTextToSize(line, maxTextWidth).forEach((l: string) => {
        doc.text(l, margin, cursorY);
        cursorY += 4;
      });
      cursorY += 1;
    });
    cursorY += spaceAfter;
  };

  // ── Content ──────────────────────────────────────────────────────────────
  addContent(part1Text, 6);

  // Plans table
  autoTable(doc, {
    head: [PLANS_TABLE_HEADERS],
    body: PLANS_TABLE_ROWS.map((r) => [...r]),
    startY: cursorY,
    margin: { left: margin },
    tableWidth: pageWidth - margin * 2,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
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

  // Pricing table
  autoTable(doc, {
    head: [PRICING_TABLE_HEADERS],
    body: PRICING_TABLE_ROWS.map((r) => [...r]),
    startY: cursorY,
    margin: { left: margin },
    tableWidth: pageWidth - margin * 2,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
  });
  cursorY =
    (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 6;

  addContent(part2Text, 2);

  // ── Signature / Acceptance block ─────────────────────────────────────────
  if (signatureDataUrl) {
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
      signatureDataUrl,
      "PNG",
      margin,
      cursorY + 8,
      signatureWidth,
      signatureHeight,
    );
  } else if (checkboxAcceptance) {
    if (cursorY + 30 > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
    cursorY += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Accettazione elettronica", margin, cursorY);
    cursorY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      "Accettato elettronicamente in fase di registrazione alla piattaforma SeminAI.",
      margin,
      cursorY,
    );
    cursorY += 5;
    doc.text(`Nome: ${checkboxAcceptance.fullName}`, margin, cursorY);
    cursorY += 5;
    doc.text(`Email: ${checkboxAcceptance.email}`, margin, cursorY);
    cursorY += 5;
    doc.text(
      `Data e ora di accettazione: ${checkboxAcceptance.timestamp}`,
      margin,
      cursorY,
    );
  }

  // ── Output ───────────────────────────────────────────────────────────────
  const safeName =
    (fileNameHint || "")
      .trim()
      .replace(/\s+/g, "_")
      .toLowerCase() || "utente";
  const fileName = `accordo_beta_tester_${safeName}.pdf`;
  const blob = doc.output("blob");
  return { blob, fileName };
}
