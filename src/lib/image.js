/**
 * Bild vor dem Upload verkleinern (Handyfotos haben oft 3–10 MB).
 * Liefert ein JPEG-File mit max. `maxDim` px Kantenlänge. Kann der Browser das
 * Bild nicht dekodieren, kommt die Originaldatei unverändert zurück.
 */
export async function downscaleImage(file, maxDim = 1600, quality = 0.85) {
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    URL.revokeObjectURL(url);
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) return file;
    return new File([blob], `bild-${Date.now()}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
