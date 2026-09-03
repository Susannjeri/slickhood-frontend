const MEBIBYTE = 1024 * 1024;

export const MAX_KYC_FILE_BYTES = 10 * MEBIBYTE;
export const MAX_KYC_FILE_LABEL = "10 MB";
const OPTIMIZED_TARGET_BYTES = 9 * MEBIBYTE;
const ALLOWED_KYC_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

export type PreparedKycUpload = { file: File; optimized: boolean };

async function detectedContentType(file: File): Promise<string | undefined> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)
    return "application/pdf";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a)
    return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  return undefined;
}

export async function prepareKycUpload(file: File): Promise<PreparedKycUpload> {
  const detectedType = await detectedContentType(file);
  if (!detectedType) {
    throw new Error("This file is not a supported JPG, PNG or PDF. If your phone saved it as HEIC, convert or share it as JPG, then try again.");
  }
  if (ALLOWED_KYC_TYPES.has(file.type) && file.type !== detectedType) {
    throw new Error("The file contents do not match its format. Export the original again as JPG, PNG or PDF.");
  }
  const normalizedFile = file.type === detectedType
    ? file
    : new File([file], file.name || "document", { type: detectedType, lastModified: file.lastModified });
  if (normalizedFile.size <= MAX_KYC_FILE_BYTES) return { file: normalizedFile, optimized: false };
  if (detectedType === "application/pdf") {
    throw new Error(`This PDF is larger than ${MAX_KYC_FILE_LABEL}. Compress or split it, then try again.`);
  }

  const bitmap = await createImageBitmap(normalizedFile);
  try {
    let width = bitmap.width;
    let height = bitmap.height;
    const longestEdge = Math.max(width, height);
    if (longestEdge > 3200) {
      const ratio = 3200 / longestEdge;
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58]) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d", { alpha: false })?.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= OPTIMIZED_TARGET_BYTES) {
        const baseName = normalizedFile.name.replace(/\.[^.]+$/, "") || "document";
        return { file: new File([blob], `${baseName}-optimized.jpg`, { type: "image/jpeg" }), optimized: true };
      }
      width = Math.max(1200, Math.round(width * 0.85));
      height = Math.max(750, Math.round(height * 0.85));
    }
  } finally {
    bitmap.close();
  }

  throw new Error(`This image could not be safely reduced below ${MAX_KYC_FILE_LABEL}. Use a smaller or clearer photo.`);
}
