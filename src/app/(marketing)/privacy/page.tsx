import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - DormantFile",
  description: "How DormantFile collects, uses, and protects your personal data.",
};

const sectionHeading: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#1E293B",
  margin: "40px 0 12px 0",
  letterSpacing: "-0.01em",
};

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.7",
  color: "#475569",
  margin: "0 0 16px 0",
};

const listItem: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.7",
  color: "#475569",
  marginBottom: "8px",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <h1
        style={{
          fontSize: "36px",
          fontWeight: 700,
          color: "#1E293B",
          margin: "0 0 8px 0",
          letterSpacing: "-0.02em",
        }}
      >
        Privacy Policy
      </h1>
      <p style={{ fontSize: "14px", color: "#94A3B8", margin: "0 0 40px 0" }}>
        Last updated: 27 March 2026
      </p>

      <p style={paragraph}>
        DormantFile (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed
        to protecting your personal data. This policy explains what information
        we collect, why we collect it, and how we keep it safe. It applies to
        all users of the DormantFile website and service.
      </p>

      <h2 style={sectionHeading}>1. Data controller</h2>
      <p style={paragraph}>
        DormantFile is the data controller for the personal data described in
        this policy. If you have questions about how we handle your data, contact
        us at{" "}
        <a href="mailto:privacy@dormantfile.co.uk" style={{ color: "#2563EB" }}>
          privacy@dormantfile.co.uk
        </a>.
      </p>

      <h2 style={sectionHeading}>2. What data we collect</h2>
      <p style={paragraph}>We collect the following categories of personal data:</p>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={listItem}>
          <strong style={{ color: "#1E293B" }}>Account information</strong> —
          your name, email address, and a securely hashed password.
        </li>
        <li style={listItem}>
          <strong style={{ color: "#1E293B" }}>Company details</strong> —
          company name, Companies House registration number, Unique Tax
          Reference (UTR), and accounting period dates.
        </li>
        <li style={listItem}>
          <strong style={{ color: "#1E293B" }}>Filing records</strong> —
          submission timestamps, HMRC correlation IDs, and response payloads
          for your CT600 filings.
        </li>
        <li style={listItem}>
          <strong style={{ color: "#1E293B" }}>Payment information</strong> —
          we do not store card details. All payment processing is handled by
          Stripe, who act as an independent data controller for payment data.
        </li>
        <li style={listItem}>
          <strong style={{ color: "#1E293B" }}>HMRC Gateway credentials</strong> —
          your Government Gateway user ID and password are used{" "}
          <strong style={{ color: "#1E293B" }}>only at the moment of filing</strong>{" "}
          to authenticate with HMRC. They are transmitted directly to HMRC over
          TLS and are <strong style={{ color: "#1E293B" }}>never written to our database</strong>.
        </li>
      </ul>

      <h2 style={sectionHeading}>3. How we use your data</h2>
      <p style={paragraph}>We use your personal data to:</p>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={listItem}>Create and manage your account.</li>
        <li style={listItem}>Prepare and submit your nil CT600 return to HMRC on your behalf.</li>
        <li style={listItem}>Send you email reminders before your filing deadline.</li>
        <li style={listItem}>Send you filing confirmation emails after successful submission.</li>
        <li style={listItem}>Process subscription payments via Stripe.</li>
        <li style={listItem}>Maintain a record of your filing history for your reference.</li>
      </ul>

      <h2 style={sectionHeading}>4. Legal basis for processing</h2>
      <p style={paragraph}>
        We process your personal data on the following legal bases under UK GDPR:
      </p>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={listItem}>
          <strong style={{ color: "#1E293B" }}>Contract performance</strong> —
          processing is necessary to provide the filing service you have
          subscribed to.
        </li>
        <li style={listItem}>
          <strong style={{ color: "#1E293B" }}>Legitimate interests</strong> —
          sending filing deadline reminders and maintaining service security.
        </li>
      </ul>

      <h2 style={sectionHeading}>5. Third-party services</h2>
      <p style={paragraph}>We share data with the following third parties, only as necessary to provide the service:</p>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={listItem}>
          <strong style={{ color: "#1E293B" }}>HMRC</strong> — your company
          details and Gateway credentials are transmitted to HMRC to file your
          CT600 return.
        </li>
        <li style={listItem}>
          <strong style={{ color: "#1E293B" }}>Stripe</strong> — your email
          address is shared with Stripe to process subscription payments. Stripe
          acts as an independent data controller for payment data. See{" "}
          <a
            href="https://stripe.com/gb/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#2563EB" }}
          >
            Stripe&apos;s privacy policy
          </a>.
        </li>
        <li style={listItem}>
          <strong style={{ color: "#1E293B" }}>Resend</strong> — your email
          address is shared with Resend to deliver transactional emails
          (reminders and confirmations).
        </li>
      </ul>

      <h2 style={sectionHeading}>6. Data storage and security</h2>
      <p style={paragraph}>
        Your data is stored in a PostgreSQL database. All data is encrypted in
        transit using TLS. Passwords are hashed using bcrypt before storage — we
        never store your password in plain text.
      </p>
      <p style={paragraph}>
        Your HMRC Gateway credentials are never persisted. They are held in
        server memory only for the duration of the submission request and are
        discarded immediately after HMRC responds.
      </p>

      <h2 style={sectionHeading}>7. Data retention</h2>
      <p style={paragraph}>
        We retain your account and filing data for as long as your account is
        active. If you cancel your subscription, we retain your data for a
        further 12 months to allow you to reactivate. After that period, or
        upon your written request, we delete all personal data associated with
        your account.
      </p>

      <h2 style={sectionHeading}>8. Your rights</h2>
      <p style={paragraph}>Under UK GDPR, you have the right to:</p>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={listItem}>Access the personal data we hold about you.</li>
        <li style={listItem}>Rectify inaccurate personal data.</li>
        <li style={listItem}>Request erasure of your personal data.</li>
        <li style={listItem}>Object to or restrict processing of your data.</li>
        <li style={listItem}>Request portability of your data in a machine-readable format.</li>
        <li style={listItem}>Lodge a complaint with the Information Commissioner&apos;s Office (ICO).</li>
      </ul>
      <p style={paragraph}>
        To exercise any of these rights, email us at{" "}
        <a href="mailto:privacy@dormantfile.co.uk" style={{ color: "#2563EB" }}>
          privacy@dormantfile.co.uk
        </a>.
      </p>

      <h2 style={sectionHeading}>9. Cookies</h2>
      <p style={paragraph}>
        We use a single, essential session cookie to keep you logged in. We do
        not use tracking cookies, analytics cookies, or any third-party cookies.
      </p>

      <h2 style={sectionHeading}>10. Changes to this policy</h2>
      <p style={paragraph}>
        We may update this privacy policy from time to time. We will notify you
        of material changes by email or by placing a notice on the website. Your
        continued use of the service after any changes constitutes acceptance of
        the updated policy.
      </p>
    </>
  );
}
