import { avatarDataUrlSchema } from "@playbit/shared";

export function isAvatarFile(file: File): boolean {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
    file.size > 0 && file.size <= 5 * 1024 * 1024;
}

export async function prepareAvatar(file: File): Promise<string> {
  if (!isAvatarFile(file)) throw new Error("INVALID_AVATAR");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (!side || image.naturalWidth * image.naturalHeight > 25000000) {
      throw new Error("INVALID_DIMENSIONS");
    }
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("CANVAS_UNAVAILABLE");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 256, 256);
    context.drawImage(image, (image.naturalWidth - side) / 2,
      (image.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
    // Re-encoding removes metadata and bounds the stored profile payload.
    for (const quality of [0.85, 0.7, 0.5]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (avatarDataUrlSchema.safeParse(dataUrl).success) return dataUrl;
    }
    throw new Error("AVATAR_TOO_LARGE");
  } finally {
    URL.revokeObjectURL(url);
  }
}
