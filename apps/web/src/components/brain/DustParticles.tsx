import { useMemo } from "react";
import { BufferAttribute } from "three";
import { brainDustPositions } from "../../lib/brainLayout";

export function DustParticles({ reducedAnimation }: { reducedAnimation: boolean }) {
  const count = reducedAnimation ? 900 : 4200;
  const positions = useMemo(() => brainDustPositions(count), [count]);

  return (
    <points>
      <bufferGeometry>
        <primitive attach="attributes-position" object={new BufferAttribute(positions, 3)} />
      </bufferGeometry>
      <pointsMaterial
        size={0.018}
        color="#7DF9FF"
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
