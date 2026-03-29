"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BrandPanel,
  BrandPanelMobile,
  FormPanel,
  AuthInput,
  AuthButton,
  AuthError,
} from "@/components/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Registration failed. Please try again.");
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but sign-in failed. Please try logging in.");
        router.push("/login");
      } else {
        router.push("/onboarding");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <BrandPanel variant="register" />
      <div className="flex flex-col" style={{ backgroundColor: "var(--color-bg-card)" }}>
        <BrandPanelMobile />
        <FormPanel>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>
            Create your account
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
            Get started in minutes
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AuthInput
              id="name"
              label="Full name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
            />

            <AuthInput
              id="email"
              label="Email address"
              type="email"
              required
              autoComplete="email"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <AuthInput
              id="password"
              label="Password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              helperText="Must be at least 8 characters"
            />

            <AuthError message={error} />

            <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              By creating an account, you agree to our{" "}
              <Link
                href="/terms"
                className="underline hover:no-underline"
                style={{ color: "var(--color-primary)" }}
              >
                Terms of Service
              </Link>
              ,{" "}
              <Link
                href="/privacy"
                className="underline hover:no-underline"
                style={{ color: "var(--color-primary)" }}
              >
                Privacy Policy
              </Link>
              , and{" "}
              <Link
                href="/acceptable-use"
                className="underline hover:no-underline"
                style={{ color: "var(--color-primary)" }}
              >
                Acceptable Use Policy
              </Link>
              .
            </p>

            <AuthButton type="submit" loading={loading} loadingText="Creating account…">
              Create account
            </AuthButton>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium hover:underline"
              style={{ color: "var(--color-primary)" }}
            >
              Sign in
            </Link>
          </p>
        </FormPanel>
      </div>
    </>
  );
}
