"use client";

import { useState, useEffect, useRef } from "react";
import { validateUTR } from "@/lib/utils";
import { Loader2, Building2, Hash, FileDigit, Calendar, CheckCircle2, AlertTriangle } from "lucide-react";
import { isFilingLive } from "@/lib/launch-mode";
import { cn } from "@/lib/cn";

interface FormErrors {
  companyRegistrationNumber?: string;
  uniqueTaxReference?: string;
  dormancyAttestation?: string;
  general?: string;
}

// Bump when the disclaimer wording below changes — stored against the company
// so we have a record of exactly which text the user agreed to.
const DORMANCY_ATTESTATION_VERSION = "v1";

const ACCOUNTS_TYPE_LABELS: Record<string, string> = {
  dormant: "Dormant",
  "micro-entity": "Micro-entity",
  small: "Small",
  medium: "Medium",
  full: "Full",
  "group": "Group",
  "interim": "Interim",
  "initial": "Initial",
  "total-exemption-full": "Total exemption full",
  "total-exemption-small": "Total exemption small",
  "audit-exemption-subsidiary": "Audit exemption subsidiary",
  "filleted": "Filleted",
};

function formatAccountsType(type: string): string {
  return ACCOUNTS_TYPE_LABELS[type] ?? type.replace(/-/g, " ");
}

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
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
      >
        <span className="text-primary">
          <Icon size={15} color="currentColor" strokeWidth={2} />
        </span>
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[13px] text-danger m-0">{error}</p>
      ) : (
        <p className="text-[13px] text-body m-0">{helpText}</p>
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
  autoComplete,
  spellCheck,
}: {
  id: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  maxLength?: number;
  hasError?: boolean;
  autoComplete?: string;
  spellCheck?: boolean;
}) {
  return (
    <input
      id={id}
      name={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      autoComplete={autoComplete}
      spellCheck={spellCheck}
      className={cn(
        "focus-ring-input w-full py-3 px-4 border border-muted rounded-lg text-base text-foreground bg-card transition-colors duration-200 box-border",
        "focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_12%,transparent)]",
        hasError && "border-danger"
      )}
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
  const [sicCodes, setSicCodes] = useState<string[]>([]);
  const [lastAccountsType, setLastAccountsType] = useState<string | null>(null);
  const [lastAccountsMadeUpTo, setLastAccountsMadeUpTo] = useState<string | null>(null);
  const [dormancySignal, setDormancySignal] = useState<
    "dormant" | "non-dormant" | "unknown" | null
  >(null);
  const [dormancyAccepted, setDormancyAccepted] = useState(false);
  const [deletedWarning, setDeletedWarning] = useState<{ companyName: string; deletedAt: string } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<
    "idle" | "loading" | "found" | "not_found" | "dissolved" | "unavailable" | "error"
  >("idle");
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
        setSicCodes([]);
        setLastAccountsType(null);
        setLastAccountsMadeUpTo(null);
        setDormancySignal(null);
        setDormancyAccepted(false);
        setDeletedWarning(null);
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
        setSicCodes(Array.isArray(data.sicCodes) ? data.sicCodes : []);
        setLastAccountsType(data.lastAccountsType ?? null);
        setLastAccountsMadeUpTo(data.lastAccountsMadeUpTo ?? null);
        setDormancySignal(data.dormancySignal ?? null);
        setDormancyAccepted(false);
        if (data.shareCapitalPence != null && data.shareCapitalPence > 0) {
          setShareCapitalPounds(String(data.shareCapitalPence / 100));
        }
        setLookupStatus("found");

        // Non-blocking check for previously deleted company with same CRN
        try {
          const delRes = await fetch(`/api/company/check-deleted?number=${encodeURIComponent(num)}`);
          if (delRes.ok) {
            const delData = await delRes.json();
            if (delData.hasDeleted) {
              setDeletedWarning({ companyName: delData.companyName, deletedAt: delData.deletedAt });
            } else {
              setDeletedWarning(null);
            }
          }
        } catch {
          // Silently ignore — this check is informational only
        }
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
      errs.companyRegistrationNumber =
        "Enter a valid company number that can be verified with Companies House.";
    } else if (!periodEndOn) {
      errs.companyRegistrationNumber =
        "Companies House has no upcoming accounting period for this company. It may already be filed or the company may be dissolved.";
    }
    if (registeredForCorpTax) {
      if (!uniqueTaxReference.trim()) {
        errs.uniqueTaxReference = "UTR is required for companies registered for Corporation Tax.";
      } else if (!validateUTR(uniqueTaxReference)) {
        errs.uniqueTaxReference = "UTR must be exactly 10 digits.";
      }
    }
    if (lookupStatus === "found" && !dormancyAccepted) {
      errs.dormancyAttestation =
        "You must confirm the dormancy declaration before adding this company.";
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
          dormancyAttestationAccepted: dormancyAccepted,
          dormancyAttestationVersion: DORMANCY_ATTESTATION_VERSION,
        }),
      });

      if (!companyRes.ok) {
        const data = await companyRes.json();
        setErrors({ general: data.error || "Failed to save company. Please try again." });
        setLoading(false);
        return;
      }

      // First company: go to plan picker (if filing is live). Otherwise: dashboard.
      if (isFirstCompany && isFilingLive()) {
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
      <div className="p-5 sm:p-8 bg-card rounded-xl shadow-md flex flex-col gap-7">
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
            autoComplete="off"
            spellCheck={false}
          />
          {lookupStatus === "loading" && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-body">
                <Loader2
                  size={13}
                  color="currentColor"
                  strokeWidth={2}
                  className="animate-spin"
                />
              </span>
              <span className="text-[13px] text-body">
                {"Looking up company\u2026"}
              </span>
            </div>
          )}
          {lookupStatus === "found" && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-success">
                <CheckCircle2 size={13} color="currentColor" strokeWidth={2} />
              </span>
              <span className="text-[13px] text-success">
                Found: {companyName}
              </span>
            </div>
          )}
          {lookupStatus === "dissolved" && (
            <div className="mt-0.5">
              <span className="text-[13px] text-danger">
                {companyName} has been dissolved and cannot be added. DormantFile is for active
                dormant companies only.
              </span>
            </div>
          )}
          {lookupStatus === "not_found" && (
            <div className="mt-0.5">
              <span className="text-[13px] text-danger">
                No company found with that number.
              </span>
            </div>
          )}
          {lookupStatus === "error" && (
            <div className="mt-0.5">
              <span className="text-[13px] text-danger">
                Lookup failed - please try again or check the number.
              </span>
            </div>
          )}
          {lookupStatus === "unavailable" && (
            <div className="mt-0.5">
              <span className="text-[13px] text-due-soon">
                Companies House lookup is currently unavailable. Please try again later.
              </span>
            </div>
          )}
        </FormField>

        {lookupStatus === "found" && companyName && (
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <span className="text-primary">
                <Building2 size={15} color="currentColor" strokeWidth={2} />
              </span>
              Company Name
            </label>
            <div className="py-3 px-4 bg-page border border-border rounded-lg text-base text-foreground font-medium">
              {companyName}
            </div>
            <p className="text-[13px] text-body m-0">
              Verified from Companies House. This cannot be edited.
            </p>
          </div>
        )}

        {deletedWarning && lookupStatus === "found" && (
          <div className="flex items-start gap-2.5 py-3.5 px-4 bg-warning-bg border border-warning-border rounded-lg mt-2">
            <AlertTriangle size={18} className="text-warning shrink-0 mt-px" />
            <div>
              <p className="text-sm text-warning-text m-0 font-semibold">
                Previously removed company
              </p>
              <p className="text-[13px] text-warning-text mt-1 mb-0 mx-0">
                You removed {deletedWarning.companyName} on {new Date(deletedWarning.deletedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
                Adding it again will restore your previous filing history.
              </p>
            </div>
          </div>
        )}

        {lookupStatus === "found" && periodStartOn && periodEndOn && (
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <span className="text-primary">
                <Calendar size={15} color="currentColor" strokeWidth={2} />
              </span>
              Accounting Period
            </label>
            <div className="py-3 px-4 bg-page border border-border rounded-lg text-base text-foreground font-medium">
              {formatDisplayDate(periodStartOn)} &ndash; {formatDisplayDate(periodEndOn)}
            </div>
            <p className="text-[13px] text-body m-0">
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
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2.5 text-sm font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={registeredForCorpTax}
                  onChange={(e) => {
                    setRegisteredForCorpTax(e.target.checked);
                    if (!e.target.checked) setUniqueTaxReference("");
                  }}
                  className="w-[18px] h-[18px] accent-primary"
                />
                Is this company registered for Corporation Tax?
              </label>
              <p className="text-[13px] text-body m-0 pl-7">
                If your dormant company is still registered for Corporation Tax, you can provide
                your company&apos;s UTR from HMRC.
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
                  autoComplete="off"
                  spellCheck={false}
                />
              </FormField>
            )}
          </>
        )}

        {lookupStatus === "found" && (
          <div className="flex flex-col gap-4">
            <div
              className={cn(
                "flex flex-col gap-3 py-4 px-4 rounded-lg border",
                dormancySignal === "dormant" && "bg-success-bg border-success-border",
                dormancySignal === "non-dormant" && "bg-warning-bg border-warning-border",
                (dormancySignal === "unknown" || dormancySignal == null) &&
                  "bg-page border-border"
              )}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "shrink-0 mt-px",
                    dormancySignal === "dormant" && "text-success",
                    dormancySignal === "non-dormant" && "text-warning",
                    (dormancySignal === "unknown" || dormancySignal == null) && "text-body"
                  )}
                >
                  {dormancySignal === "dormant" ? (
                    <CheckCircle2 size={18} color="currentColor" strokeWidth={2} />
                  ) : (
                    <AlertTriangle size={18} color="currentColor" strokeWidth={2} />
                  )}
                </span>
                <div className="flex flex-col gap-1">
                  <p
                    className={cn(
                      "text-sm font-semibold m-0",
                      dormancySignal === "dormant" && "text-success",
                      dormancySignal === "non-dormant" && "text-warning-text",
                      (dormancySignal === "unknown" || dormancySignal == null) &&
                        "text-foreground"
                    )}
                  >
                    {dormancySignal === "dormant" &&
                      "Companies House records show the last accounts were filed as dormant."}
                    {dormancySignal === "non-dormant" &&
                      "Companies House records show the last accounts were NOT filed as dormant."}
                    {(dormancySignal === "unknown" || dormancySignal == null) &&
                      "No accounts have been filed at Companies House yet."}
                  </p>
                  <p
                    className={cn(
                      "text-[13px] m-0",
                      dormancySignal === "non-dormant" ? "text-warning-text" : "text-body"
                    )}
                  >
                    {dormancySignal === "dormant" &&
                      "This is a positive signal, but it does not guarantee the company is dormant for the period you are about to file. You are responsible for confirming that below."}
                    {dormancySignal === "non-dormant" &&
                      `The most recent accounts were filed as ${
                        lastAccountsType ? formatAccountsType(lastAccountsType).toLowerCase() : "non-dormant"
                      }. If the company has since become dormant you can still proceed, but you must be certain it had no significant accounting transactions in the period you are filing.`}
                    {(dormancySignal === "unknown" || dormancySignal == null) &&
                      "Companies House has no prior accounts to indicate dormancy either way. You are responsible for confirming the company is genuinely dormant below."}
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 m-0">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[12px] uppercase tracking-wide text-muted m-0">
                    Last accounts type
                  </dt>
                  <dd className="text-sm text-foreground m-0">
                    {lastAccountsType
                      ? formatAccountsType(lastAccountsType)
                      : "None filed"}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[12px] uppercase tracking-wide text-muted m-0">
                    Last accounts made up to
                  </dt>
                  <dd className="text-sm text-foreground m-0">
                    {lastAccountsMadeUpTo
                      ? formatDisplayDate(lastAccountsMadeUpTo)
                      : "—"}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:col-span-2">
                  <dt className="text-[12px] uppercase tracking-wide text-muted m-0">
                    SIC codes (nature of business)
                  </dt>
                  <dd className="text-sm text-foreground m-0">
                    {sicCodes.length > 0 ? (
                      sicCodes.join(", ") +
                      (sicCodes.includes("99999")
                        ? "  — 99999 indicates a dormant company"
                        : "")
                    ) : (
                      "Not recorded"
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-col gap-2 py-4 px-4 bg-inset border border-border rounded-lg">
              <label
                htmlFor="dormancyAttestation"
                className="flex items-start gap-2.5 text-sm text-foreground cursor-pointer"
              >
                <input
                  id="dormancyAttestation"
                  type="checkbox"
                  checked={dormancyAccepted}
                  onChange={(e) => setDormancyAccepted(e.target.checked)}
                  className="w-[18px] h-[18px] mt-0.5 shrink-0 accent-primary"
                />
                <span className="flex flex-col gap-2">
                  <span className="font-semibold">
                    I confirm this company had no significant accounting transactions in this
                    accounting period and is genuinely dormant.
                  </span>
                  <span className="text-[13px] text-body">
                    I understand DormantFile is not accountancy software and will only file nil
                    returns for both annual accounts (Companies House) and CT600 (HMRC) filings.
                  </span>
                  <span className="text-[13px] text-body">
                    If you are not sure whether your company is genuinely dormant, or are not sure
                    what a dormant company means, please speak with an accountancy professional or
                    Companies House before using this tool.
                  </span>
                  <span className="text-[13px] text-body">
                    DormantFile is not responsible for the submission of nil accounts for genuinely
                    active and trading companies.
                  </span>
                </span>
              </label>
              {errors.dormancyAttestation && (
                <p className="text-[13px] text-danger m-0 pl-7">
                  {errors.dormancyAttestation}
                </p>
              )}
            </div>
          </div>
        )}

        {errors.general && (
          <div
            role="alert"
            className="py-3 px-4 bg-danger-bg border border-danger-border rounded-lg text-sm text-danger"
          >
            {errors.general}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={cn(
            "focus-ring py-3 px-6 rounded-lg font-semibold text-base border-0 transition-all duration-200 flex items-center justify-center gap-2 w-full text-card hover:opacity-90 hover:-translate-y-px",
            loading ? "bg-disabled cursor-not-allowed" : "bg-cta cursor-pointer"
          )}
        >
          {loading && (
            <Loader2 size={18} strokeWidth={2} className="animate-spin" />
          )}
          {loading ? "Processing\u2026" : isFirstCompany ? "Continue to Payment" : "Add Company"}
        </button>

        <p className="text-[13px] text-muted text-center m-0">
          Your information is encrypted and securely stored. We never share your data with third
          parties.
        </p>
      </div>
    </form>
  );
}
