"use client";

import { useCallback, useState, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  MarkerType,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import type { GraphNode, GraphEdge } from "@/services/realData";

interface NetworkGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (nodeId: string, data: GraphNode) => void;
}

const nodeTypeColors: Record<string, { bg: string; border: string; text: string }> = {
  apk: { bg: "#fef2f2", border: "#ef4444", text: "#dc2626" },
  domain: { bg: "#eff6ff", border: "#3b82f6", text: "#2563eb" },
  ip: { bg: "#ecfdf5", border: "#10b981", text: "#059669" },
  campaign: { bg: "#fff7ed", border: "#f97316", text: "#ea580c" },
  threat_actor: { bg: "#f5f3ff", border: "#8b5cf6", text: "#7c3aed" },
  baas_project: { bg: "#fdf4ff", border: "#d946ef", text: "#c026d3" },
  url: { bg: "#fefce8", border: "#eab308", text: "#ca8a04" },
  file: { bg: "#fef2f2", border: "#f43f5e", text: "#e11d48" },
};

function buildReactFlowNodes(graphNodes: GraphNode[]): Node[] {
  const centerX = 400;
  const centerY = 300;
  // Spread nodes more for better readability
  const radius = Math.min(300, 80 * graphNodes.length);

  return graphNodes.map((node, idx) => {
    const angle = (2 * Math.PI * idx) / graphNodes.length - Math.PI / 2;
    const colors = nodeTypeColors[node.type] || nodeTypeColors.domain;
    // APK nodes go in center
    const isCenter = node.type === "apk";

    return {
      id: node.id,
      position: isCenter
        ? { x: centerX, y: centerY }
        : {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          },
      data: { label: node.label, nodeData: node },
      style: {
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: "12px",
        padding: "10px 16px",
        fontSize: "12px",
        fontFamily: "system-ui, sans-serif",
        fontWeight: isCenter ? 700 : 500,
        color: colors.text,
        minWidth: isCenter ? "140px" : "100px",
        textAlign: "center" as const,
        boxShadow: isCenter ? `0 4px 12px ${colors.border}40` : "none",
      },
    };
  });
}

function buildReactFlowEdges(graphEdges: GraphEdge[]): Edge[] {
  return graphEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: `${edge.label}${edge.confidence ? ` ${edge.confidence}%` : ""}`,
    type: "default",
    animated: edge.style !== "dashed",
    style: {
      stroke: edge.style === "dashed" ? "#cbd5e1" : "#94a3b8",
      strokeDasharray: edge.style === "dashed" ? "5,5" : undefined,
      strokeWidth: 1.5,
    },
    labelStyle: { fontSize: 10, fill: "#64748b", fontFamily: "system-ui" },
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: "#94a3b8" },
  }));
}

export default function NetworkGraph({
  nodes: graphNodes,
  edges: graphEdges,
  onNodeClick,
}: NetworkGraphProps) {
  const initialNodes = useMemo(() => buildReactFlowNodes(graphNodes), [graphNodes]);
  const initialEdges = useMemo(() => buildReactFlowEdges(graphEdges), [graphEdges]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      const nodeData = node.data.nodeData as GraphNode;
      setSelectedNode(nodeData);
      onNodeClick?.(node.id, nodeData);
    },
    [onNodeClick]
  );

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 relative" style={{ minHeight: "400px" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
        >
          <Controls
            position="top-left"
            style={{ display: "flex", flexDirection: "column", gap: 2 }}
          />
          <MiniMap
            nodeColor={(n) => {
              const type = (n.data?.nodeData as GraphNode)?.type || "domain";
              return nodeTypeColors[type]?.border || "#94a3b8";
            }}
            style={{ borderRadius: 8 }}
          />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
        </ReactFlow>
      </div>

      {/* Node detail panel */}
      {selectedNode && (
        <div className="w-72 border-l border-border-subtle bg-white p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-semibold text-sm">
              Node Details
            </h3>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="text-text-muted hover:text-text text-lg w-6 h-6 flex items-center justify-center rounded hover:bg-surface"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-xs text-text-muted block">Type</span>
              <span className="text-sm font-semibold capitalize">
                {selectedNode.type.replace("_", " ")}
              </span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Label</span>
              <span className="text-sm font-mono break-all">
                {selectedNode.label}
              </span>
            </div>
            {selectedNode.metadata &&
              Object.entries(selectedNode.metadata).map(([key, value]) => (
                <div key={key}>
                  <span className="text-xs text-text-muted block capitalize">
                    {key}
                  </span>
                  <span className="text-sm">{value}</span>
                </div>
              ))}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-border-subtle">
            <h4 className="text-xs text-text-muted mb-2">Legend</h4>
            <div className="space-y-1.5">
              {Object.entries(nodeTypeColors).map(([type, colors]) => (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{
                      background: colors.bg,
                      border: `1.5px solid ${colors.border}`,
                    }}
                  />
                  <span className="text-xs capitalize">
                    {type.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
