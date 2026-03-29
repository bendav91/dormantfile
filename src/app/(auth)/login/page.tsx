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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <BrandPanel variant="returning" />
      <div className="flex flex-col" style={{ backgroundColor: "var(--color-bg-card)" }}>
        <BrandPanelMobile />
        <FormPanel>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>
            Sign in
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
            Welcome back to DormantFile
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
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

            <div>
              <AuthInput
                id="password"
                label="Password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <div className="mt-1 text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm hover:underline"
                  style={{ color: "var(--color-primary)" }}
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <AuthError message={error} />

            <AuthButton type="submit" loading={loading} loadingText="Signing in…">
              Sign in
            </AuthButton>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium hover:underline"
              style={{ color: "var(--color-primary)" }}
            >
              Create one
            </Link>
          </p>
        </FormPanel>
      </div>
    </>
  );
}
