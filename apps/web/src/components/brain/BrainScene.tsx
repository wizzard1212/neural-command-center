import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import type { Group } from "three";
import { computeBrainLayout } from "../../lib/brainLayout";
import type { VaultGraphResponse } from "../../lib/vaultApi";
import { useVaultStore } from "../../store/useVaultStore";
import { BrainNodes } from "./BrainNodes";
import { Synapses } from "./Synapses";
import { DustParticles } from "./DustParticles";
import { TodoSatellites } from "./TodoSatellites";

function Breathing({ reducedAnimation, children }: { reducedAnimation: boolean; children: React.ReactNode }) {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    if (reducedAnimation) {
      group.scale.setScalar(1);
      return;
    }
    const t = clock.getElapsedTime();
    const scale = 1 + Math.sin((t / 6) * Math.PI * 2) * 0.012;
    group.scale.setScalar(scale);
    group.rotation.y = Math.sin(t / 40) * 0.1;
  });

  return <group ref={groupRef}>{children}</group>;
}

export function BrainScene({
  graph,
  reducedAnimation,
}: {
  graph: VaultGraphResponse;
  reducedAnimation: boolean;
}) {
  const visibleAreas = useVaultStore((s) => s.visibleAreas);
  const onlyOpenTodos = useVaultStore((s) => s.onlyOpenTodos);
  const onlyRecentlyChanged = useVaultStore((s) => s.onlyRecentlyChanged);

  const layoutKey = useMemo(
    () =>
      graph.nodes
        .map((n) => n.path)
        .sort()
        .join("|") +
      "::" +
      graph.edges.map((e) => `${e.source}>${e.target}`).join("|"),
    [graph],
  );

  const layout = useMemo(() => computeBrainLayout(graph.nodes, graph.edges), [layoutKey]);

  const linkCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const edge of graph.edges) {
      counts.set(edge.source, (counts.get(edge.source) ?? 0) + 1);
      counts.set(edge.target, (counts.get(edge.target) ?? 0) + 1);
    }
    return counts;
  }, [graph.edges]);

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const filteredNodes = useMemo(() => {
    return graph.nodes.filter((n) => {
      if (visibleAreas && !visibleAreas.has(n.area)) return false;
      if (onlyOpenTodos && n.todosOpen === 0) return false;
      if (onlyRecentlyChanged && new Date(n.mtime).getTime() < sevenDaysAgo) return false;
      return true;
    });
  }, [graph.nodes, visibleAreas, onlyOpenTodos, onlyRecentlyChanged, sevenDaysAgo]);

  const visiblePaths = useMemo(() => new Set(filteredNodes.map((n) => n.path)), [filteredNodes]);

  const filteredEdges = useMemo(
    () => graph.edges.filter((e) => visiblePaths.has(e.source) && visiblePaths.has(e.target)),
    [graph.edges, visiblePaths],
  );

  return (
    <Canvas camera={{ position: [0, 0.4, 6.2], fov: 45 }} dpr={[1, 1.5]}>
      <color attach="background" args={["#05070C"]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 3, 5]} intensity={40} color="#00D4FF" />
      <pointLight position={[-4, -2, -4]} intensity={30} color="#A855F7" />
      <pointLight position={[0, 4, 0]} intensity={20} color="#FFFFFF" />

      <Breathing reducedAnimation={reducedAnimation}>
        <DustParticles reducedAnimation={reducedAnimation} />
        <Synapses edges={filteredEdges} layout={layout} reducedAnimation={reducedAnimation} />
        <BrainNodes
          nodes={filteredNodes}
          layout={layout}
          linkCounts={linkCounts}
          reducedAnimation={reducedAnimation}
        />
        <TodoSatellites nodes={filteredNodes} layout={layout} reducedAnimation={reducedAnimation} />
      </Breathing>

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={3}
        maxDistance={10}
        autoRotate={!reducedAnimation}
        autoRotateSpeed={0.3}
        dampingFactor={0.08}
      />

      {!reducedAnimation && (
        <EffectComposer>
          <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.9} intensity={0.8} mipmapBlur />
        </EffectComposer>
      )}
    </Canvas>
  );
}
