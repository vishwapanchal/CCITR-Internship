"use client";

import { use } from "react";
import ClientPage from "./ClientPage";

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return <ClientPage caseId={resolvedParams.id} />;
}
