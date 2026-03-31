import type { Metadata } from "next";
import RegisterForm from "./RegisterForm";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dormantfile.co.uk";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create a DormantFile account to file your dormant company accounts and nil CT600 tax returns online.",
  alternates: { canonical: `${BASE_URL}/register` },
  openGraph: {
    title: "Create Account | DormantFile",
    description:
      "Create a DormantFile account to file your dormant company accounts and nil CT600 tax returns online.",
    type: "website",
    siteName: "DormantFile",
  },
};

export default function RegisterPage() {
  return <RegisterForm />;
}
