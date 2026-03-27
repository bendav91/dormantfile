import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import CompanyForm from "@/components/company-form";
import { ShieldCheck } from "lucide-react";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const company = await prisma.company.findUnique({
    where: { userId: session.user.id },
  });

  if (company) {
    redirect("/dashboard");
  }

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#1E293B",
            margin: "0 0 12px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Add your company
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "#475569",
            margin: 0,
            lineHeight: "1.6",
          }}
        >
          Enter your company details below. We use this information to prepare and file your nil CT600 return with HMRC on time, every year.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          padding: "14px 16px",
          backgroundColor: "#EFF6FF",
          border: "1px solid #BFDBFE",
          borderRadius: "8px",
          marginBottom: "28px",
        }}
      >
        <ShieldCheck size={18} color="#2563EB" strokeWidth={2} style={{ flexShrink: 0, marginTop: "1px" }} />
        <p style={{ fontSize: "14px", color: "#1E40AF", margin: 0, lineHeight: "1.5" }}>
          Your data is protected with industry-standard encryption. We only use these details to file your CT600 with HMRC.
        </p>
      </div>

      <CompanyForm />
    </div>
  );
}
