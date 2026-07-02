"use client";

import { useState } from "react";
import NetworkGraph from "@/components/NetworkGraph";
import { REAL_GRAPH_NODES, REAL_GRAPH_EDGES } from "@/services/realData";
import { Network, Search, Filter } from "lucide-react";

export default function GraphExplorer() {
  const [filterType, setFilterType] = useState<string>("all");
  
  // Simple filtering
  const nodes = filterType === "all" 
    ? REAL_GRAPH_NODES 
    : REAL_GRAPH_NODES.filter(n => n.type === filterType || n.type === "apk");
    
  const nodeIds = new Set(nodes.map(n => n.id));
  const edges = REAL_GRAPH_EDGES.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

  return (
    <main className="flex-1 p-6 flex flex-col h-[calc(100vh-70px)] max-w-[1600px] mx-auto w-full">
      {/* Header & Controls */}
      <div className="flex items-center justify-between mb-4 border-b border-border-subtle pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-canvas border border-border-subtle p-2">
            <Network className="w-6 h-6 text-forensic-blue" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-forensic-blue">
              C2 Infrastructure Graph Explorer
            </h1>
            <p className="text-xs font-mono text-forensic-blue/60">
              Interactive visualization of threat actor infrastructure and campaigns
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-forensic-blue/40" />
            <input 
              type="text" 
              placeholder="Search nodes..." 
              className="bg-canvas border border-border-subtle pl-8 pr-3 py-2 text-xs font-mono focus:outline-none focus:border-forensic-blue/50 w-64"
            />
          </div>
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-canvas border border-border-subtle px-3 py-2 text-xs font-mono focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="domain">Domains</option>
            <option value="ip">IP Addresses</option>
            <option value="campaign">Campaigns</option>
            <option value="threat_actor">Threat Actors</option>
          </select>
        </div>
      </div>

      {/* Graph Area */}
      <div className="flex-1 bg-panel border border-border-subtle min-h-0 relative">
        <NetworkGraph nodes={nodes} edges={edges} />
      </div>
    </main>
  );
}
