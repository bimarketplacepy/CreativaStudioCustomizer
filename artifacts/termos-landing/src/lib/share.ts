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
      if (!res.ok) {
        console.warn(`design-preview: subida rechazada (HTTP ${res.status}), intento ${attempt + 1}`);
        continue;
      }
      const { url } = await res.json();
      if (typeof url !== "string") continue;
      // Absolute URL so WhatsApp can fetch it.
      return new URL(url, window.location.origin).toString();
    } catch (err) {
      console.warn(`design-preview: subida falló (intento ${attempt + 1}):`, err);
    }
  }
  return null;
}
