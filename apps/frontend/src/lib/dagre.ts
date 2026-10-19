import dagre from "@dagrejs/dagre";
import { Node, Edge } from "@xyflow/react";
import { DiagramData, DiagramEdge } from "./api";

const NODE_WIDTH = 240;
const NODE_HEIGHT = 80;
const SUBFEATURE_WIDTH = 240;
const SUBFEATURE_HEIGHT = 72;

// Group node metrics — must stay in sync with CustomNode's compact list markup.
const GROUP_WIDTH = 260;
const GROUP_PADDING_Y = 20; // py-2.5
const GROUP_HEADER_HEIGHT = 24; // header + mb-2
const GROUP_ITEM_LINE_HEIGHT = 15; // text-[11px] leading-snug
const GROUP_ITEM_PADDING_Y = 8; // py-1
const GROUP_CHARS_PER_LINE = 36;

interface GroupedNode {
  id: string;
  label: string;
  phase?: string;
  nodeType: "epic" | "feature" | "subfeature" | "subfeatureGroup";
  items?: string[];
}

function estimateItemHeight(label: string): number {
  const lines = Math.max(1, Math.ceil(label.length / GROUP_CHARS_PER_LINE));
  return lines * GROUP_ITEM_LINE_HEIGHT + GROUP_ITEM_PADDING_Y;
}

function getGroupHeight(items: string[]): number {
  const itemsHeight = items.reduce((sum, item) => sum + estimateItemHeight(item), 0);
  return GROUP_PADDING_Y + GROUP_HEADER_HEIGHT + itemsHeight + 2; // +2 border
}

function getNodeSize(node: GroupedNode): { width: number; height: number } {
  switch (node.nodeType) {
    case "subfeatureGroup":
      return { width: GROUP_WIDTH, height: getGroupHeight(node.items ?? []) };
    case "subfeature":
      return { width: SUBFEATURE_WIDTH, height: SUBFEATURE_HEIGHT };
    default:
      return { width: NODE_WIDTH, height: NODE_HEIGHT };
  }
}

/**
 * Collapses each parent's leaf sub-features into a single list node so the
 * diagram stays compact and readable. Sub-features that have outgoing edges or
 * more than one parent stay standalone to avoid losing relationships.
 */
interface CompactDiagram {
  nodes: GroupedNode[];
  edges: DiagramEdge[];
}

function groupSubfeatures(data: DiagramData): CompactDiagram {
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  const sources = new Set(data.edges.map((edge) => edge.source));
  const incomingCount = new Map<string, number>();
  data.edges.forEach((edge) => {
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);
  });

  const groupedIds = new Set<string>();
  const groups = new Map<string, { id: string; items: string[] }>();

  data.nodes.forEach((node) => {
    if (node.type !== "subfeature") return;
    if (sources.has(node.id)) return;
    if ((incomingCount.get(node.id) ?? 0) !== 1) return;

    const parentEdge = data.edges.find((edge) => edge.target === node.id);
    const parent = parentEdge ? byId.get(parentEdge.source) : undefined;
    if (!parent || parent.type === "subfeature") return;

    groupedIds.add(node.id);
    const groupId = `group-${parent.id}`;
    const group = groups.get(groupId) ?? { id: groupId, items: [] };
    group.items.push(node.label);
    groups.set(groupId, group);
  });

  if (groupedIds.size === 0) {
    return {
      nodes: data.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        phase: node.phase,
        nodeType: node.type ?? "feature",
      })),
      edges: data.edges,
    };
  }

  const nodes: GroupedNode[] = data.nodes
    .filter((node) => !groupedIds.has(node.id))
    .map((node) => ({
      id: node.id,
      label: node.label,
      phase: node.phase,
      nodeType: node.type ?? "feature",
    }));

  groups.forEach((group) => {
    nodes.push({
      id: group.id,
      label: "Sub Fitur",
      nodeType: "subfeatureGroup",
      items: group.items,
    });
  });

  const edges = data.edges
    .filter((edge) => !groupedIds.has(edge.target))
    .map((edge, idx) => ({ ...edge, id: edge.id ?? `edge-${edge.source}-${edge.target}-${idx}` }));

  groups.forEach((group) => {
    const groupId = group.id;
    const parentId = groupId.slice("group-".length);
    edges.push({
      id: `edge-${parentId}-${groupId}`,
      source: parentId,
      target: groupId,
    });
  });

  return { nodes, edges };
}

export function getLayoutedElements(
  data: DiagramData,
  direction: "LR" | "TB" = "LR",
  isDark = false
): { nodes: Node[]; edges: Edge[] } {
  const compact = groupSubfeatures(data);

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
  compact.nodes.forEach((node) => {
    const size = getNodeSize(node);
    dagreGraph.setNode(node.id, size);
  });

  // Add edges to dagre
  compact.edges.forEach((edge, idx) => {
    dagreGraph.setEdge(edge.source, edge.target, { id: edge.id || `e-${idx}` });
  });

  dagre.layout(dagreGraph);

  const positionedNodes: Node[] = compact.nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const size = getNodeSize(node);

    return {
      id: node.id,
      type: "customNode",
      position: {
        x: nodeWithPosition.x - size.width / 2,
        y: nodeWithPosition.y - size.height / 2,
      },
      initialWidth: size.width,
      initialHeight: size.height,
      data: {
        label: node.label,
        phase: node.phase,
        nodeType: node.nodeType,
        items: node.items,
      },
    };
  });

  const styledEdges: Edge[] = compact.edges.map((edge, idx) => ({
    id: edge.id || `edge-${edge.source}-${edge.target}-${idx}`,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: true,
    style: { stroke: isDark ? "#ffc200" : "#b38800", strokeWidth: 2 },
  }));

  return {
    nodes: positionedNodes,
    edges: styledEdges,
  };
}
