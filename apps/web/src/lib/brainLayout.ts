import { Vector3 } from "three";
import { brainRegions, type AreaKey } from "@ncc/shared";

// Zentren + Streuradius je Gehirnregion (Abschnitt 4.1). Werte sind grobe
// anatomische Analogien, keine exakte Gehirn-Geometrie – wichtig ist nur,
// dass Notizen eines Bereichs sichtbar zusammenhalten und innerhalb einer
// gehirnförmigen Silhouette bleiben.
interface ZoneDef {
  center: [number, number, number];
  spread: [number, number, number];
  mirror?: boolean; // Zone kommt links UND rechts vor (z. B. Schläfe)
}

const ZONES: Record<AreaKey, ZoneDef> = {
  trading: { center: [0, 0.05, 0.95], spread: [0.75, 0.55, 0.45] },
  firma: { center: [0, 0.8, 0.05], spread: [0.55, 0.3, 0.55] },
  modeln: { center: [0.95, -0.05, 0.05], spread: [0.3, 0.35, 0.45], mirror: true },
  ideen_business: { center: [0, 0.1, -0.95], spread: [0.65, 0.5, 0.4] },
  clipping: { center: [0, -0.75, -0.7], spread: [0.4, 0.25, 0.3] },
  fundament: { center: [0, -0.95, 0.05], spread: [0.25, 0.25, 0.4] },
  ideen_start: { center: [0, 0, 0.1], spread: [0.15, 0.15, 0.15] },
  dashboard_daten: { center: [0, 0.35, 0.55], spread: [0.35, 0.3, 0.35] },
};

// Deterministische Pseudo-Zufallszahl aus einem String (gleiche Notiz -> gleicher Punkt,
// damit das Gehirn bei jedem Neuladen nicht komplett neu "springt").
function hashStringToInt(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Avalanche-Finalizer (murmur3-ähnlich), damit sich Salts wie 1/2/3 für x/y/z
// nicht nur im letzten Bit unterscheiden – sonst entstehen sichtbare Streifen
// statt einer gleichmäßigen Punktwolke (ließ sich mit reinem FNV beobachten).
function mix32(a: number): number {
  a ^= a >>> 16;
  a = Math.imul(a, 0x7feb352d);
  a ^= a >>> 15;
  a = Math.imul(a, 0x846ca68b);
  a ^= a >>> 16;
  return a >>> 0;
}

function seededRandom(seed: string, salt: number): number {
  const base = hashStringToInt(seed);
  const mixed = mix32((base ^ Math.imul(salt + 1, 0x9e3779b9)) >>> 0);
  return mixed / 4294967295;
}

const BRAIN_SCALE = 2.2;

export interface LayoutNode {
  path: string;
  area: AreaKey;
  position: Vector3;
  areaCenter: Vector3;
}

export interface GraphNodeLike {
  path: string;
  area: string;
}

export interface GraphEdgeLike {
  source: string;
  target: string;
}

function initialPosition(path: string, area: AreaKey): { position: Vector3; center: Vector3 } {
  const zone = ZONES[area] ?? ZONES.ideen_start;
  const mirrorSign = zone.mirror && seededRandom(path, 99) > 0.5 ? -1 : 1;
  const center = new Vector3(zone.center[0] * mirrorSign, zone.center[1], zone.center[2]);

  // Punkt innerhalb eines Ellipsoids um das Zonenzentrum verteilen (Ablehnungsstichprobe
  // auf Basis deterministischer Zufallszahlen, damit die Silhouette nicht eckig wirkt).
  let x = 0;
  let y = 0;
  let z = 0;
  for (let attempt = 0; attempt < 8; attempt++) {
    x = (seededRandom(path, attempt * 3 + 1) * 2 - 1) * zone.spread[0];
    y = (seededRandom(path, attempt * 3 + 2) * 2 - 1) * zone.spread[1];
    z = (seededRandom(path, attempt * 3 + 3) * 2 - 1) * zone.spread[2];
    const normalized = (x / zone.spread[0]) ** 2 + (y / zone.spread[1]) ** 2 + (z / zone.spread[2]) ** 2;
    if (normalized <= 1) break;
  }

  const position = new Vector3(center.x + x * mirrorSign, center.y + y, center.z + z);
  return { position: position.multiplyScalar(BRAIN_SCALE), center: center.multiplyScalar(BRAIN_SCALE) };
}

/**
 * Platziert Notizen in Gehirnregionen und zieht verlinkte Notizen über ein paar
 * Relaxations-Iterationen etwas zueinander (leichtes Force-Layout), ohne die
 * Gehirn-Silhouette zu verlassen (Abschnitt 4.1: "Force-Layout zieht verlinkte
 * Notizen zueinander, bleibt aber in der Gehirnform").
 */
export function computeBrainLayout(
  nodes: GraphNodeLike[],
  edges: GraphEdgeLike[],
): Map<string, LayoutNode> {
  const layout = new Map<string, LayoutNode>();

  for (const node of nodes) {
    const area = (node.area as AreaKey) ?? "ideen_start";
    const { position, center } = initialPosition(node.path, area);
    layout.set(node.path, { path: node.path, area, position, areaCenter: center });
  }

  const relevantEdges = edges.filter((e) => layout.has(e.source) && layout.has(e.target));

  const ITERATIONS = 40;
  const ATTRACTION = 0.025;
  const CENTER_PULL = 0.015;

  for (let i = 0; i < ITERATIONS; i++) {
    for (const edge of relevantEdges) {
      const a = layout.get(edge.source)!;
      const b = layout.get(edge.target)!;
      const delta = b.position.clone().sub(a.position).multiplyScalar(ATTRACTION);
      a.position.add(delta);
      b.position.sub(delta);
    }

    for (const n of layout.values()) {
      const zone = ZONES[n.area] ?? ZONES.ideen_start;
      const maxRadius =
        Math.max(zone.spread[0], zone.spread[1], zone.spread[2]) * BRAIN_SCALE * 1.5;
      const toCenter = n.areaCenter.clone().sub(n.position);
      const dist = toCenter.length();
      if (dist > maxRadius) {
        n.position.add(toCenter.clone().multiplyScalar((dist - maxRadius) / dist));
      } else {
        n.position.add(toCenter.multiplyScalar(CENTER_PULL));
      }
    }
  }

  return layout;
}

export function brainDustPositions(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const areaKeys = Object.keys(ZONES) as AreaKey[];
  for (let i = 0; i < count; i++) {
    const area = areaKeys[i % areaKeys.length];
    const { position } = initialPosition(`dust-${i}`, area);
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;
  }
  return positions;
}
