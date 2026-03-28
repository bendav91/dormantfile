"use client";

import { useState, useEffect, useRef } from "react";
import { validateUTR } from "@/lib/utils";
import { Loader2, Building2, Hash, FileDigit, Calendar, CheckCircle2 } from "lucide-react";

interface FormErrors {
  companyRegistrationNumber?: string;
  uniqueTaxReference?: string;
  general?: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#94A3B8",
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

function formatDisplayDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CompanyForm({ isFirstCompany = true }: { isFirstCompany?: boolean }) {
  const [companyName, setCompanyName] = useState("");
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState("");
  const [periodStartOn, setPeriodStartOn] = useState<string | null>(null);
  const [periodEndOn, setPeriodEndOn] = useState<string | null>(null);
  const [uniqueTaxReference, setUniqueTaxReference] = useState("");
  const [registeredForCorpTax, setRegisteredForCorpTax] = useState(false);
  const [shareCapitalPounds, setShareCapitalPounds] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "found" | "not_found" | "dissolved" | "unavailable" | "error">("idle");
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (lookupTimer.current) clearTimeout(lookupTimer.current);

    const num = companyRegistrationNumber.trim();
    if (num.length < 6) {
      lookupTimer.current = setTimeout(() => {
        setLookupStatus("idle");
        setCompanyName("");
        setPeriodStartOn(null);
        setPeriodEndOn(null);
      }, 0);
      return;
    }

    lookupTimer.current = setTimeout(async () => {
      setLookupStatus("loading");
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
        if (data.companyStatus === "dissolved" || data.companyStatus === "converted-closed") {
          setCompanyName(data.companyName);
          setLookupStatus("dissolved");
          return;
        }
        setCompanyName(data.companyName);
        setPeriodStartOn(data.periodStartOn);
        setPeriodEndOn(data.periodEndOn);
        if (data.shareCapitalPence != null && data.shareCapitalPence > 0) {
          setShareCapitalPounds(String(data.shareCapitalPence / 100));
        }
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
    if (!companyRegistrationNumber.trim()) {
      errs.companyRegistrationNumber = "Registration number is required.";
    } else if (companyRegistrationNumber.length > 8) {
      errs.companyRegistrationNumber = "Registration number must be 8 characters or fewer.";
    } else if (lookupStatus !== "found") {
      errs.companyRegistrationNumber = "Enter a valid company number that can be verified with Companies House.";
    } else if (!periodEndOn) {
      errs.companyRegistrationNumber = "Companies House has no upcoming accounting period for this company. It may already be filed or the company may be dissolved.";
    }
    if (registeredForCorpTax) {
      if (!uniqueTaxReference.trim()) {
        errs.uniqueTaxReference = "UTR is required for companies registered for Corporation Tax.";
      } else if (!validateUTR(uniqueTaxReference)) {
        errs.uniqueTaxReference = "UTR must be exactly 10 digits.";
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
          companyRegistrationNumber,
          uniqueTaxReference: registeredForCorpTax ? uniqueTaxReference : undefined,
          registeredForCorpTax,
          shareCapital: shareCapitalPounds ? Math.round(parseFloat(shareCapitalPounds) * 100) : 0,
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
          {lookupStatus === "dissolved" && (
            <div style={{ marginTop: "2px" }}>
              <span style={{ fontSize: "13px", color: "#DC2626" }}>
                {companyName} has been dissolved and cannot be added. DormantFile is for active dormant companies only.
              </span>
            </div>
          )}
          {lookupStatus === "not_found" && (
            <div style={{ marginTop: "2px" }}>
              <span style={{ fontSize: "13px", color: "#DC2626" }}>No company found with that number.</span>
            </div>
          )}
          {lookupStatus === "error" && (
            <div style={{ marginTop: "2px" }}>
              <span style={{ fontSize: "13px", color: "#DC2626" }}>Lookup failed - please try again or check the number.</span>
            </div>
          )}
          {lookupStatus === "unavailable" && (
            <div style={{ marginTop: "2px" }}>
              <span style={{ fontSize: "13px", color: "#D97706" }}>Companies House lookup is currently unavailable. Please try again later.</span>
            </div>
          )}
        </FormField>

        {lookupStatus === "found" && companyName && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#1E293B",
              }}
            >
              <Building2 size={15} color="#2563EB" strokeWidth={2} />
              Company Name
            </label>
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: "#F8FAFC",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "#E2E8F0",
                borderRadius: "8px",
                fontSize: "16px",
                color: "#1E293B",
                fontWeight: 500,
              }}
            >
              {companyName}
            </div>
            <p style={{ fontSize: "13px", color: "#64748B", margin: 0 }}>
              Verified from Companies House. This cannot be edited.
            </p>
          </div>
        )}

        {lookupStatus === "found" && periodStartOn && periodEndOn && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#1E293B",
              }}
            >
              <Calendar size={15} color="#2563EB" strokeWidth={2} />
              Accounting Period
            </label>
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: "#F8FAFC",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "#E2E8F0",
                borderRadius: "8px",
                fontSize: "16px",
                color: "#1E293B",
                fontWeight: 500,
              }}
            >
              {formatDisplayDate(periodStartOn)} &ndash; {formatDisplayDate(periodEndOn)}
            </div>
            <p style={{ fontSize: "13px", color: "#64748B", margin: 0 }}>
              Next filing period from Companies House. This cannot be edited.
            </p>
          </div>
        )}

        {lookupStatus === "found" && (
          <FormField
            id="shareCapital"
            label="Share capital (£)"
            helpText="The total nominal value of shares issued by the company. Most dormant companies have £1. Leave as 0 if the company has no share capital."
            icon={Hash}
          >
            <FocusableInput
              id="shareCapital"
              type="number"
              value={shareCapitalPounds}
              onChange={(e) => setShareCapitalPounds(e.target.value)}
              placeholder="e.g. 1"
            />
          </FormField>
        )}

        {lookupStatus === "found" && (
          <>
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
                If your dormant company is still registered for Corporation Tax, you can provide your company&apos;s UTR from HMRC.
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
          </>
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
