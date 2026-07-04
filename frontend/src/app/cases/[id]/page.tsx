import ClientPage from "./ClientPage";
export const dynamic = 'force-dynamic';

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ClientPage caseId={resolvedParams.id} />;
}


export const metadata = {
  title: "APEX-X | [id]",
  description: "APEX-X [id] Page",
};
