import type { Metadata } from "next";
import ForgotPasswordForm from "./ForgotPasswordForm";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dormantfile.co.uk";

export const metadata: Metadata = {
  title: "Reset Password",
  description:
    "Reset your DormantFile password. Enter your email to receive a password reset link.",
  alternates: { canonical: `${BASE_URL}/forgot-password` },
  openGraph: {
    title: "Reset Password | DormantFile",
    description:
      "Reset your DormantFile password. Enter your email to receive a password reset link.",
    type: "website",
    siteName: "DormantFile",
  },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
