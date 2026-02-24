export const metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 18px", color: "#E5E7EB" }}>
      <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>Terms of Service</h1>
      <p style={{ marginTop: 10, color: "#9CA3AF", lineHeight: 1.6 }}>
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <section style={{ marginTop: 26, lineHeight: 1.7, color: "rgba(229,231,235,0.9)" }}>
        <h2 style={{ fontSize: 18, fontWeight: 900 }}>Service overview</h2>
        <p>
          This app provides interview practice tools (question generation, transcription, and AI feedback).
          Feedback is for informational purposes only and does not guarantee job outcomes.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 22 }}>Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account and for activity under your account.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 22 }}>Acceptable use</h2>
        <ul>
          <li>No abuse, scraping, or attempts to overload the service.</li>
          <li>No illegal, harmful, or infringing content.</li>
          <li>We may rate-limit or suspend access to protect the system.</li>
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 22 }}>Payments & subscriptions</h2>
        <p>
          If you purchase a subscription, billing is handled by our payment provider. Subscription terms,
          renewals, and cancellations are governed by your checkout and account settings.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 22 }}>Disclaimers</h2>
        <p>
          The service is provided “as is” without warranties of any kind. We are not liable for indirect or
          consequential damages.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 22 }}>Contact</h2>
        <p>
          Email: <b>vendiesnj@gmail.com</b> 
        </p>
      </section>
    </main>
  );
}