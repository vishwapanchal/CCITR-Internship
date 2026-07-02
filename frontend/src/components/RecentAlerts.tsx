"use client";

import { m } from "framer-motion";
import { AlertCircle, Eye, Wifi, ShieldAlert } from "lucide-react";

const alerts = [
  {
    id: 1,
    type: "critical",
    message: "C2 Beacon detected to 192.168.x.x",
    time: "2ms ago",
    icon: Wifi,
  },
  {
    id: 2,
    type: "warning",
    message: "Suspicious API: Runtime.exec()",
    time: "45s ago",
    icon: Eye,
  },
  {
    id: 3,
    type: "critical",
    message: "Vulnerable dependency: log4j-1.2",
    time: "1m ago",
    icon: ShieldAlert,
  },
  {
    id: 4,
    type: "info",
    message: "Dynamic analysis sandbox started",
    time: "5m ago",
    icon: AlertCircle,
  },
];

export default function RecentAlerts() {
  return (
    <div className="flex flex-col h-full w-full">
      <h3 className="font-display text-lg font-semibold border-b border-border-subtle pb-2 mb-4">
        Live Behavioral Alerts
      </h3>
      <div className="space-y-3">
        {alerts.map((alert, idx) => {
          const Icon = alert.icon;
          const isCritical = alert.type === "critical";
          return (
            <m.div
              key={alert.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + idx * 0.15 }}
              className="flex items-start space-x-3 p-3 bg-canvas border border-border-subtle hover:border-primary/30 transition-colors"
            >
              <div className={`mt-0.5 ${isCritical ? 'text-critical' : 'text-warning'}`}>
                {isCritical ? <AlertCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <div className="flex-grow">
                <p className="text-sm font-medium text-primary">{alert.message}</p>
                <span className="text-xs font-mono text-primary/60 mt-1 block">
                  {alert.time}
                </span>
              </div>
            </m.div>
          );
        })}
      </div>
    </div>
  );
}
