import ClientPage from "./ClientPage";
import { MOCK_CASES } from "@/services/mockData";

export function generateStaticParams() {
  return MOCK_CASES.map((caseData) => ({
    id: caseData.id,
  }));
}

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ClientPage caseId={resolvedParams.id} />;
}
