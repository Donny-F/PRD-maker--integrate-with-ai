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
import { Download, Network, RefreshCw } from "lucide-react";
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
        backgroundColor: isDark ? "#161a1d" : "#f5f6f6",
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
      <section className="work-panel" aria-label="Diagram alur">
        <div className="work-panel__head">
          <div className="work-panel__title">
            <Network />
            <span>Diagram alur</span>
          </div>
        </div>
        <div className="diagram-empty">
          <h3 className="app-section-title">Diagram belum dibuat</h3>
          <p className="app-section-sub" style={{ maxWidth: "48ch" }}>
            Diagram relasi dibuat otomatis dari dokumen PRD setelah generasi
            selesai. Anda juga dapat membuatnya sekarang.
          </p>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="btn btn--primary btn--sm"
            >
              <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
              <span>Generate diagram</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="work-panel" aria-label="Diagram alur">
      <div className="work-panel__head">
        <div className="work-panel__title">
          <Network />
          <span>Diagram alur</span>
        </div>
        <span className="app-meta">{data.nodes.length} node</span>
      </div>

      <div className="diagram-frame">
        <div className="diagram-toolbar">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Sinkronkan ulang diagram"
              className="btn btn--quiet btn--sm"
            >
              <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
              <span>Regenerate</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportPng}
            disabled={isExporting}
            className="btn btn--primary btn--sm"
          >
            <Download />
            <span>{isExporting ? "Mengekspor..." : "Unduh PNG"}</span>
          </button>
        </div>

        <div ref={reactFlowWrapper} style={{ width: "100%", height: "100%" }}>
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
              color={isDark ? "#3d464b" : "#b4bec2"}
            />
            <Controls showInteractive={false} position="bottom-left" />
            <MiniMap
              position="bottom-right"
              style={{
                width: compactMinimap ? 120 : 200,
                height: compactMinimap ? 80 : 150,
                boxSizing: "content-box",
                background: isDark ? "#1b2024" : "#ffffff",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.14)" : "rgba(20,24,27,0.11)"}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
              maskColor={isDark ? "rgba(6,7,8,0.72)" : "rgba(245,246,246,0.72)"}
              nodeColor={(n) => {
                const d = n.data as unknown as { nodeType?: string };
                if (d?.nodeType === "epic") return "#ffc200";
                if (d?.nodeType === "feature") return isDark ? "#a6b0b6" : "#5a666d";
                if (d?.nodeType === "subfeatureGroup") return isDark ? "#7e8a90" : "#8b979d";
                return isDark ? "#3d464b" : "#c8d0d3";
              }}
            />
          </ReactFlow>
        </div>
      </div>
    </section>
  );
}
