"use client";

import { useCallback, useState } from "react";
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

const nodeTypeColors: Record<string, { bg: string; border: string }> = {
  apk: { bg: "#fee2e2", border: "#dc2626" },
  domain: { bg: "#dbeafe", border: "#2563eb" },
  ip: { bg: "#dcfce7", border: "#16a34a" },
  campaign: { bg: "#fff7ed", border: "#ea580c" },
  threat_actor: { bg: "#f3e8ff", border: "#9333ea" },
};

function buildReactFlowNodes(graphNodes: GraphNode[]): Node[] {
  // Simple circular layout
  const centerX = 400;
  const centerY = 300;
  const radius = 250;

  return graphNodes.map((node, idx) => {
    const angle = (2 * Math.PI * idx) / graphNodes.length - Math.PI / 2;
    const colors = nodeTypeColors[node.type] || nodeTypeColors.domain;

    return {
      id: node.id,
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      },
      data: {
        label: node.label,
        nodeData: node,
      },
      style: {
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: "8px",
        padding: "10px 16px",
        fontSize: "12px",
        fontFamily: "var(--font-mono)",
        fontWeight: 500,
        minWidth: "120px",
        textAlign: "center" as const,
      },
    };
  });
}

function buildReactFlowEdges(graphEdges: GraphEdge[]): Edge[] {
  return graphEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: `${edge.label}${edge.confidence ? ` (${edge.confidence}%)` : ""}`,
    type: "default",
    animated: edge.style !== "dashed",
    style: {
      stroke: edge.style === "dashed" ? "#9ca3af" : "#6b7280",
      strokeDasharray: edge.style === "dashed" ? "5,5" : undefined,
    },
    labelStyle: { fontSize: 10, fontFamily: "var(--font-mono)" },
    markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
  }));
}

export default function NetworkGraph({ nodes: graphNodes, edges: graphEdges, onNodeClick }: NetworkGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(buildReactFlowNodes(graphNodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildReactFlowEdges(graphEdges));
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      const nodeData = node.data.nodeData as GraphNode;
      setSelectedNode(nodeData);
      onNodeClick?.(node.id, nodeData);
    },
    [onNodeClick]
  );

  // Export graph as SVG
  const exportSVG = useCallback(() => {
    const svgElement = document.querySelector(".react-flow__renderer svg");
    if (!svgElement) {
      alert("Graph not ready for export");
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "c2_graph.svg";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="flex h-full w-full">
      {/* Graph canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              const type = (n.data?.nodeData as GraphNode)?.type || "domain";
              return nodeTypeColors[type]?.border || "#6b7280";
            }}
          />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>

        {/* Export button */}
        <button
          onClick={exportSVG}
          className="absolute top-3 right-3 bg-panel border border-border-subtle px-3 py-1.5 text-xs font-mono hover:bg-canvas transition-colors z-10"
        >
          Export SVG
        </button>
      </div>

      {/* Node detail panel */}
      {selectedNode && (
        <div className="w-72 border-l border-border-subtle bg-panel p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-semibold text-sm">Node Details</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-forensic-blue/50 hover:text-forensic-blue text-lg"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-xs font-mono text-forensic-blue/60 block">Type</span>
              <span className="text-sm font-semibold capitalize">{selectedNode.type.replace("_", " ")}</span>
            </div>
            <div>
              <span className="text-xs font-mono text-forensic-blue/60 block">Label</span>
              <span className="text-sm font-mono break-all">{selectedNode.label}</span>
            </div>
            {selectedNode.metadata && Object.entries(selectedNode.metadata).map(([key, value]) => (
              <div key={key}>
                <span className="text-xs font-mono text-forensic-blue/60 block capitalize">{key}</span>
                <span className="text-sm font-mono">{value}</span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-border-subtle">
            <h4 className="text-xs font-mono text-forensic-blue/60 mb-2">LEGEND</h4>
            <div className="space-y-1">
              {Object.entries(nodeTypeColors).map(([type, colors]) => (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ background: colors.bg, border: `1.5px solid ${colors.border}` }}
                  />
                  <span className="text-xs capitalize">{type.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
