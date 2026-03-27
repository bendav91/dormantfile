"use client";

import { useState, useEffect, useRef } from "react";
import { validateUTR } from "@/lib/utils";
import { Loader2, Building2, Hash, FileDigit, Calendar, CheckCircle2 } from "lucide-react";

interface FormErrors {
  companyName?: string;
  companyRegistrationNumber?: string;
  uniqueTaxReference?: string;
  accountingPeriodEnd?: string;
  general?: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  border: "1px solid #E2E8F0",
  borderRadius: "8px",
  fontSize: "16px",
  color: "#1E293B",
  backgroundColor: "#ffffff",
  outline: "none",
  transition: "all 200ms",
  boxSizing: "border-box",
};

const inputFocusStyle: React.CSSProperties = {
  borderColor: "#2563EB",
  boxShadow: "0 0 0 3px #2563EB20",
};

function FormField({
  id,
  label,
  helpText,
  error,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  helpText: string;
  error?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label
        htmlFor={id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "14px",
          fontWeight: 600,
          color: "#1E293B",
        }}
      >
        <Icon size={15} color="#2563EB" strokeWidth={2} />
        {label}
      </label>
      {children}
      {error ? (
        <p style={{ fontSize: "13px", color: "#DC2626", margin: 0 }}>{error}</p>
      ) : (
        <p style={{ fontSize: "13px", color: "#64748B", margin: 0 }}>{helpText}</p>
      )}
    </div>
  );
}

function FocusableInput({
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  maxLength,
  hasError,
}: {
  id: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  maxLength?: number;
  hasError?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <input
      id={id}
      name={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputStyle,
        ...(focused ? inputFocusStyle : {}),
        ...(hasError ? { borderColor: "#DC2626" } : {}),
      }}
    />
  );
}

