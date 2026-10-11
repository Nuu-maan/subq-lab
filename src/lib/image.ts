import type { ImageInput } from "./subq";

export type PickedImage = { id: number; url: string; name: string; input: ImageInput };

export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_EDGE = 1280;
let nextId = 0;

function readBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function prepareImage(file: File): Promise<PickedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("encode failed"))), "image/jpeg", 0.85),
  );

  return {
    id: nextId++,
    url: URL.createObjectURL(blob),
    name: file.name,
    input: { mediaType: "image/jpeg", base64: await readBase64(blob) },
  };
}
