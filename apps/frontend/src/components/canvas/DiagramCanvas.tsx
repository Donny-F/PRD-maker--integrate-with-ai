"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  getNodesBounds,
  getViewportForBounds,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import { Download, RefreshCw, ZoomIn } from "lucide-react";
import { CustomNode } from "./CustomNode";
import { getLayoutedElements } from "@/lib/dagre";
import { DiagramData } from "@/lib/api";
import { useTheme } from "@/components/providers/ThemeProvider";

interface DiagramCanvasProps {
  data: DiagramData;
  projectTitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  /** Shrinks the minimap when the canvas shares the screen with the PRD document. */
  compactMinimap?: boolean;
}

export function DiagramCanvas({
  data,
  projectTitle = "project-prd",
  onRefresh,
  isRefreshing = false,
  compactMinimap = false,
}: DiagramCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const nodeTypes = useMemo(() => ({ customNode: CustomNode }), []);

  const layouted = useMemo(() => {
    if (!data.nodes || data.nodes.length === 0) {
      return { nodes: [], edges: [] };
    }
    return getLayoutedElements(data, "LR", isDark);
  }, [data, isDark]);

  const handleExportPng = useCallback(async () => {
    if (!reactFlowWrapper.current || layouted.nodes.length === 0) return;
    setIsExporting(true);

    try {
      // Find the inner viewport element
      const viewportElem = reactFlowWrapper.current.querySelector(
        ".react-flow__viewport"
      ) as HTMLElement | null;

      if (!viewportElem) {
        throw new Error("React Flow viewport element not found");
      }

      const nodesBounds = getNodesBounds(layouted.nodes);
      const imageWidth = nodesBounds.width + 120;
      const imageHeight = nodesBounds.height + 120;

      const viewport = getViewportForBounds(
        nodesBounds,
        imageWidth,
        imageHeight,
        0.5,
        2,
        0.2
      );

      const dataUrl = await toPng(viewportElem, {
        backgroundColor: isDark ? "#171717" : "#fafafa",
        width: imageWidth,
        height: imageHeight,
        pixelRatio: 2, // 2x crisp export
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      });

      const link = document.createElement("a");
      const safeTitle = projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      link.download = `${safeTitle}-diagram.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export diagram to PNG:", err);
      alert("Gagal mengekspor diagram. Silakan coba lagi.");
    } finally {
      setIsExporting(false);
    }
  }, [layouted.nodes, projectTitle, isDark]);

  if (!data.nodes || data.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-neutral-50/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl">
        <div className="w-12 h-12 mb-3 flex items-center justify-center rounded-full bg-brand/10 text-brand-dark dark:text-brand">
          <ZoomIn className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
          Bagan Diagram Belum Digenerate
        </h4>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mb-4">
          Diagram relasi akan digenerate secara otomatis berdasarkan dokumen PRD setelah Step 3 selesai.
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-neutral-950 bg-brand hover:bg-brand-hover rounded-lg shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Generate Diagram Sekarang
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-neutral-50 dark:bg-neutral-900 shadow-sm">
      {/* Top Floating Action Bar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm p-1 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Sinkronkan Ulang Diagram"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-brand-dark dark:text-brand" : ""}`} />
            <span>Regenerate</span>
          </button>
        )}

        <button
          onClick={handleExportPng}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-neutral-950 bg-brand hover:bg-brand-hover rounded-md shadow-sm transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isExporting ? "Mengekspor..." : "Unduh project-prd.png"}</span>
        </button>
      </div>

      {/* React Flow View-Only Canvas */}
      <div ref={reactFlowWrapper} className="w-full h-full">
        <ReactFlow
          nodes={layouted.nodes}
          edges={layouted.edges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          elementsSelectable={false}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.2}
          maxZoom={1.5}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={16}
            size={isDark ? 1 : 2}
            color={isDark ? "#525252" : "#94a3b8"}
          />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap
            position="bottom-right"
            style={{
              width: compactMinimap ? 120 : 200,
              height: compactMinimap ? 80 : 150,
              boxSizing: "content-box",
            }}
            maskColor={isDark ? "rgba(10,10,10,0.7)" : "rgba(255,255,255,0.7)"}
            nodeColor={(n) => {
              const d = n.data as unknown as { nodeType?: string };
              if (d?.nodeType === "epic") return "#ffc200";
              if (d?.nodeType === "feature") return isDark ? "#a3a3a3" : "#64748b";
              if (d?.nodeType === "subfeatureGroup") return isDark ? "#737373" : "#94a3b8";
              return isDark ? "#525252" : "#cbd5e1";
            }}
            className="!border !border-neutral-200 dark:!border-neutral-800 !rounded-lg !shadow-sm !overflow-hidden"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
