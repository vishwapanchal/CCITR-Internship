import React from "react";
import OverviewTab from "./OverviewTab";
import ReportsTab from "./ReportsTab";
import StaticTab from "./StaticTab";
import DynamicTab from "./DynamicTab";
import C2Tab from "./C2Tab";
import VulnsTab from "./VulnsTab";

interface CaseTabsProps {
  activeTab: string;
  caseData: any;
  phaseStatus: any;
  caseReports: any[];
  analysisResults?: any;
}

export default function CaseTabs({
  activeTab,
  caseData,
  phaseStatus,
  caseReports,
  analysisResults,
}: CaseTabsProps) {
  const isMockCase = ["4c0ce95d-5ae2-4d8c-9dbf-981a8b8d4396", "94f9222d-4e42-4292-8800-4f80fa4e037c", "d311d0cf-a8b3-4f83-8405-6bb7318d3b40"].includes(caseData?.id);

  return (
    <div className="flex-1 min-h-0">
      {activeTab === "overview" && (
        <OverviewTab caseData={caseData} phaseStatus={phaseStatus} analysisResults={analysisResults} />
      )}

      {activeTab === "static" && (
        <StaticTab caseData={caseData} analysisResults={analysisResults} isMockCase={isMockCase} />
      )}

      {activeTab === "dynamic" && (
        <DynamicTab caseData={caseData} analysisResults={analysisResults} isMockCase={isMockCase} />
      )}

      {activeTab === "c2" && (
        <C2Tab caseData={caseData} analysisResults={analysisResults} isMockCase={isMockCase} />
      )}

      {activeTab === "vulns" && (
        <VulnsTab caseData={caseData} analysisResults={analysisResults} isMockCase={isMockCase} />
      )}

      {activeTab === "reports" && (
        <ReportsTab caseData={caseData} caseReports={caseReports} analysisResults={analysisResults} />
      )}
    </div>
  );
}
