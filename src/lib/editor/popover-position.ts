export type FloatingPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

export type RectLike = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

export function placeFloating({
  trigger,
  floatingWidth,
  floatingHeight,
  viewportWidth,
  viewportHeight,
  placement = "bottom-end",
  offset = 6,
  padding = 8,
}: {
  trigger: RectLike;
  floatingWidth: number;
  floatingHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  placement?: FloatingPlacement;
  offset?: number;
  padding?: number;
}): { top: number; left: number } {
  const preferEnd = placement.endsWith("end");
  const preferTop = placement.startsWith("top");
  let left = preferEnd ? trigger.right - floatingWidth : trigger.left;
  let top = preferTop ? trigger.top - offset - floatingHeight : trigger.bottom + offset;

  const minLeft = padding;
  const maxLeft = viewportWidth - padding - floatingWidth;
  left = clamp(left, minLeft, Math.max(minLeft, maxLeft));

  const overflowBottom = top + floatingHeight > viewportHeight - padding;
  const overflowTop = top < padding;
  if (!preferTop && overflowBottom) {
    const flipped = trigger.top - offset - floatingHeight;
    if (flipped >= padding) top = flipped;
  }
  if (preferTop && overflowTop) {
    const flipped = trigger.bottom + offset;
    if (flipped + floatingHeight <= viewportHeight - padding) top = flipped;
  }

  const minTop = padding;
  const maxTop = viewportHeight - padding - floatingHeight;
  top = clamp(top, minTop, Math.max(minTop, maxTop));
  return { top, left };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
