/**
 * Bild vor dem Upload verkleinern (Handyfotos haben oft 3–10 MB).
 * Liefert ein JPEG-File (oder PNG mit `type = 'image/png'`, z.B. für Logos mit
 * Transparenz) mit max. `maxDim` px Kantenlänge. Kann der Browser das Bild
 * nicht dekodieren, kommt die Originaldatei unverändert zurück.
 */
export async function downscaleImage(file, maxDim = 1600, quality = 0.85, type = 'image/jpeg') {
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
    const ctx = canvas.getContext('2d');
    // JPEG kennt keine Transparenz — ohne weißen Grund werden transparente PNGs schwarz
    if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    if (!blob) return file;
    return new File([blob], `bild-${Date.now()}.${type === 'image/png' ? 'png' : 'jpg'}`, { type });
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
