const MEBIBYTE = 1024 * 1024;

export const MAX_KYC_FILE_BYTES = 10 * MEBIBYTE;
export const MAX_KYC_FILE_LABEL = "10 MB";
const OPTIMIZED_TARGET_BYTES = 9 * MEBIBYTE;
const ALLOWED_KYC_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

export type PreparedKycUpload = { file: File; optimized: boolean };

export async function prepareKycUpload(file: File): Promise<PreparedKycUpload> {
  if (!ALLOWED_KYC_TYPES.has(file.type)) {
    throw new Error("Use a JPG, PNG or PDF document.");
  }
  if (file.size <= MAX_KYC_FILE_BYTES) return { file, optimized: false };
  if (file.type === "application/pdf") {
    throw new Error(`This PDF is larger than ${MAX_KYC_FILE_LABEL}. Compress or split it, then try again.`);
  }

  const bitmap = await createImageBitmap(file);
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
        const baseName = file.name.replace(/\.[^.]+$/, "") || "document";
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
