// FILE: app/disclaimer/page.tsx

export const metadata = {
  title: "Disclaimer — Ventfreely",
};

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 style={{ marginTop: 22, marginBottom: 8, fontSize: 16, fontWeight: 800 }}>
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.82, lineHeight: 1.7 }}>
      {children}
    </p>
  );
}

export default function DisclaimerPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "#0C1836",
        color: "#FFFFFF",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
      }}
    >
      <div style={{ width: "100%", maxWidth: 860, margin: "0 auto" }}>
        <a href="/" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none", fontWeight: 700 }}>
          ← Back
        </a>

        <div style={{ height: 18 }} />

        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>Disclaimer</h1>
        <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.7 }}>
          Important information about using Ventfreely.
        </p>

        <div style={{ height: 18 }} />
        <div style={{ height: 1, background: "rgba(255,255,255,0.12)" }} />
        <div style={{ height: 18 }} />

        <P>
          This Disclaimer applies to your use of the Ventfreely mobile application and related services (the “Service”).
          By using Ventfreely, you acknowledge and agree to the following.
        </P>

        <SectionTitle>1. Not Medical, Psychological, or Professional Advice</SectionTitle>
        <P>
          Ventfreely does not provide medical, psychological, psychiatric, therapeutic, legal, or other professional
          services. Any content, responses, or information generated within the Service are for general informational
          and emotional support purposes only and do not constitute professional advice, diagnosis, or treatment.
        </P>

        <SectionTitle>2. No Emergency or Crisis Support</SectionTitle>
        <P>
          Ventfreely is not an emergency service. If you are experiencing a medical emergency, thoughts of self-harm,
          or believe you are in immediate danger, contact your local emergency number or a qualified crisis support
          service immediately.
        </P>

        <SectionTitle>3. Personal Responsibility</SectionTitle>
        <P>
          You are solely responsible for how you interpret and use any information provided through the Service. You
          should not disregard, delay, or replace professional advice based on content from Ventfreely.
        </P>

        <SectionTitle>4. No Guarantees</SectionTitle>
        <P>
          Ventfreely does not guarantee any specific outcome, improvement in well-being, or accuracy of information.
          The Service is provided on an “as is” and “as available” basis.
        </P>

        <SectionTitle>5. Limitation of Liability</SectionTitle>
        <P>
          To the maximum extent permitted by law, Ventfreely and its operators shall not be liable for any loss,
          damage, or harm arising from your use of the Service or reliance on any content provided through it,
          including but not limited to indirect, incidental, or consequential damages.
        </P>

        <SectionTitle>6. Third-Party Services</SectionTitle>
        <P>
          The Service may integrate or link to third-party services for authentication or technical functionality.
          Ventfreely is not responsible for the content, policies, or practices of such third parties.
        </P>

        <SectionTitle>7. Acknowledgment</SectionTitle>
        <P>
          By using Ventfreely, you acknowledge that you understand this Disclaimer and agree that your use of the
          Service is at your own risk.
        </P>

        <SectionTitle>8. Contact</SectionTitle>
        <P>
          If you have questions about this Disclaimer, contact us at:
          <br />
          official.ventfreely@gmail.com
        </P>

        <div style={{ height: 18 }} />
        <div style={{ height: 1, background: "rgba(255,255,255,0.12)" }} />
        <div style={{ height: 14 }} />

        <p style={{ margin: 0, opacity: 0.7, lineHeight: 1.7, textAlign: "center" }}>
          Ventfreely is not therapy. Not medical advice. Not crisis support.
        </p>
      </div>
    </main>
  );
}
