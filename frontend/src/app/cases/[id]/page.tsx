import ClientPage from "./ClientPage";
import { REAL_CASES } from "@/services/realData";

export async function generateStaticParams() {
  return REAL_CASES.map((c) => ({
    id: c.id,
  }));
}

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ClientPage caseId={resolvedParams.id} />;
}

