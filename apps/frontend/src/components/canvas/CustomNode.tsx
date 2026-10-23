import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Layers, CheckCircle2, Box, ListChecks } from "lucide-react";

interface NodeData {
  label: string;
  phase?: string;
  nodeType?: "epic" | "feature" | "subfeature" | "subfeatureGroup";
  items?: string[];
}

function CustomNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as NodeData;
  const isEpic = nodeData.nodeType === "epic";
  const isFeature = nodeData.nodeType === "feature";
  const isSubfeature = nodeData.nodeType === "subfeature";
  const isSubfeatureGroup = nodeData.nodeType === "subfeatureGroup";

  const handleStyle = {
    width: 12,
    height: 12,
    background: "var(--app-accent)",
    borderColor: "var(--app-surface)",
    borderWidth: 2,
  };

  if (isSubfeatureGroup) {
    const items = nodeData.items ?? [];

    return (
      <div className="diagram-node diagram-node--group">
        <Handle
          type="target"
          position={Position.Left}
          style={handleStyle}
          className="!-left-1.5"
        />

        <div className="diagram-node__head">
          <span className="diagram-node__type">
            <ListChecks />
            Sub-fitur
          </span>
          <span className="chip chip--neutral">{items.length}</span>
        </div>

        <ul className="diagram-node__items">
          {items.map((item, idx) => (
            <li key={`${idx}-${item}`}>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      className={`diagram-node ${
        isEpic
          ? "diagram-node--epic"
          : isFeature
            ? "diagram-node--feature"
            : "diagram-node--feature"
      }`}
    >
      {!isEpic && (
        <Handle
          type="target"
          position={Position.Left}
          style={handleStyle}
          className="!-left-1.5"
        />
      )}

      <div className="diagram-node__head">
        <span className="diagram-node__type">
          {isEpic ? <Box /> : isFeature ? <Layers /> : <CheckCircle2 />}
          {isEpic ? "Epic" : isFeature ? "Fitur" : "Sub-fitur"}
        </span>

        {nodeData.phase && (
          <span className="diagram-node__phase">{nodeData.phase}</span>
        )}
      </div>

      <div className="diagram-node__title">{nodeData.label}</div>

      {!isSubfeature && (
        <Handle
          type="source"
          position={Position.Right}
          style={handleStyle}
          className="!-right-1.5"
        />
      )}
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);
