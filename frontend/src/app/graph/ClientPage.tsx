"use client";

import { useEffect, useMemo, useState } from "react";
import NetworkGraph from "@/components/NetworkGraph";
import { getCases, getCaseResults } from "@/services/api";
import type { GraphNode, GraphEdge } from "@/services/realData";
import { Network, Search } from "lucide-react";

export default function GraphExplorer() {
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [allNodes, setAllNodes] = useState<GraphNode[]>([]);
  const [allEdges, setAllEdges] = useState<GraphEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadGraph() {
      const { data: cases } = await getCases();
      const completedCases = (cases || []).filter((c) => c.status === "completed");

      const nodeMap = new Map<string, GraphNode>();
      const edgeMap = new Map<string, GraphEdge>();

      await Promise.all(
        completedCases.map(async (c) => {
          const { data: resultsData } = await getCaseResults(c.id);
          const c2Result = resultsData?.results && (resultsData.results as any)["c2_intelligence"];
          const nodes: GraphNode[] = c2Result?.nodes || [];
          const edges: GraphEdge[] = c2Result?.edges || [];

          for (const n of nodes) {
            if (!nodeMap.has(n.id)) nodeMap.set(n.id, n);
          }
          for (const e of edges) {
            const uniqueId = `${c.id}-${e.id}`;
            edgeMap.set(uniqueId, { ...e, id: uniqueId });
          }
        })
      );

      setAllNodes(Array.from(nodeMap.values()));
      setAllEdges(Array.from(edgeMap.values()));
      setIsLoading(false);
    }
    loadGraph();
  }, []);

  const nodes = useMemo(() => {
    let filtered = filterType === "all" ? allNodes : allNodes.filter((n) => n.type === filterType || n.type === "apk");
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((n) => n.label.toLowerCase().includes(q));
    }
    return filtered;
  }, [allNodes, filterType, search]);

  const nodeIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);
  const edges = useMemo(
    () => allEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target)),
    [allEdges, nodeIds]
  );

  return (
    <main className="flex-1 p-4 md:p-6 flex flex-col h-[calc(100vh-70px)] max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 border-b border-border-subtle pb-4 shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-text">
              Threat Map
            </h1>
            <p className="text-xs text-text-muted">
              How your analyzed apps connect to shared domains and infrastructure
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-text-muted" />
            <input
              type="text"
              aria-label="Search nodes"
              placeholder="Search nodes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-border-subtle pl-8 pr-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full sm:w-56"
            />
          </div>
          <select
            aria-label="Filter nodes by type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white border border-border-subtle px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Types</option>
            <option value="domain">Domains</option>
            <option value="ip">IP Addresses</option>
            <option value="url">URLs</option>
            <option value="file">Dropped Files</option>
          </select>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 bg-white border border-border-subtle rounded-xl min-h-0 relative overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-text-muted">
            Loading threat graph...
          </div>
        ) : nodes.length > 0 ? (
          <NetworkGraph nodes={nodes} edges={edges} />
        ) : (
          <div className="flex items-center justify-center h-full text-text-muted">
            No C2 infrastructure indicators found across completed cases yet.
          </div>
        )}
      </div>
    </main>
  );
}
