import fs from "fs";

type PdfParseFn = (data: Buffer) => Promise<{ text: string }>;

type PDFExtractOptions = {
  normalizeWhitespace?: boolean;
  disableCombineTextItems?: boolean;
};

interface PDFExtractClass {
  extract: (
    pdfPath: string,
    options: PDFExtractOptions,
    cb: (err: unknown, data: unknown) => void
  ) => void;
}

interface PdfJsExtractModule {
  PDFExtract: new () => PDFExtractClass;
}

export async function convertPdfToText(
  pdfPath: string
): Promise<{ path: string; text: string }> {
  console.log(`Converting PDF to text: ${pdfPath}`);
  const dataBuffer = fs.readFileSync(pdfPath);

  // Lazy-load pdf-parse usando import dinamico
  const pdfParse = (await import("pdf-parse")) as unknown as PdfParseFn;

  const data = await pdfParse(dataBuffer);
  const outputPath = pdfPath.replace(/\.pdf$/i, ".txt");

  fs.writeFileSync(outputPath, data.text);

  console.log(`Text: ${data.text}`);

  return { path: outputPath, text: data.text };
}

export async function convertPdfToTextWithPositionalAnaylsis(
  pdfPath: string
): Promise<{ path: string; text: string }> {
  const startTime = Date.now();
  const Y_START = 0; //100 -> prima 100 rimuoveva la testata
  console.log(`Converting PDF to text with positional analysis: ${pdfPath}`);

  // Lazy-load pdf.js-extract usando import dinamico
  let pdfExtractInstance: PDFExtractClass | null = null;
  try {
    const mod = (await import("pdf.js-extract")) as PdfJsExtractModule;
    pdfExtractInstance = new mod.PDFExtract();
  } catch {
    // Fallback to simple text extraction if pdf.js-extract is not installed
    return convertPdfToText(pdfPath);
  }

  const options: PDFExtractOptions = {
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  };
  type PDFExtractPageContentItem = {
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  type PDFExtractPage = { content: PDFExtractPageContentItem[] };
  type PDFExtractResult = { pages: PDFExtractPage[] };

  const data: PDFExtractResult = await new Promise<PDFExtractResult>(
    (resolve, reject) => {
      if (!pdfExtractInstance) {
        reject(new Error("pdfExtractInstance not initialized"));
        return;
      }
      pdfExtractInstance.extract(
        pdfPath,
        options,
        (err: unknown, data: unknown) => {
          if (err) {
            reject(err as Error);
          } else {
            resolve(data as PDFExtractResult);
          }
        }
      );
    }
  );

  const pageTexts: string[] = [];

  for (const page of data.pages) {
    const items: {
      str: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }[] = [];
    for (const item of page.content) {
      if (item.str && item.str.trim() && item.y >= Y_START) {
        items.push({
          str: item.str.trim(),
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
        });
      }
    }

    const yTolerance = 6; // pixels
    items.sort((a, b) => a.y - b.y || a.x - b.x);
    const rows: { y: number; items: typeof items }[] = [];
    for (const item of items) {
      let row = rows.find((r) => Math.abs(r.y - item.y) < yTolerance);
      if (!row) {
        row = { y: item.y, items: [] };
        rows.push(row);
      }
      row.items.push(item);
    }

    for (const row of rows) {
      row.items.sort((a, b) => a.x - b.x);
    }

    const lines = rows.map((row) => row.items.map((i) => i.str).join(" "));
    const pageText = lines.join("\n");
    pageTexts.push(pageText);
  }

  const text = pageTexts.join("\n\n--- Page Break ---\n\n");
  const outputPath = pdfPath.replace(/\.pdf$/i, ".txt");
  fs.writeFileSync(outputPath, text);

  console.log(`Time taken to convert PDF to text: ${Date.now() - startTime}ms`);
  console.log(`Text: ${text}`);

  return { path: outputPath, text };
}