export default function CompanyForm({ isFirstCompany = true }: { isFirstCompany?: boolean }) {
  const [companyName, setCompanyName] = useState("");
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState("");
  const [uniqueTaxReference, setUniqueTaxReference] = useState("");
  const [accountingPeriodEnd, setAccountingPeriodEnd] = useState("");
  const [registeredForCorpTax, setRegisteredForCorpTax] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "found" | "not_found" | "unavailable" | "error">("idle");
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (lookupTimer.current) clearTimeout(lookupTimer.current);

    const num = companyRegistrationNumber.trim();
    if (num.length < 6) {
      setLookupStatus("idle");
      return;
    }

    setLookupStatus("loading");
    lookupTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/company/lookup?number=${encodeURIComponent(num)}`);
        if (res.status === 503) {
          setLookupStatus("unavailable");
          return;
        }
        if (res.status === 404) {
          setLookupStatus("not_found");
          return;
        }
        if (!res.ok) {
          setLookupStatus("error");
          return;
        }
        const data = await res.json();
        setCompanyName(data.companyName);
        setLookupStatus("found");
      } catch {
        setLookupStatus("error");
      }
    }, 500);

    return () => {
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
    };
  }, [companyRegistrationNumber]);

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!companyName.trim()) {
      errs.companyName = "Company name is required.";
    }
    if (!companyRegistrationNumber.trim()) {
      errs.companyRegistrationNumber = "Registration number is required.";
    } else if (companyRegistrationNumber.length > 8) {
      errs.companyRegistrationNumber = "Registration number must be 8 characters or fewer.";
    }
    if (registeredForCorpTax) {
      if (!uniqueTaxReference.trim()) {
        errs.uniqueTaxReference = "UTR is required for companies registered for Corporation Tax.";
      } else if (!validateUTR(uniqueTaxReference)) {
        errs.uniqueTaxReference = "UTR must be exactly 10 digits.";
      }
    }
    if (!accountingPeriodEnd) {
      errs.accountingPeriodEnd = "Accounting period end date is required.";
    } else {
      const periodEnd = new Date(accountingPeriodEnd);
      const now = new Date();
      const twoYearsAgo = new Date();
      twoYearsAgo.setUTCFullYear(twoYearsAgo.getUTCFullYear() - 2);

      if (periodEnd > now) {
        errs.accountingPeriodEnd = "Accounting period end date cannot be in the future.";
      } else if (periodEnd < twoYearsAgo) {
        errs.accountingPeriodEnd = "Accounting period end date cannot be more than 2 years in the past.";
      }
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const companyRes = await fetch("/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          companyRegistrationNumber,
          uniqueTaxReference: registeredForCorpTax ? uniqueTaxReference : undefined,
          accountingPeriodEnd,
          registeredForCorpTax,
        }),
      });

      if (!companyRes.ok) {
        const data = await companyRes.json();
        setErrors({ general: data.error || "Failed to save company. Please try again." });
        setLoading(false);
        return;
      }

      // First company: go to plan picker. Additional companies: go to dashboard.
      if (isFirstCompany) {
        window.location.href = "/choose-plan";
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setErrors({ general: "An unexpected error occurred. Please try again." });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "32px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: "28px",
        }}
      >
        <FormField
          id="companyRegistrationNumber"
          label="Companies House Registration Number"
          helpText="Your 8-character company number from Companies House (e.g. 12345678 or SC123456)."
          error={errors.companyRegistrationNumber}
          icon={Hash}
        >
          <FocusableInput
            id="companyRegistrationNumber"
            value={companyRegistrationNumber}
            onChange={(e) => setCompanyRegistrationNumber(e.target.value)}
            placeholder="e.g. 12345678"
            maxLength={8}
            hasError={!!errors.companyRegistrationNumber}
          />
          {lookupStatus === "loading" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
              <Loader2 size={13} color="#64748B" strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: "13px", color: "#64748B" }}>Looking up company...</span>
            </div>
          )}
          {lookupStatus === "found" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
              <CheckCircle2 size={13} color="#16A34A" strokeWidth={2} />
              <span style={{ fontSize: "13px", color: "#16A34A" }}>Found: {companyName}</span>
            </div>
          )}
          {lookupStatus === "not_found" && (
            <div style={{ marginTop: "2px" }}>
              <span style={{ fontSize: "13px", color: "#DC2626" }}>No company found with that number.</span>
            </div>
          )}
          {lookupStatus === "error" && (
            <div style={{ marginTop: "2px" }}>
              <span style={{ fontSize: "13px", color: "#64748B" }}>Lookup failed — enter company name manually.</span>
            </div>
          )}
        </FormField>

        <FormField
          id="companyName"
          label="Company Name"
          helpText="The registered name of your company as it appears at Companies House."
          error={errors.companyName}
          icon={Building2}
        >
          <FocusableInput
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Acme Ltd"
            hasError={!!errors.companyName}
          />
        </FormField>

        <FormField
          id="accountingPeriodEnd"
          label="Accounting Period End Date"
          helpText="The last day of your company's accounting period — usually found on your confirmation statement or HMRC correspondence."
          error={errors.accountingPeriodEnd}
          icon={Calendar}
        >
          <FocusableInput
            id="accountingPeriodEnd"
            type="date"
            value={accountingPeriodEnd}
            onChange={(e) => setAccountingPeriodEnd(e.target.value)}
            placeholder=""
            hasError={!!errors.accountingPeriodEnd}
          />
        </FormField>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#1E293B",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={registeredForCorpTax}
              onChange={(e) => {
                setRegisteredForCorpTax(e.target.checked);
                if (!e.target.checked) setUniqueTaxReference("");
              }}
              style={{ width: "18px", height: "18px", accentColor: "#2563EB" }}
            />
            Is this company registered for Corporation Tax?
          </label>
          <p style={{ fontSize: "13px", color: "#64748B", margin: 0, paddingLeft: "28px" }}>
            If your company has a UTR from HMRC, tick this box. If you&apos;re unsure, you probably don&apos;t need it — most newly incorporated dormant companies are not registered.
          </p>
        </div>

        {registeredForCorpTax && (
          <FormField
            id="uniqueTaxReference"
            label="Unique Tax Reference (UTR)"
            helpText="Your 10-digit Unique Tax Reference from HMRC. You can find this on correspondence from HMRC or in your HMRC online account."
            error={errors.uniqueTaxReference}
            icon={FileDigit}
          >
            <FocusableInput
              id="uniqueTaxReference"
              value={uniqueTaxReference}
              onChange={(e) => setUniqueTaxReference(e.target.value)}
              placeholder="e.g. 1234567890"
              maxLength={10}
              hasError={!!errors.uniqueTaxReference}
            />
          </FormField>
        )}

        {errors.general && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#DC2626",
            }}
          >
            {errors.general}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: loading ? "#CBD5E1" : "#F97316",
            color: "#ffffff",
            padding: "12px 24px",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "16px",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 200ms",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            width: "100%",
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
          }}
        >
          {loading && <Loader2 size={18} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />}
          {loading ? "Processing..." : isFirstCompany ? "Continue to Payment" : "Add Company"}
        </button>

        <p style={{ fontSize: "13px", color: "#94A3B8", textAlign: "center", margin: 0 }}>
          Your information is encrypted and securely stored. We never share your data with third parties.
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </form>
  );
}
