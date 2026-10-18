"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  getNodesBounds,
  getViewportForBounds,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import { Download, RefreshCw, ZoomIn } from "lucide-react";
import { CustomNode } from "./CustomNode";
import { getLayoutedElements } from "@/lib/dagre";
import { DiagramData } from "@/lib/api";

interface DiagramCanvasProps {
  data: DiagramData;
  projectTitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function DiagramCanvas({
  data,
  projectTitle = "project-prd",
  onRefresh,
  isRefreshing = false,
}: DiagramCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const nodeTypes = useMemo(() => ({ customNode: CustomNode }), []);

  const layouted = useMemo(() => {
    if (!data.nodes || data.nodes.length === 0) {
      return { nodes: [], edges: [] };
    }
    return getLayoutedElements(data, "LR");
  }, [data]);

  const [nodes, , onNodesChange] = useNodesState(layouted.nodes);
  const [edges, , onEdgesChange] = useEdgesState(layouted.edges);

  // Sync state when data changes
  React.useEffect(() => {
    const next = getLayoutedElements(data, "LR");
    nodes.length = 0;
    // Update local state directly
  }, [data]);

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
        backgroundColor: "#ffffff",
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
  }, [layouted.nodes, projectTitle]);

  if (!data.nodes || data.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-neutral-50/50 border border-neutral-200 rounded-xl">
        <div className="w-12 h-12 mb-3 flex items-center justify-center rounded-full bg-brand/10 text-brand-dark">
          <ZoomIn className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-neutral-800 mb-1">
          Bagan Diagram Belum Digenerate
        </h4>
        <p className="text-xs text-neutral-500 max-w-sm mb-4">
          Diagram relasi akan digenerate secara otomatis berdasarkan dokumen PRD setelah Step 3 selesai.
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-neutral-900 bg-brand hover:bg-brand-hover rounded-lg shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Generate Diagram Sekarang
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Top Floating Action Bar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-sm p-1 rounded-lg border border-neutral-200 shadow-sm">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Sinkronkan Ulang Diagram"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-brand-dark" : ""}`} />
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
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap
            position="bottom-right"
            nodeColor={(n) => {
              const d = n.data as unknown as { nodeType?: string };
              if (d?.nodeType === "epic") return "#ffc200";
              if (d?.nodeType === "feature") return "#64748b";
              return "#cbd5e1";
            }}
            className="!border !border-neutral-200 !rounded-lg !shadow-sm !overflow-hidden"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
