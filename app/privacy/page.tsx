export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 18px", color: "#E5E7EB" }}>
      <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>Privacy Policy</h1>
      <p style={{ marginTop: 10, color: "#9CA3AF", lineHeight: 1.6 }}>
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <section style={{ marginTop: 26, lineHeight: 1.7, color: "rgba(229,231,235,0.9)" }}>
        <h2 style={{ fontSize: 18, fontWeight: 900 }}>What we collect</h2>
        <ul>
          <li><b>Account info:</b> email and basic profile information (if you sign in).</li>
          <li><b>Inputs you provide:</b> job descriptions, questions, transcripts, and feedback results.</li>
          <li><b>Audio (if you record):</b> your recording is sent for transcription and analysis.</li>
          <li><b>Usage data:</b> basic logs to keep the service reliable and secure.</li>
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 22 }}>How we use it</h2>
        <ul>
          <li>Provide interview practice features (transcription, scoring, feedback).</li>
          <li>Maintain security, prevent abuse (rate limits, fraud prevention).</li>
          <li>Improve reliability and performance.</li>
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 22 }}>Data retention</h2>
        <p>
          We keep your saved attempts/history so you can review progress. You can clear history in the app.
          Operational logs may be retained for a limited period for security and debugging.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 22 }}>Sharing</h2>
        <p>
          We may use third-party providers to run core features (e.g., transcription/AI processing, payments).
          We do not sell your personal information.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 22 }}>Your choices</h2>
        <ul>
          <li>Don’t record audio — you can paste a transcript instead.</li>
          <li>Clear saved history from inside the app.</li>
          <li>Contact us to request deletion of your account data.</li>
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 22 }}>Contact</h2>
        <p>
          Email: <b>support@yourdomain.com</b> (replace with your real support email)
        </p>
      </section>
    </main>
  );
}