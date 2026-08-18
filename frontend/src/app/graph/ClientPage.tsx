"use client";

import { useState } from "react";
import NetworkGraph from "@/components/NetworkGraph";
import { REAL_GRAPH_NODES, REAL_GRAPH_EDGES } from "@/services/realData";
import { Network, Search } from "lucide-react";

export default function GraphExplorer() {
  const [filterType, setFilterType] = useState<string>("all");

  const nodes =
    filterType === "all"
      ? REAL_GRAPH_NODES
      : REAL_GRAPH_NODES.filter(
          (n) => n.type === filterType || n.type === "apk"
        );

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = REAL_GRAPH_EDGES.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
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
              See how apps connect to external domains and infrastructure
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
            <option value="campaign">Campaigns</option>
            <option value="threat_actor">Threat Actors</option>
          </select>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 bg-white border border-border-subtle rounded-xl min-h-0 relative overflow-hidden">
        {nodes.length > 0 ? (
          <NetworkGraph nodes={nodes} edges={edges} />
        ) : (
          <div className="flex items-center justify-center h-full text-text-muted">
            No nodes to display for this filter.
          </div>
        )}
      </div>
    </main>
  );
}
