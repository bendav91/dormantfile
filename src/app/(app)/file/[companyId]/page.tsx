import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ companyId: string }>;
}

export default async function FilingSelectorRedirect({ params }: PageProps) {
  const { companyId } = await params;
  redirect(`/company/${companyId}`);
}
