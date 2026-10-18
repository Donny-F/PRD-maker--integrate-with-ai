import dagre from "@dagrejs/dagre";
import { Node, Edge } from "@xyflow/react";
import { DiagramData } from "./api";

const NODE_WIDTH = 240;
const NODE_HEIGHT = 80;

export function getLayoutedElements(
  data: DiagramData,
  direction: "LR" | "TB" = "LR"
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 40,
    ranksep: 90,
    marginx: 40,
    marginy: 40,
  });

  // Add nodes to dagre
  data.nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  // Add edges to dagre
  data.edges.forEach((edge, idx) => {
    dagreGraph.setEdge(edge.source, edge.target, { id: edge.id || `e-${idx}` });
  });

  dagre.layout(dagreGraph);

  const positionedNodes: Node[] = data.nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const x = nodeWithPosition.x - NODE_WIDTH / 2;
    const y = nodeWithPosition.y - NODE_HEIGHT / 2;

    return {
      id: node.id,
      type: "customNode",
      position: { x, y },
      initialWidth: NODE_WIDTH,
      initialHeight: NODE_HEIGHT,
      data: {
        label: node.label,
        phase: node.phase,
        nodeType: node.type || "feature",
      },
    };
  });

  const styledEdges: Edge[] = data.edges.map((edge, idx) => ({
    id: edge.id || `edge-${edge.source}-${edge.target}-${idx}`,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: true,
    style: { stroke: "#ffc200", strokeWidth: 2 },
  }));

  return {
    nodes: positionedNodes,
    edges: styledEdges,
  };
}
