import ClientPage from "./ClientPage";
import { REAL_CASES } from "@/services/realData";

export function generateStaticParams() {
  return REAL_CASES.map((caseData) => ({
    id: caseData.id,
  }));
}

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ClientPage caseId={resolvedParams.id} />;
}
