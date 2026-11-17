import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { InstancedMesh, Object3D, Color, type Vector3 } from "three";
import type { LayoutNode } from "../../lib/brainLayout";
import type { GraphEdgeDto } from "../../lib/vaultApi";

const dummy = new Object3D();
const PARTICLE_COLOR = new Color("#00D4FF");

export function Synapses({
  edges,
  layout,
  reducedAnimation,
}: {
  edges: GraphEdgeDto[];
  layout: Map<string, LayoutNode>;
  reducedAnimation: boolean;
}) {
  const pairs = useMemo(() => {
    const result: { a: Vector3; b: Vector3 }[] = [];
    for (const edge of edges) {
      const a = layout.get(edge.source);
      const b = layout.get(edge.target);
      if (a && b) result.push({ a: a.position, b: b.position });
    }
    return result;
  }, [edges, layout]);

  const particlesRef = useRef<InstancedMesh>(null);
  const offsets = useMemo(() => pairs.map(() => Math.random()), [pairs]);

  useFrame(({ clock }) => {
    const mesh = particlesRef.current;
    if (!mesh || reducedAnimation) return;
    const t = clock.getElapsedTime();
    pairs.forEach((pair, i) => {
      const progress = (t * 0.12 + offsets[i]) % 1;
      dummy.position.lerpVectors(pair.a, pair.b, progress);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (pairs.length === 0) return null;

  return (
    <group>
      {pairs.map((pair, i) => (
        <Line
          key={i}
          points={[pair.a, pair.b]}
          color="#1B2740"
          transparent
          opacity={0.45}
          lineWidth={1}
        />
      ))}
      {!reducedAnimation && (
        <instancedMesh ref={particlesRef} args={[undefined, undefined, pairs.length]}>
          <sphereGeometry args={[0.02, 6, 6]} />
          <meshBasicMaterial color={PARTICLE_COLOR} transparent opacity={0.85} />
        </instancedMesh>
      )}
    </group>
  );
}
