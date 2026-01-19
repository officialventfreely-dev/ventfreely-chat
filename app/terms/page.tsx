// FILE: app/terms/page.tsx

export const metadata = {
  title: "Terms of Service — Ventfreely",
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

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

function Bullets({ items }: { items: string[] }) {
  return (
    <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, opacity: 0.82, lineHeight: 1.7 }}>
      {items.map((it, idx) => (
        <li key={idx} style={{ marginTop: 6 }}>
          {it}
        </li>
      ))}
    </ul>
  );
}

export default function TermsPage() {
  const effective = todayISO();

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

        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>Terms of Service</h1>
        <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.7 }}>Effective date: {effective}</p>

        <div style={{ height: 18 }} />
        <div style={{ height: 1, background: "rgba(255,255,255,0.12)" }} />
        <div style={{ height: 18 }} />

        <P>
          These Terms of Service (“Terms”) govern your access to and use of the Ventfreely mobile application
          and related services (the “Service”). By accessing or using Ventfreely, you agree to be bound by
          these Terms.
        </P>

        <SectionTitle>1. About the Service</SectionTitle>
        <P>
          Ventfreely provides a digital space for personal reflection and emotional expression. The Service
          is intended to support well-being through conversation and journaling-like features.
        </P>

        <SectionTitle>2. Not Medical or Professional Advice</SectionTitle>
        <P>
          Ventfreely does not provide medical, psychological, psychiatric, or therapeutic services. Content
          generated within the Service is not a substitute for professional advice, diagnosis, or treatment.
        </P>
        <P>If you believe you are in immediate danger, contact local emergency services.</P>

        <SectionTitle>3. Eligibility</SectionTitle>
        <P>
          You must be at least 16 years old to use the Service. By using Ventfreely, you represent and warrant
          that you meet this age requirement and have the legal capacity to enter into these Terms.
        </P>

        <SectionTitle>4. Account and Access</SectionTitle>
        <P>
          To use certain features, you may be required to authenticate using an email address or a supported
          third-party provider. You are responsible for maintaining the confidentiality of your account
          credentials and for all activities that occur under your account.
        </P>

        <SectionTitle>5. Acceptable Use</SectionTitle>
        <P>You agree not to misuse the Service. This includes, but is not limited to:</P>
        <Bullets
          items={[
            "Attempting to gain unauthorized access to any part of the Service.",
            "Interfering with system security or availability.",
            "Distributing harmful, illegal, or abusive content.",
            "Using the Service for harassment, abuse, or unlawful activities.",
          ]}
        />

        <SectionTitle>6. User Content</SectionTitle>
        <P>
          You retain ownership of content you submit through the Service. By using Ventfreely, you grant us a
          limited, non-exclusive license to process such content solely for the purpose of operating and improving
          the Service.
        </P>
        <P>We do not sell your personal content.</P>

        <SectionTitle>7. Availability and Modifications</SectionTitle>
        <P>
          We aim to keep Ventfreely available and reliable; however, we do not guarantee uninterrupted or
          error-free operation. We may modify, suspend, or discontinue any part of the Service at any time.
        </P>

        <SectionTitle>8. Termination</SectionTitle>
        <P>
          We may suspend or terminate your access to the Service if you violate these Terms or if required
          by law. You may stop using the Service at any time.
        </P>

        <SectionTitle>9. Disclaimer of Warranties</SectionTitle>
        <P>
          The Service is provided “as is” and “as available” without warranties of any kind, whether express
          or implied. We do not warrant that the Service will meet your requirements or that content will be
          accurate, complete, or reliable.
        </P>

        <SectionTitle>10. Limitation of Liability</SectionTitle>
        <P>
          To the maximum extent permitted by law, Ventfreely and its operators shall not be liable for any
          indirect, incidental, special, consequential, or punitive damages arising out of or related to
          your use of the Service.
        </P>

        <SectionTitle>11. Data Protection</SectionTitle>
        <P>
          We process personal data in accordance with applicable data protection laws, including the EU General
          Data Protection Regulation (GDPR). Please refer to our Privacy Policy for details on how we collect,
          use, and protect your information.
        </P>

        <SectionTitle>12. Changes to These Terms</SectionTitle>
        <P>
          We may update these Terms from time to time. If changes are material, we will notify you within
          the app or by other appropriate means. Continued use of the Service after changes become effective
          constitutes acceptance of the updated Terms.
        </P>

        <SectionTitle>13. Governing Law</SectionTitle>
        <P>
          These Terms are governed by and construed in accordance with applicable laws. Mandatory consumer
          protection rights under your local jurisdiction remain unaffected.
        </P>

        <SectionTitle>14. Contact</SectionTitle>
        <P>
          If you have questions about these Terms, contact us at:
          <br />
          official.ventfreely@gmail.com
        </P>

        <div style={{ height: 18 }} />
        <div style={{ height: 1, background: "rgba(255,255,255,0.12)" }} />
        <div style={{ height: 14 }} />

        <p style={{ margin: 0, opacity: 0.7, lineHeight: 1.7, textAlign: "center" }}>
          Ventfreely is a calm space for reflection. Not therapy. Not medical advice.
        </p>
      </div>
    </main>
  );
}
