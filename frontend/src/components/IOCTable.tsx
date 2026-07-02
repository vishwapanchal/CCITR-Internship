"use client";

import { useState, useMemo } from "react";
import type { IOCEntry } from "@/services/realData";
import { exportIOCsAsCSV, exportIOCsAsJSON, exportIOCsAsSTIX } from "@/services/api";

interface IOCTableProps {
  iocs: IOCEntry[];
}

const typeColors: Record<string, string> = {
  domain: "text-blue-600 bg-blue-50",
  ip: "text-green-600 bg-green-50",
  url: "text-purple-600 bg-purple-50",
  hash: "text-orange-600 bg-orange-50",
  email: "text-pink-600 bg-pink-50",
  phone: "text-red-600 bg-red-50",
};

type SortField = "type" | "value" | "confidence" | "first_seen";

export default function IOCTable({ iocs }: IOCTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("confidence");
  const [sortAsc, setSortAsc] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const iocTypes = useMemo(() => ["all", ...Array.from(new Set(iocs.map((i) => i.type)))], [iocs]);

  const filtered = useMemo(() => {
    let result = [...iocs];

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((i) => i.type === typeFilter);
    }

    // Search
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.value.toLowerCase().includes(lower) ||
          i.context.toLowerCase().includes(lower) ||
          i.type.toLowerCase().includes(lower)
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "confidence") cmp = a.confidence - b.confidence;
      else if (sortField === "first_seen") cmp = a.first_seen.localeCompare(b.first_seen);
      else cmp = String(a[sortField]).localeCompare(String(b[sortField]));
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [iocs, search, sortField, sortAsc, typeFilter]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  function renderSortArrow(field: SortField) {
    if (sortField !== field) return null;
    return <span className="ml-1">{sortAsc ? "↑" : "↓"}</span>;
  }

  const exportData = filtered.map((i) => ({
    type: i.type,
    value: i.value,
    context: i.context,
    confidence: i.confidence,
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="Search IOCs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-canvas border border-border-subtle px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-primary/50 flex-1 min-w-[200px]"
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-canvas border border-border-subtle px-3 py-1.5 text-sm font-mono focus:outline-none"
        >
          {iocTypes.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "All Types" : t.toUpperCase()}
            </option>
          ))}
        </select>

        {/* Export buttons */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => exportIOCsAsCSV(exportData)}
            className="px-2 py-1.5 text-xs font-mono border border-border-subtle hover:bg-canvas transition-colors"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={() => exportIOCsAsJSON(exportData)}
            className="px-2 py-1.5 text-xs font-mono border border-border-subtle hover:bg-canvas transition-colors"
          >
            JSON
          </button>
          <button
            type="button"
            onClick={() => exportIOCsAsSTIX(exportData)}
            className="px-2 py-1.5 text-xs font-mono border border-border-subtle hover:bg-canvas transition-colors"
          >
            STIX
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left">
              <th
                className="pb-2 font-mono text-xs text-primary/60 font-medium cursor-pointer hover:text-primary"
                onClick={() => handleSort("type")}
              >
                Type{renderSortArrow("type")}
              </th>
              <th
                className="pb-2 font-mono text-xs text-primary/60 font-medium cursor-pointer hover:text-primary"
                onClick={() => handleSort("value")}
              >
                Value{renderSortArrow("value")}
              </th>
              <th className="pb-2 font-mono text-xs text-primary/60 font-medium">Context</th>
              <th
                className="pb-2 font-mono text-xs text-primary/60 font-medium cursor-pointer hover:text-primary text-right"
                onClick={() => handleSort("confidence")}
              >
                Confidence{renderSortArrow("confidence")}
              </th>
              <th
                className="pb-2 font-mono text-xs text-primary/60 font-medium cursor-pointer hover:text-primary"
                onClick={() => handleSort("first_seen")}
              >
                First Seen{renderSortArrow("first_seen")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ioc) => (
              <tr key={ioc.id} className="border-b border-border-subtle/50 hover:bg-canvas/50 transition-colors">
                <td className="py-2 pr-3">
                  <span className={`text-xs font-mono font-semibold px-2 py-0.5 ${typeColors[ioc.type] || ""}`}>
                    {ioc.type.toUpperCase()}
                  </span>
                </td>
                <td className="py-2 pr-3 font-mono text-xs break-all max-w-[300px]">{ioc.value}</td>
                <td className="py-2 pr-3 text-xs text-primary/70 max-w-[250px]">{ioc.context}</td>
                <td className="py-2 pr-3 text-right">
                  <span
                    className={`text-xs font-mono font-semibold ${
                      ioc.confidence >= 80 ? "text-red-600" : ioc.confidence >= 60 ? "text-orange-600" : "text-primary/60"
                    }`}
                  >
                    {ioc.confidence}%
                  </span>
                </td>
                <td className="py-2 text-xs font-mono text-primary/60 whitespace-nowrap">
                  {new Date(ioc.first_seen).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-xs font-mono text-primary/50">
        Showing {filtered.length} of {iocs.length} indicators
      </div>
    </div>
  );
}
