"use client";

import type { Permission } from "@/services/realData";

interface PermissionMatrixProps {
  permissions: Permission[];
}

const riskColors: Record<string, { bg: string; text: string }> = {
  low: { bg: "bg-green-100", text: "text-green-700" },
  medium: { bg: "bg-yellow-100", text: "text-yellow-700" },
  high: { bg: "bg-orange-100", text: "text-orange-700" },
  critical: { bg: "bg-red-100", text: "text-red-700" },
};

const protectionColors: Record<string, string> = {
  normal: "text-green-600",
  dangerous: "text-red-600",
  signature: "text-orange-600",
  signatureOrSystem: "text-purple-600",
};

export default function PermissionMatrix({ permissions }: PermissionMatrixProps) {
  const sortedPermissions = [...permissions].sort((a, b) => {
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return (riskOrder[a.risk] || 3) - (riskOrder[b.risk] || 3);
  });

  const dangerousCount = permissions.filter((p) => p.protection_level === "dangerous").length;
  const criticalCount = permissions.filter((p) => p.risk === "critical").length;

  return (
    <div className="flex flex-col h-full">
      {/* Summary bar */}
      <div className="flex gap-4 mb-4 text-xs font-mono">
        <span className="text-primary/60">
          Total: <strong className="text-primary">{permissions.length}</strong>
        </span>
        <span className="text-red-600">
          Dangerous: <strong>{dangerousCount}</strong>
        </span>
        <span className="text-red-700">
          Critical Risk: <strong>{criticalCount}</strong>
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left">
              <th className="pb-2 font-mono text-xs text-primary/60 font-medium">Permission</th>
              <th className="pb-2 font-mono text-xs text-primary/60 font-medium">Protection</th>
              <th className="pb-2 font-mono text-xs text-primary/60 font-medium">Risk</th>
              <th className="pb-2 font-mono text-xs text-primary/60 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedPermissions.map((perm, idx) => {
              const risk = riskColors[perm.risk] || riskColors.low;
              return (
                <tr
                  key={idx}
                  className="border-b border-border-subtle/50 hover:bg-canvas/50 transition-colors"
                  title={perm.description}
                >
                  <td className="py-2 pr-3">
                    <span className="font-mono text-xs break-all">{perm.name}</span>
                    <span className="block text-xs text-primary/50 mt-0.5">{perm.description}</span>
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`text-xs font-mono font-semibold ${protectionColors[perm.protection_level] || ""}`}>
                      {perm.protection_level}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`text-xs font-mono font-semibold px-2 py-0.5 ${risk.bg} ${risk.text}`}>
                      {perm.risk.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2">
                    <span className={`text-xs font-mono ${perm.granted ? "text-red-600" : "text-green-600"}`}>
                      {perm.granted ? "GRANTED" : "DENIED"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
