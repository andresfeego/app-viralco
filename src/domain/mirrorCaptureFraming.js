// Rectangles in viewport pixels; this is photo geometry, not UI spacing.
export function captureWindow(width, height, ratio) {
  if (!(width > 0 && height > 0 && ratio > 0)) return null;
  const w = Math.min(width, height * ratio);
  const h = w / ratio;
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}

export function previewImageInSlot(previewRatio, slotRatio) {
  if (!(previewRatio > 0 && slotRatio > 0)) return null;
  const width = 100 * Math.max(1, previewRatio / slotRatio);
  const height = 100 * Math.max(1, slotRatio / previewRatio);
  return { left: `${(100 - width) / 2}%`, top: `${(100 - height) / 2}%`, width: `${width}%`, height: `${height}%` };
}
