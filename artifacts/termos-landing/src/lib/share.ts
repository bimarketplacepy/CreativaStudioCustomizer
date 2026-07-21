import { whatsappUrl } from "./contact";

/** Convert a data: URL to a File so it can go through the Web Share API. */
export function dataUrlToFile(dataUrl: string, filename: string): File | null {
  const m = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!m) return null;
  const bytes = atob(m[2]);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], filename, { type: m[1] });
}

/** Trigger a browser download of a data: URL (the "Descargar imagen" fallback). */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Re-encode a captured data URL as a JPEG capped at `maxDim` px, over a white
 * background (JPEG has no alpha). A PNG snapshot of the 3D piece weighs several
 * MB; the JPEG version is ~10× lighter, so the upload stays well under the
 * backend's size cap and finishes fast even on slow mobile connections.
 * Falls back to the original data URL if anything fails.
 */
export function dataUrlToJpeg(dataUrl: string, maxDim = 1080, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(dataUrl); return; }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const jpeg = canvas.toDataURL("image/jpeg", quality);
        resolve(jpeg.startsWith("data:image/jpeg") ? jpeg : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Upload the captured image to the backend (/api/design-preview) and return a
 * public URL that can be embedded in the WhatsApp message so the image previews
 * in the chat. Retries once (transient dev-proxy hiccups). Returns null if the
 * upload fails (caller falls back gracefully).
 */
export async function uploadPreview(dataUrl: string): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch("/api/design-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      if (!res.ok) continue;
      const { url } = await res.json();
      if (typeof url !== "string") continue;
      // Absolute URL so WhatsApp can fetch it.
      return new URL(url, window.location.origin).toString();
    } catch {
      // retry
    }
  }
  return null;
}

export type ShareResult = "shared" | "whatsapp" | "failed";

/**
 * Send the design to WhatsApp with the preview image.
 *
 * Strategy (matches the customizer requirements):
 *   1. Upload the PNG to the backend to get a public URL and append it to the
 *      message, so the image previews in the chat on every platform.
 *   2. On mobile with Web Share + file support, share the PNG file directly
 *      (the user picks WhatsApp and the image travels attached).
 *   3. Otherwise open wa.me with the message (image URL included).
 */
export async function shareDesignToWhatsApp(opts: {
  message: string;
  dataUrl: string | null;
}): Promise<ShareResult> {
  const { message, dataUrl } = opts;

  // 1 — upload for a chat-previewable URL.
  const imageUrl = dataUrl ? await uploadPreview(dataUrl) : null;
  const fullMessage = imageUrl
    ? `${message}\n\n📷 Vista del diseño: ${imageUrl}`
    : message;

  // 2 — Web Share with the file attached (best on mobile).
  const file = dataUrl ? dataUrlToFile(dataUrl, "mi-diseno.png") : null;
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (file && typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text: fullMessage, title: "Mi diseño" });
      return "shared";
    } catch (err) {
      // AbortError = user dismissed the sheet; don't fall through to a new tab.
      if (err instanceof Error && err.name === "AbortError") return "shared";
      // Any other failure: fall back to wa.me below.
    }
  }

  // 3 — wa.me with the message (and the image URL if we have one).
  window.open(whatsappUrl(fullMessage), "_blank", "noopener,noreferrer");
  return imageUrl ? "whatsapp" : "failed";
}
