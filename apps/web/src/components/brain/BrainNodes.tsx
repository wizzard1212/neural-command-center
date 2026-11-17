import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { InstancedMesh, Object3D, Color } from "three";
import { brainRegions, type AreaKey } from "@ncc/shared";
import type { LayoutNode } from "../../lib/brainLayout";
import type { GraphNodeDto } from "../../lib/vaultApi";
import { useVaultStore } from "../../store/useVaultStore";

const dummy = new Object3D();
const PULSE_MS = 900;
const APPEAR_MS = 700;

const AREA_LABELS: Record<AreaKey, string> = {
  trading: "Trading",
  firma: "Firma",
  modeln: "Modeln",
  ideen_business: "App-/Business-Ideen",
  clipping: "Clipping & Content",
  fundament: "Fundament",
  ideen_start: "Ideen",
  dashboard_daten: "Dashboard",
};

function timeAgoLabel(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} h`;
  return `vor ${Math.round(hours / 24)} Tagen`;
}

export function BrainNodes({
  nodes,
  layout,
  linkCounts,
  reducedAnimation,
}: {
  nodes: GraphNodeDto[];
  layout: Map<string, LayoutNode>;
  linkCounts: Map<string, number>;
  reducedAnimation: boolean;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const selectNote = useVaultStore((s) => s.selectNote);
  const lastEvent = useVaultStore((s) => s.lastEvent);
  const appearingRef = useRef(new Map<string, number>());
  const knownPathsRef = useRef(new Set<string>());
  const pulsingRef = useRef(new Map<string, number>());

  const orderedNodes = useMemo(() => nodes.filter((n) => layout.has(n.path)), [nodes, layout]);

  useEffect(() => {
    const now = performance.now();
    for (const node of orderedNodes) {
      if (!knownPathsRef.current.has(node.path)) {
        appearingRef.current.set(node.path, now);
        knownPathsRef.current.add(node.path);
      }
    }
  }, [orderedNodes]);

  useEffect(() => {
    if (lastEvent && (lastEvent.kind === "created" || lastEvent.kind === "modified")) {
      pulsingRef.current.set(lastEvent.path, performance.now());
    }
  }, [lastEvent]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const now = performance.now();

    orderedNodes.forEach((node, i) => {
      const ln = layout.get(node.path)!;
      let scale = node.area === "ideen_start" ? 1.6 : 1;
      const linkCount = linkCounts.get(node.path) ?? 0;
      scale *= 1 + Math.min(linkCount, 6) * 0.06;

      const appearStart = appearingRef.current.get(node.path);
      if (appearStart !== undefined) {
        if (reducedAnimation) {
          appearingRef.current.delete(node.path);
        } else {
          const t = Math.min(1, (now - appearStart) / APPEAR_MS);
          scale *= t;
          if (t >= 1) appearingRef.current.delete(node.path);
        }
      }

      const pulseStart = pulsingRef.current.get(node.path);
      if (pulseStart !== undefined) {
        if (reducedAnimation) {
          pulsingRef.current.delete(node.path);
        } else {
          const t = (now - pulseStart) / PULSE_MS;
          if (t < 1) {
            scale *= 1 + Math.sin(t * Math.PI) * 0.9;
          } else {
            pulsingRef.current.delete(node.path);
          }
        }
      }

      if (i === hoverIndex) scale *= 1.3;

      dummy.position.copy(ln.position);
      dummy.scale.setScalar(Math.max(scale, 0.001) * 0.07);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const area = (node.area as AreaKey) ?? "ideen_start";
      const baseColor = brainRegions[area]?.color ?? "#FFFFFF";
      const color = node.highPriority ? "#FF5A5A" : baseColor;
      mesh.setColorAt(i, new Color(color));
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) setHoverIndex(e.instanceId);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    const node = orderedNodes[e.instanceId];
    if (node) selectNote(node.path);
  };

  const hovered = hoverIndex !== null ? orderedNodes[hoverIndex] : null;
  const hoveredLayout = hovered ? layout.get(hovered.path) : null;

  if (orderedNodes.length === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, orderedNodes.length]}
        onPointerMove={handlePointerMove}
        onPointerOut={() => setHoverIndex(null)}
        onClick={handleClick}
      >
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial
          toneMapped={false}
          emissive="#ffffff"
          emissiveIntensity={0.6}
          roughness={0.35}
        />
      </instancedMesh>

      {hovered && hoveredLayout && (
        <Html position={hoveredLayout.position} center distanceFactor={6} style={{ pointerEvents: "none" }}>
          <div className="glass-card px-3 py-2 text-xs whitespace-nowrap" style={{ transform: "translateY(-150%)" }}>
            <div className="text-text font-heading">{hovered.title}</div>
            <div className="text-text-muted">
              {AREA_LABELS[(hovered.area as AreaKey) ?? "ideen_start"]} · {timeAgoLabel(hovered.mtime)}
            </div>
            <div className="text-text-faint">
              {linkCounts.get(hovered.path) ?? 0} Links
              {hovered.todosOpen > 0 ? ` · ${hovered.todosOpen} offene To-dos` : ""}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
