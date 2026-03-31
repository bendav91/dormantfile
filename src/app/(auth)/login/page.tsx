import type { Metadata } from "next";
import LoginForm from "./LoginForm";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dormantfile.co.uk";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your DormantFile account to file dormant company accounts and nil CT600 tax returns.",
  alternates: { canonical: `${BASE_URL}/login` },
  openGraph: {
    title: "Sign In | DormantFile",
    description:
      "Sign in to your DormantFile account to file dormant company accounts and nil CT600 tax returns.",
    type: "website",
    siteName: "DormantFile",
  },
};

export default function LoginPage() {
  return <LoginForm />;
}
