import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Layers, CheckCircle2, Box } from "lucide-react";

interface NodeData {
  label: string;
  phase?: string;
  nodeType?: "epic" | "feature" | "subfeature";
}

function CustomNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as NodeData;
  const isEpic = nodeData.nodeType === "epic";
  const isFeature = nodeData.nodeType === "feature";
  const isSubfeature = nodeData.nodeType === "subfeature";

  return (
    <div
      className={`px-4 py-3 rounded-lg shadow-sm border transition-all duration-150 min-w-[220px] max-w-[260px] bg-white ${
        isEpic
          ? "border-2 border-brand ring-2 ring-brand/20 shadow-md bg-neutral-900 text-white"
          : isFeature
          ? "border-neutral-300 hover:border-brand shadow-sm text-neutral-900"
          : "border-neutral-200 bg-neutral-50/70 text-neutral-800 text-xs"
      }`}
    >
      {/* Target Handle on the Left (for incoming connections) */}
      {!isEpic && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 bg-brand border-2 border-white rounded-full !-left-1.5"
        />
      )}

      {/* Header with Type indicator and Phase badge */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          {isEpic && <Box className="w-4 h-4 text-brand" />}
          {isFeature && <Layers className="w-3.5 h-3.5 text-neutral-600" />}
          {isSubfeature && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
          <span
            className={`font-semibold tracking-wider uppercase text-[10px] ${
              isEpic ? "text-brand" : "text-neutral-500"
            }`}
          >
            {isEpic ? "Epic (Root)" : isFeature ? "Fitur" : "Sub-fitur"}
          </span>
        </div>

        {nodeData.phase && (
          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand/15 text-brand-dark border border-brand/30">
            {nodeData.phase}
          </span>
        )}
      </div>

      {/* Node Title / Label */}
      <div
        className={`font-medium break-words leading-snug ${
          isEpic ? "text-sm text-white" : isFeature ? "text-xs text-neutral-900" : "text-xs text-neutral-700"
        }`}
      >
        {nodeData.label}
      </div>

      {/* Source Handle on the Right (for outgoing connections) */}
      {!isSubfeature && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-brand border-2 border-white rounded-full !-right-1.5"
        />
      )}
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);
