import { useEffect, useRef } from "react";
import { createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import type { Snapshot } from "../../lib/accountsApi";

export function EquityChart({
  snapshots,
  startBalance,
  startDate,
}: {
  snapshots: Snapshot[];
  startBalance: number;
  startDate: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: "#6B7A94",
        fontFamily: "JetBrains Mono",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: { vertLines: { color: "#1B2740" }, horzLines: { color: "#1B2740" } },
      rightPriceScale: { borderColor: "#1B2740" },
      timeScale: { borderColor: "#1B2740" },
    });

    const series = chart.addAreaSeries({
      lineColor: "#00D4FF",
      topColor: "rgba(0,212,255,0.25)",
      bottomColor: "rgba(0,212,255,0)",
      lineWidth: 2,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) return;

    const snapshotPoints = snapshots
      .map((s) => ({ time: Math.floor(new Date(s.ts).getTime() / 1000) as UTCTimestamp, value: s.equity }))
      .sort((a, b) => a.time - b.time);

    // Startpunkt mit der Startbalance voranstellen, damit die Kurve auch mit
    // nur einem Stand einen sichtbaren Verlauf statt eines einzelnen Punkts zeigt.
    const startPoint = {
      time: Math.floor(new Date(startDate).getTime() / 1000) as UTCTimestamp,
      value: startBalance,
    };
    const allPoints = snapshotPoints[0]?.time === startPoint.time ? snapshotPoints : [startPoint, ...snapshotPoints];

    const points = allPoints.filter((p, i, arr) => i === 0 || p.time !== arr[i - 1].time);

    seriesRef.current.setData(points);
    chartRef.current?.timeScale().fitContent();
  }, [snapshots, startBalance, startDate]);

  if (snapshots.length === 0) {
    return <p className="text-text-faint text-sm py-8 text-center">Noch keine Stände erfasst.</p>;
  }

  return <div ref={containerRef} className="w-full h-56" />;
}
