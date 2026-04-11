export const metadata = {
  title: "Terms of Service – Signal",
};

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 18px", color: "var(--text-primary)" }}>
      <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>Terms of Service</h1>
      <p style={{ marginTop: 10, color: "var(--text-muted)", lineHeight: 1.6 }}>
        Last updated: January 1, 2025
      </p>

      <section style={{ marginTop: 26, lineHeight: 1.7, color: "rgba(229,231,235,0.9)" }}>
        <p>
          These Terms of Service govern your use of Signal, operated by Signal HQ ("we", "us", or "our")
          at signalhq.us. By using Signal you agree to these terms.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 28 }}>Service overview</h2>
        <p>
          Signal provides AI-powered interview practice tools including question generation, audio transcription,
          communication scoring, and personalized coaching feedback. Feedback is for informational and
          educational purposes only and does not guarantee any job outcome.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 28 }}>Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all
          activity that occurs under your account. Notify us immediately if you believe your account has
          been compromised.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 28 }}>Acceptable use</h2>
        <ul>
          <li>No abuse, scraping, or automated access beyond normal use of the platform.</li>
          <li>No illegal, harmful, or infringing content.</li>
          <li>No attempts to circumvent rate limits, access controls, or subscription tiers.</li>
          <li>We may rate-limit or suspend access to protect the integrity of the system.</li>
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 28 }}>Payments & subscriptions</h2>
        <p>
          Paid subscriptions are billed through Stripe. By subscribing you authorize recurring charges
          to your payment method. You may cancel at any time through your account settings.
          Cancellations take effect at the end of the current billing period.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 28 }}>Intellectual property</h2>
        <p>
          Signal and its content, features, and functionality are owned by Signal HQ. You retain ownership
          of content you submit (transcripts, responses). By submitting content you grant us a limited
          license to process it for the purpose of delivering the service.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 28 }}>Disclaimers</h2>
        <p>
          The service is provided "as is" without warranties of any kind, express or implied. AI-generated
          feedback may contain errors. We are not liable for indirect, incidental, or consequential damages
          arising from your use of the service.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 28 }}>Changes to terms</h2>
        <p>
          We may update these terms from time to time. Continued use of the service after changes
          constitutes acceptance of the updated terms.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 28 }}>Contact</h2>
        <p>
          Questions: <b>adam@signalhq.us</b>
        </p>
      </section>
    </main>
  );
}
