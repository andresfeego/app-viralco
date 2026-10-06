export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;
export const INITIAL_ZOOM = { scale: 1, x: 0, y: 0 };

export function fitImage(image, viewport) {
  if (!image.width || !image.height || !viewport.width || !viewport.height) return { width: 0, height: 0 };
  const ratio = Math.min(viewport.width / image.width, viewport.height / image.height);
  return { width: image.width * ratio, height: image.height * ratio };
}

export function clampZoom(state, image, viewport) {
  const scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.scale));
  const limitX = Math.max(0, (image.width * scale - viewport.width) / 2);
  const limitY = Math.max(0, (image.height * scale - viewport.height) / 2);
  return { scale, x: limitX ? Math.max(-limitX, Math.min(limitX, state.x)) : 0, y: limitY ? Math.max(-limitY, Math.min(limitY, state.y)) : 0 };
}

export function zoomAt(state, scale, point, image, viewport) {
  const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));
  const ratio = nextScale / state.scale;
  return clampZoom({ scale: nextScale, x: point.x - (point.x - state.x) * ratio, y: point.y - (point.y - state.y) * ratio }, image, viewport);
}

export function touchGeometry(touches) {
  if (!touches.length) return null;
  const a = touches[0], b = touches[1] || a;
  return { count: Math.min(2, touches.length), x: (a.locationX + b.locationX) / 2, y: (a.locationY + b.locationY) / 2,
    distance: Math.hypot(b.locationX - a.locationX, b.locationY - a.locationY) };
}
