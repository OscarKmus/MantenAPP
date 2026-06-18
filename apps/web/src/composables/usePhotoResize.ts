/**
 * Composable for client-side photo resizing.
 * Resizes images to max 1920px long edge, JPEG quality 0.85.
 * Reduces upload time on mobile networks.
 */
export function usePhotoResize() {
  const MAX_LONG_EDGE = 1920;
  const JPEG_QUALITY = 0.85;

  async function resizePhoto(file: File): Promise<File> {
    // Only resize images
    if (!file.type.startsWith("image/")) {
      return file;
    }

    // Skip small files (< 500KB)
    if (file.size < 500 * 1024) {
      return file;
    }

    const img = await loadImage(file);
    const { width, height } = calculateDimensions(img.width, img.height);

    // No resize needed if already within bounds
    if (width === img.width && height === img.height) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, width, height);

    return new Promise<File>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const resized = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(resized);
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    });
  }

  function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error("Failed to load image"));
      };
      img.src = URL.createObjectURL(file);
    });
  }

  function calculateDimensions(
    originalWidth: number,
    originalHeight: number
  ): { width: number; height: number } {
    if (originalWidth <= MAX_LONG_EDGE && originalHeight <= MAX_LONG_EDGE) {
      return { width: originalWidth, height: originalHeight };
    }

    const ratio = Math.min(
      MAX_LONG_EDGE / originalWidth,
      MAX_LONG_EDGE / originalHeight
    );

    return {
      width: Math.round(originalWidth * ratio),
      height: Math.round(originalHeight * ratio),
    };
  }

  return { resizePhoto };
}
