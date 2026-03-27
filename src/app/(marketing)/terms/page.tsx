import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - DormantFile",
  description: "Terms and conditions for using the DormantFile service.",
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

export default function TermsOfServicePage() {
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
        Terms of Service
      </h1>
      <p style={{ fontSize: "14px", color: "#94A3B8", margin: "0 0 40px 0" }}>
        Last updated: 27 March 2026
      </p>

      <p style={paragraph}>
        These terms govern your use of the DormantFile website and service. By
        creating an account or using the service, you agree to be bound by
        these terms. If you do not agree, do not use the service.
      </p>

      <h2 style={sectionHeading}>1. About the service</h2>
      <p style={paragraph}>
        DormantFile provides a software tool that enables directors of dormant
        UK limited companies to file nil CT600 (Corporation Tax) returns with
        HMRC. We are <strong style={{ color: "#1E293B" }}>not an accountancy firm</strong>,
        tax adviser, or regulated financial services provider. We provide
        software only.
      </p>
      <p style={paragraph}>
        The service is designed exclusively for companies that are genuinely
        dormant — with no income, expenditure, or assets during the accounting
        period. If your company has been trading, you must use a qualified
        accountant.
      </p>

      <h2 style={sectionHeading}>2. Eligibility</h2>
      <p style={paragraph}>To use DormantFile, you must:</p>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={listItem}>Be a director or authorised officer of a UK limited company registered at Companies House.</li>
        <li style={listItem}>Have a valid HMRC Government Gateway account for Corporation Tax.</li>
        <li style={listItem}>Confirm that your company was genuinely dormant during the accounting period being filed.</li>
      </ul>

      <h2 style={sectionHeading}>3. Your account</h2>
      <p style={paragraph}>
        You are responsible for maintaining the security of your account
        credentials and for all activity that occurs under your account. You
        must notify us immediately if you become aware of any unauthorised use
        of your account.
      </p>

      <h2 style={sectionHeading}>4. HMRC credentials</h2>
      <p style={paragraph}>
        To file your CT600, you must provide your HMRC Government Gateway user
        ID and password. These credentials are:
      </p>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={listItem}>Used only at the moment of submission to authenticate with HMRC.</li>
        <li style={listItem}>Transmitted directly to HMRC over an encrypted (TLS) connection.</li>
        <li style={listItem}>Never written to our database or stored on our servers.</li>
        <li style={listItem}>Discarded from server memory immediately after the submission completes.</li>
      </ul>
      <p style={paragraph}>
        By providing your credentials, you authorise DormantFile to submit a
        nil CT600 return to HMRC on your behalf for the specified accounting
        period.
      </p>

      <h2 style={sectionHeading}>5. Accuracy of information</h2>
      <p style={paragraph}>
        You are responsible for ensuring that all information you provide —
        including your company name, registration number, UTR, and accounting
        period dates — is accurate and complete. DormantFile is not responsible
        for filings made with incorrect information.
      </p>

      <h2 style={sectionHeading}>6. Subscription and payment</h2>
      <p style={paragraph}>
        The service operates on a paid annual subscription. The current price
        is displayed on our website at the time of purchase. Payments are
        processed securely by Stripe.
      </p>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={listItem}>Your subscription renews automatically each year unless cancelled.</li>
        <li style={listItem}>You may cancel at any time via the billing portal. Cancellation takes effect at the end of your current billing period.</li>
        <li style={listItem}>We do not offer refunds for partial billing periods.</li>
      </ul>

      <h2 style={sectionHeading}>7. Service availability</h2>
      <p style={paragraph}>
        We aim to keep the service available at all times but do not guarantee
        uninterrupted access. The service depends on HMRC&apos;s systems being
        operational. We are not liable for downtime caused by HMRC maintenance,
        outages, or changes to their API.
      </p>

      <h2 style={sectionHeading}>8. Limitation of liability</h2>
      <p style={paragraph}>
        To the fullest extent permitted by law:
      </p>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={listItem}>
          DormantFile is provided &quot;as is&quot; without warranties of any
          kind, whether express or implied.
        </li>
        <li style={listItem}>
          We are not liable for any penalties, fines, or charges imposed by
          HMRC, including late-filing penalties, that arise from your use of
          the service.
        </li>
        <li style={listItem}>
          Our total liability to you for any claim arising from the service is
          limited to the amount you have paid us in the 12 months preceding
          the claim.
        </li>
        <li style={listItem}>
          We are not liable for indirect, incidental, or consequential damages.
        </li>
      </ul>

      <h2 style={sectionHeading}>9. Your responsibilities</h2>
      <p style={paragraph}>You agree that:</p>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={listItem}>You will only use the service for genuinely dormant companies.</li>
        <li style={listItem}>You will not use the service to file fraudulent or misleading returns.</li>
        <li style={listItem}>You remain ultimately responsible for your company&apos;s tax obligations.</li>
        <li style={listItem}>You will check that your filing has been accepted by HMRC and follow up on any rejections.</li>
      </ul>

      <h2 style={sectionHeading}>10. Termination</h2>
      <p style={paragraph}>
        We may suspend or terminate your account if you breach these terms or
        use the service in a way that is harmful, fraudulent, or illegal. You
        may close your account at any time by contacting us.
      </p>

      <h2 style={sectionHeading}>11. Changes to these terms</h2>
      <p style={paragraph}>
        We may update these terms from time to time. We will notify you of
        material changes by email or by placing a notice on the website.
        Continued use of the service after changes constitutes acceptance of
        the updated terms.
      </p>

      <h2 style={sectionHeading}>12. Governing law</h2>
      <p style={paragraph}>
        These terms are governed by and construed in accordance with the laws
        of England and Wales. Any disputes shall be subject to the exclusive
        jurisdiction of the courts of England and Wales.
      </p>

      <h2 style={sectionHeading}>13. Contact</h2>
      <p style={paragraph}>
        If you have questions about these terms, contact us at{" "}
        <a href="mailto:hello@dormantfile.co.uk" style={{ color: "#2563EB" }}>
          hello@dormantfile.co.uk
        </a>.
      </p>
    </>
  );
}
