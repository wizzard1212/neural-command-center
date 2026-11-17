import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D, Color } from "three";
import type { LayoutNode } from "../../lib/brainLayout";
import type { GraphNodeDto } from "../../lib/vaultApi";

const dummy = new Object3D();
const MAX_SATELLITES = 250;

interface SatelliteDef {
  parentPath: string;
  angleOffset: number;
  radius: number;
  speed: number;
  highPriority: boolean;
}

export function TodoSatellites({
  nodes,
  layout,
  reducedAnimation,
}: {
  nodes: GraphNodeDto[];
  layout: Map<string, LayoutNode>;
  reducedAnimation: boolean;
}) {
  const meshRef = useRef<InstancedMesh>(null);

  const satellites = useMemo(() => {
    const list: SatelliteDef[] = [];
    for (const node of nodes) {
      if (!layout.has(node.path) || node.todosOpen <= 0) continue;
      for (let i = 0; i < node.todosOpen && list.length < MAX_SATELLITES; i++) {
        list.push({
          parentPath: node.path,
          angleOffset: (i / Math.max(node.todosOpen, 1)) * Math.PI * 2,
          radius: 0.16 + (i % 3) * 0.03,
          speed: 0.6 + (i % 4) * 0.15,
          highPriority: node.highPriority,
        });
      }
    }
    return list;
  }, [nodes, layout]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();

    satellites.forEach((sat, i) => {
      const parent = layout.get(sat.parentPath);
      if (!parent) return;
      const angle = sat.angleOffset + (reducedAnimation ? 0 : t * sat.speed);
      dummy.position.set(
        parent.position.x + Math.cos(angle) * sat.radius,
        parent.position.y + Math.sin(angle * 0.7) * sat.radius * 0.6,
        parent.position.z + Math.sin(angle) * sat.radius,
      );
      const pulse = sat.highPriority && !reducedAnimation ? 1 + Math.sin(t * 5 + i) * 0.4 : 1;
      dummy.scale.setScalar(0.022 * pulse);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new Color(sat.highPriority ? "#FF5A5A" : "#C9D6E8"));
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  if (satellites.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, satellites.length]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={0.9} />
    </instancedMesh>
  );
}
