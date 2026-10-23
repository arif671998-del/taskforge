import { fitWithin, JPEG_QUALITY } from '../lib/image.js';

/** Decode with an <img> when createImageBitmap is missing or refuses the file. */
function decodeWithImg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Cannot decode image')); };
    img.src = url;
  });
}

/**
 * Shrink a photo to at most 1280px on the longest side and save it as JPEG (~0.8).
 * Phone camera rotation is applied, so the saved photo looks the way it did on the phone.
 * @param {Blob} file image picked or taken by the helper
 * @returns {Promise<Blob>} image/jpeg
 * @throws if the file cannot be read as an image
 */
export async function downscaleImage(file) {
  let source;
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    source = await decodeWithImg(file);
  }
  const width0 = source.width || source.naturalWidth;
  const height0 = source.height || source.naturalHeight;
  const { width, height } = fitWithin(width0, height0);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // transparent PNGs would turn black in a JPEG
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  source.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  if (!blob) throw new Error('Could not save image');
  return blob;
}
