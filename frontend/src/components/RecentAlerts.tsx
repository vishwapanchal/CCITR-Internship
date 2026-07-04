"use client";

import { m } from "framer-motion";
import { AlertCircle, Eye, ShieldAlert, Info } from "lucide-react";

interface RecentAlertsProps {
  analysisResults?: any[];
}

export default function RecentAlerts({ analysisResults }: RecentAlertsProps) {
  // Build alerts from real analysis results
  const alerts: { id: number; type: string; message: string; icon: any }[] = [];
  let alertId = 0;

  if (analysisResults && Array.isArray(analysisResults)) {
    const staticResult = analysisResults.find((r: any) => r.phase === "static");
    if (staticResult?.result) {
      const steps = staticResult.result.steps || {};
      const errors = staticResult.result.errors || [];

      // Report errors
      errors.forEach((err: string) => {
        alerts.push({ id: ++alertId, type: "warning", message: err, icon: Eye });
      });

      // Report successful steps
      if (steps.androguard?.status === "success") {
        alerts.push({ id: ++alertId, type: "info", message: "Androguard analysis completed", icon: Info });
      }
      if (steps.manifest?.status === "success") {
        alerts.push({ id: ++alertId, type: "info", message: "Manifest parsed successfully", icon: Info });
      }
      if (steps.yara?.status === "success") {
        const matches = steps.yara.data?.total_matches || 0;
        alerts.push({ id: ++alertId, type: matches > 0 ? "critical" : "info", message: `YARA scan: ${matches} rule matches`, icon: matches > 0 ? ShieldAlert : Info });
      }
      if (steps.iocs?.status === "success") {
        const total = steps.iocs.data?.total_indicators || 0;
        alerts.push({ id: ++alertId, type: total > 0 ? "warning" : "info", message: `IOC extraction: ${total} indicators found`, icon: total > 0 ? Eye : Info });
      }
    }

    const c2Result = analysisResults.find((r: any) => r.phase === "c2_intelligence");
    if (c2Result?.result) {
      alerts.push({ id: ++alertId, type: "info", message: "C2 intelligence analysis completed", icon: Info });
    }
  }

  if (alerts.length === 0) {
    alerts.push({ id: 1, type: "info", message: "Waiting for analysis results...", icon: Info });
  }

  return (
    <div className="flex flex-col h-full w-full">
      <h3 className="font-display text-lg font-semibold border-b border-border-subtle pb-2 mb-4">
        Analysis Alerts
      </h3>
      <div className="space-y-3">
        {alerts.map((alert, idx) => {
          const isCritical = alert.type === "critical";
          return (
            <m.div
              key={alert.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + idx * 0.15 }}
              className="flex items-start space-x-3 p-3 bg-canvas border border-border-subtle hover:border-primary/30 transition-colors"
            >
              <div className={`mt-0.5 ${isCritical ? 'text-critical' : alert.type === 'warning' ? 'text-warning' : 'text-primary/60'}`}>
                {isCritical ? <AlertCircle className="w-5 h-5" /> : <alert.icon className="w-5 h-5" />}
              </div>
              <div className="flex-grow">
                <p className="text-sm font-medium text-primary">{alert.message}</p>
              </div>
            </m.div>
          );
        })}
      </div>
    </div>
  );
}
