import HeroGauge from "@/components/HeroGauge";
import MetadataPanel from "@/components/MetadataPanel";
import RecentAlerts from "@/components/RecentAlerts";
import VulnerabilityRadar from "@/components/VulnerabilityRadar";
import PhaseProgress from "@/components/PhaseProgress";
import SyndicateAlert from "@/components/SyndicateAlert";
import { AlertTriangle } from "lucide-react";

export default function OverviewTab({ caseData, phaseStatus }: { caseData: any; phaseStatus: any }) {
  return (
    <>
      {caseData.id && <SyndicateAlert caseId={caseData.id} />}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Hero Score - Large Animated Gauge */}
      <div className="bg-panel border border-border-subtle p-6 flex flex-col items-center justify-center md:col-span-4 min-h-[300px]">
        <HeroGauge score={caseData.threat_score} />
        <p className="mt-6 text-sm font-semibold text-center uppercase tracking-wider">{caseData.verdict}</p>
      </div>

      {/* Metadata Panel */}
      <div className="bg-panel border border-border-subtle p-6 md:col-span-4">
        <MetadataPanel />
      </div>

      {/* Vulnerability Radar */}
      <div className="bg-panel border border-border-subtle p-6 md:col-span-4 flex flex-col items-center justify-center">
        <VulnerabilityRadar />
      </div>

      {/* Key Findings Summary */}
      <div className="bg-panel border border-border-subtle p-4 md:col-span-7">
        <h3 className="font-display font-semibold text-sm mb-3 border-b border-border-subtle pb-2">
          Key Findings Summary
        </h3>
        <div className="space-y-2">
          <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 hover:scale-[1.01] transition-transform">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0 animate-pulse" />
            <div>
              <span className="text-xs font-semibold text-red-700">C2 Communication Detected</span>
              <p className="text-xs text-red-600 mt-0.5">Active beacon to c2.malware-ops.ru every 30 seconds</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 hover:scale-[1.01] transition-transform">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0 animate-pulse" />
            <div>
              <span className="text-xs font-semibold text-red-700">Data Exfiltration</span>
              <p className="text-xs text-red-600 mt-0.5">SMS messages and contacts exfiltrated to external server</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 bg-orange-50 border border-orange-200 hover:scale-[1.01] transition-transform">
            <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-orange-700">Dynamic Code Loading</span>
              <p className="text-xs text-orange-600 mt-0.5">Loads encrypted DEX payload at runtime via DexClassLoader</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Behavioral Alerts */}
      <div className="bg-panel border border-border-subtle p-4 md:col-span-5">
        <RecentAlerts />
      </div>

      {/* Progress */}
      <div className="bg-panel border border-border-subtle p-4 md:col-span-12">
        <PhaseProgress phases={phaseStatus} />
      </div>
    </div>
    </>
  );
}
