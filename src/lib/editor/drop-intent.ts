export type DropIntent =
  | "before"
  | "after"
  | "beside-left"
  | "beside-right"
  | "inside-start"
  | "inside-end";

export type DropPlacement = "before" | "after" | "left" | "right" | "inside";

export type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type CachedDropTarget = {
  nodeId: string;
  sectionId: string;
  parentId: string;
  kind: "element" | "group" | "column" | "container";
  index: number;
  childCount: number;
  rect: Rect;
  label: string;
  canBeside: boolean;
  canInside: boolean;
  priority: number;
};

export type ResolvedDrop = {
  draggedNodeId: string;
  targetNodeId: string;
  sectionId: string;
  parentId: string;
  index: number;
  intent: DropIntent;
  placement: DropPlacement;
  label: string;
  targetLabel: string;
  rect: Rect;
};

export const DROP_INTENT_LABELS: Record<DropIntent, string> = {
  before: "Enne",
  after: "Pärast",
  "beside-left": "Kõrvale vasakule",
  "beside-right": "Kõrvale paremale",
  "inside-start": "Sisse",
  "inside-end": "Sisse",
};

export const HIT_EXPANSION = 32;
export const HYSTERESIS_PX = 16;
export const NEARBY_DISTANCE = 240;

export function dropIntentLabel(intent: DropIntent): string {
  return DROP_INTENT_LABELS[intent];
}

export function intentToPlacement(intent: DropIntent): DropPlacement {
  if (intent === "beside-left") return "left";
  if (intent === "beside-right") return "right";
  if (intent === "inside-start" || intent === "inside-end") return "inside";
  return intent;
}

export function expandRect(rect: Rect, amount = HIT_EXPANSION): Rect {
  return {
    left: rect.left - amount,
    top: rect.top - amount,
    right: rect.right + amount,
    bottom: rect.bottom + amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
}

export function rectFromDom(dom: { left: number; top: number; right: number; bottom: number; width: number; height: number }): Rect {
  return {
    left: dom.left,
    top: dom.top,
    right: dom.right,
    bottom: dom.bottom,
    width: dom.width,
    height: dom.height,
  };
}

export function isNearby(rect: Rect, x: number, y: number, distance = NEARBY_DISTANCE): boolean {
  const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
  const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
  return Math.hypot(dx, dy) <= distance;
}

export function resolveDropIntent(
  targets: CachedDropTarget[],
  pointer: { x: number; y: number },
  draggedNodeId: string,
  previous: Pick<ResolvedDrop, "targetNodeId" | "intent"> | null = null,
): ResolvedDrop | null {
  const candidates = nearbyTargets(targets, pointer, draggedNodeId);
  if (!candidates.length) return null;

  const ranked = candidates
    .map((target) => scoreTarget(target, pointer))
    .filter((item): item is ScoredTarget => Boolean(item))
    .sort((a, b) => a.score - b.score);

  const chosen = ranked[0];
  if (!chosen) return null;
  if (previous && chosen.target.nodeId === previous.targetNodeId && shouldKeepIntent(chosen, previous.intent, pointer)) {
    return toResolved({ ...chosen, intent: previous.intent }, draggedNodeId);
  }
  return toResolved(chosen, draggedNodeId);
}

type ScoredTarget = {
  target: CachedDropTarget;
  intent: DropIntent;
  score: number;
  distances: EdgeDistances;
};

type EdgeDistances = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

function nearbyTargets(targets: CachedDropTarget[], pointer: { x: number; y: number }, draggedNodeId: string) {
  return targets.filter((target) => {
    if (target.nodeId === draggedNodeId) return false;
    const expanded = expandRect(target.rect);
    return isNearby(expanded, pointer.x, pointer.y);
  });
}

function scoreTarget(target: CachedDropTarget, pointer: { x: number; y: number }): ScoredTarget | null {
  const hit = expandRect(target.rect);
  const distances = edgeDistances(hit, pointer);
  const intent = intentFromDistances(target, distances, pointer, hit);
  if (!intent) return null;
  const nearest = Math.min(distances.top, distances.right, distances.bottom, distances.left);
  const area = Math.max(target.rect.width * target.rect.height, 1);
  const priorityBias = target.priority;
  const containment = contains(hit, pointer) ? 0 : 80;
  return {
    target,
    intent,
    distances,
    score: nearest + containment + priorityBias + Math.log2(area),
  };
}

function intentFromDistances(
  target: CachedDropTarget,
  distances: EdgeDistances,
  pointer: { x: number; y: number },
  hit: Rect,
): DropIntent | null {
  if (target.canInside && (target.childCount === 0 || target.kind !== "element")) {
    if (target.childCount === 0 && contains(hit, pointer)) {
      return pointer.y < (hit.top + hit.bottom) / 2 ? "inside-start" : "inside-end";
    }
  }

  const edges: Array<{ intent: DropIntent; distance: number; eligible: boolean }> = [
    { intent: "before", distance: distances.top, eligible: true },
    { intent: "after", distance: distances.bottom, eligible: true },
    { intent: "beside-left", distance: distances.left, eligible: target.canBeside },
    { intent: "beside-right", distance: distances.right, eligible: target.canBeside },
  ];
  const eligible = edges.filter((edge) => edge.eligible);
  eligible.sort((a, b) => a.distance - b.distance);
  return eligible[0]?.intent ?? (target.canInside ? "inside-end" : null);
}

function shouldKeepIntent(scored: ScoredTarget, previous: DropIntent, pointer: { x: number; y: number }): boolean {
  if (scored.intent === previous) return true;
  const hit = expandRect(scored.target.rect);
  const distances = edgeDistances(hit, pointer);
  const currentDistance = distanceForIntent(distances, scored.intent);
  const previousDistance = distanceForIntent(distances, previous);
  if (!scored.target.canBeside && (previous === "beside-left" || previous === "beside-right")) return false;
  return previousDistance <= currentDistance + HYSTERESIS_PX;
}

function distanceForIntent(distances: EdgeDistances, intent: DropIntent): number {
  if (intent === "before" || intent === "inside-start") return distances.top;
  if (intent === "after" || intent === "inside-end") return distances.bottom;
  if (intent === "beside-left") return distances.left;
  return distances.right;
}

function edgeDistances(rect: Rect, pointer: { x: number; y: number }): EdgeDistances {
  return {
    top: Math.abs(pointer.y - rect.top),
    right: Math.abs(pointer.x - rect.right),
    bottom: Math.abs(pointer.y - rect.bottom),
    left: Math.abs(pointer.x - rect.left),
  };
}

function contains(rect: Rect, pointer: { x: number; y: number }) {
  return pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom;
}

function toResolved(scored: ScoredTarget, draggedNodeId: string): ResolvedDrop {
  const intent = scored.intent;
  const index =
    intent === "before" || intent === "beside-left" || intent === "inside-start"
      ? scored.target.index
      : intent === "inside-end"
        ? scored.target.childCount
        : scored.target.index + 1;
  return {
    draggedNodeId,
    targetNodeId: scored.target.nodeId,
    sectionId: scored.target.sectionId,
    parentId: scored.target.parentId,
    index,
    intent,
    placement: intentToPlacement(intent),
    label: dropIntentLabel(intent),
    targetLabel: scored.target.label,
    rect: scored.target.rect,
  };
}

export function dropsEqual(a: ResolvedDrop | null, b: ResolvedDrop | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.targetNodeId === b.targetNodeId &&
    a.intent === b.intent &&
    a.parentId === b.parentId &&
    a.index === b.index &&
    a.sectionId === b.sectionId
  );
}
