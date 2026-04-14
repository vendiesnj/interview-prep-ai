export const metadata = {
  title: "Privacy Policy – Signal",
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 18px", color: "var(--text-primary)" }}>
      <h1 style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>Privacy Policy</h1>
      <p style={{ marginTop: 10, color: "var(--text-muted)", lineHeight: 1.6 }}>
        Last updated: January 1, 2025
      </p>

      <section style={{ marginTop: 26, lineHeight: 1.7, color: "rgba(229,231,235,0.9)" }}>
        <p>
          Signal ("we", "us", or "our") operates signalhq.us. This policy describes how we collect,
          use, and protect your information when you use our interview preparation platform.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28 }}>What we collect</h2>
        <ul>
          <li><b>Account info:</b> email and basic profile information when you sign in.</li>
          <li><b>Google account data:</b> if you sign in with Google, we receive your name, email address, and profile picture from Google. We use this only to create and identify your account.</li>
          <li><b>Inputs you provide:</b> job descriptions, interview questions, transcripts, and feedback results.</li>
          <li><b>Audio (if you record):</b> your recording is sent to OpenAI Whisper for transcription and then discarded. We do not store raw audio.</li>
          <li><b>Usage data:</b> basic logs to keep the service reliable and secure.</li>
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28 }}>How we use it</h2>
        <ul>
          <li>Provide interview practice features (transcription, AI scoring, personalized feedback).</li>
          <li>Save your practice history so you can track progress over time.</li>
          <li>Maintain security and prevent abuse.</li>
          <li>Improve reliability and performance of the service.</li>
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28 }}>Google user data</h2>
        <p>
          If you sign in with Google, Signal receives your name, email address, and profile photo.
          We use this information solely to authenticate your account and personalize your experience.
          We do not share your Google account data with third parties, and we do not use it for advertising.
          You can revoke Signal&apos;s access to your Google account at any time from your
          Google Account permissions page.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28 }}>Third-party services</h2>
        <p>
          We use the following third-party providers to deliver core functionality:
        </p>
        <ul>
          <li><b>OpenAI</b> — transcription (Whisper) and AI feedback generation.</li>
          <li><b>Stripe</b> — payment processing for subscriptions.</li>
          <li><b>Vercel / Neon</b> — hosting and database infrastructure.</li>
        </ul>
        <p>We do not sell your personal information to any third party.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28 }}>Data retention</h2>
        <p>
          We keep your saved practice attempts and history so you can review your progress.
          You can delete your history from within the app. To request full account deletion,
          contact us at the email below.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28 }}>Your choices</h2>
        <ul>
          <li>You can type or paste a transcript instead of recording audio.</li>
          <li>You can clear your saved history from inside the app.</li>
          <li>You can request deletion of your account and all associated data by emailing us.</li>
          <li>You can revoke Google sign-in access from your Google Account settings.</li>
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28 }}>Contact</h2>
        <p>
          Questions or data requests: <b>adam@signalhq.us</b>
        </p>
      </section>
    </main>
  );
}
