import { Network } from "lucide-react";

export default function GraphExplorer() {
  return (
    <main className="flex-1 p-8 flex flex-col items-center justify-center">
      <div className="bg-panel border border-border-subtle p-12 max-w-2xl w-full text-center">
        <Network className="w-16 h-16 mx-auto mb-6 text-forensic-blue/40" />
        <h1 className="text-2xl font-display font-bold text-forensic-blue mb-4">
          C2 Infrastructure Graph
        </h1>
        <p className="text-forensic-blue/70 mb-6">
          The interactive threat infrastructure graph is currently offline. 
          Upload an APK with active network beacons to generate the map.
        </p>
        <div className="bg-canvas border border-border-subtle p-4 font-mono text-sm text-forensic-blue/60 text-left">
          Status: Waiting for Neo4j synchronization...
        </div>
      </div>
    </main>
  );
}
