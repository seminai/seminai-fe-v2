import pako from "pako";

/** Soglia di compressione: 1KB */
const COMPRESSION_THRESHOLD_BYTES = 1024;

/** Dimensione chunk per evitare "Maximum call stack size exceeded" con fromCharCode */
const BASE64_CHUNK_SIZE = 8192;

export interface CompressionResult {
  compressed: boolean;
  body: string;
  originalSize: number;
  compressedSize: number;
}

/**
 * Converte un Uint8Array in stringa binaria a chunk per evitare stack overflow.
 */
function uint8ArrayToBinaryString(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK_SIZE) {
    const chunk = bytes.subarray(
      i,
      Math.min(i + BASE64_CHUNK_SIZE, bytes.length),
    );
    result += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return result;
}

/**
 * Comprime un body JSON con gzip e lo codifica in base64.
 * Se il body è sotto la soglia (1KB) o la compressione fallisce,
 * ritorna il body originale invariato.
 */
export function compressJsonBody(jsonBody: string): CompressionResult {
  const originalSize = new Blob([jsonBody]).size;

  if (originalSize < COMPRESSION_THRESHOLD_BYTES) {
    return {
      compressed: false,
      body: jsonBody,
      originalSize,
      compressedSize: originalSize,
    };
  }

  try {
    const encoder = new TextEncoder();
    const inputBytes = encoder.encode(jsonBody);
    const compressedBytes = pako.gzip(inputBytes);

    const binaryString = uint8ArrayToBinaryString(
      new Uint8Array(compressedBytes),
    );
    const base64 = btoa(binaryString);

    if (import.meta.env.DEV) {
      const ratio = (
        (1 - compressedBytes.length / originalSize) *
        100
      ).toFixed(1);
      console.log(
        `[compress] ${(originalSize / 1024).toFixed(1)}KB → ${(compressedBytes.length / 1024).toFixed(1)}KB (${ratio}% riduzione)`,
      );
    }

    return {
      compressed: true,
      body: JSON.stringify({ compressed: true, data: base64 }),
      originalSize,
      compressedSize: compressedBytes.length,
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(
        "[compress] Compressione fallita, invio non compresso:",
        error,
      );
    }
    return {
      compressed: false,
      body: jsonBody,
      originalSize,
      compressedSize: originalSize,
    };
  }
}
