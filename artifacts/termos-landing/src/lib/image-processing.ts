export interface ProcessedImage {
  svgDataUrl: string;
  width: number;
  height: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

/**
 * Removes a flat/solid background from an image by flood-filling from the
 * edges toward the center wherever pixels closely match the sampled corner
 * color, then trims the canvas to the bounding box of what remains.
 * Works best on logos/drawings with a plain background — it will not
 * segment complex photographic backgrounds.
 */
function removeBackgroundAndTrim(img: HTMLImageElement): HTMLCanvasElement {
  const MAX_DIM = 1200;
  const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const corners: Array<[number, number]> = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  let br = 0, bg = 0, bb = 0;
  corners.forEach(([x, y]) => {
    const i = (y * width + x) * 4;
    br += data[i];
    bg += data[i + 1];
    bb += data[i + 2];
  });
  br /= corners.length;
  bg /= corners.length;
  bb /= corners.length;

  const threshold = 42;
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];
  for (let x = 0; x < width; x++) {
    stack.push(x);
    stack.push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    stack.push(y * width);
    stack.push(y * width + width - 1);
  }

  const colorDist = (i: number) => {
    const dr = data[i] - br;
    const dg = data[i + 1] - bg;
    const db = data[i + 2] - bb;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  while (stack.length) {
    const p = stack.pop()!;
    if (visited[p]) continue;
    visited[p] = 1;
    const i = p * 4;
    if (colorDist(i) > threshold) continue;
    data[i + 3] = 0;
    const x = p % width;
    const y = (p / width) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < width - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - width);
    if (y < height - 1) stack.push(p + width);
  }

  ctx.putImageData(imageData, 0, 0);

  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) {
    minX = 0;
    minY = 0;
    maxX = width - 1;
    maxY = height - 1;
  }
  const pad = Math.round(Math.max(width, height) * 0.02);
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  const trimmedW = maxX - minX + 1;
  const trimmedH = maxY - minY + 1;

  const trimmed = document.createElement("canvas");
  trimmed.width = trimmedW;
  trimmed.height = trimmedH;
  trimmed
    .getContext("2d")!
    .drawImage(canvas, minX, minY, trimmedW, trimmedH, 0, 0, trimmedW, trimmedH);

  return trimmed;
}

function canvasToSvgDataUrl(canvas: HTMLCanvasElement): string {
  const pngDataUrl = canvas.toDataURL("image/png");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><image href="${pngDataUrl}" x="0" y="0" width="${canvas.width}" height="${canvas.height}" /></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export async function fileToProcessedSvg(file: File): Promise<ProcessedImage> {
  const img = await loadImage(file);
  const trimmed = removeBackgroundAndTrim(img);
  return {
    svgDataUrl: canvasToSvgDataUrl(trimmed),
    width: trimmed.width,
    height: trimmed.height,
  };
}
