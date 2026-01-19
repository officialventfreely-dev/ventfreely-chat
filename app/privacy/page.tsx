// FILE: app/privacy/page.tsx

export const metadata = {
  title: "Privacy Policy — Ventfreely",
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

export default function PrivacyPage() {
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

        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>Privacy Policy</h1>
        <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.7 }}>Effective date: {effective}</p>

        <div style={{ height: 18 }} />
        <div style={{ height: 1, background: "rgba(255,255,255,0.12)" }} />
        <div style={{ height: 18 }} />

        <P>
          This Privacy Policy explains how Ventfreely (“we”, “us”, or “our”) collects, uses, and protects your
          personal data when you use the Ventfreely mobile application and related services (the “Service”).
        </P>

        <SectionTitle>1. Data We Collect</SectionTitle>
        <P>We collect only the data necessary to operate and improve the Service. This may include:</P>
        <Bullets
          items={[
            "Account information (such as email address or authentication identifiers).",
            "App usage data (basic technical and interaction information).",
            "Content you voluntarily provide within the Service (such as messages or reflections).",
          ]}
        />

        <SectionTitle>2. How We Use Your Data</SectionTitle>
        <P>We use your data to:</P>
        <Bullets
          items={[
            "Provide and maintain the Service.",
            "Authenticate and secure user accounts.",
            "Improve functionality and user experience.",
            "Comply with legal obligations.",
          ]}
        />
        <P>We do not sell your personal data.</P>

        <SectionTitle>3. Legal Basis for Processing</SectionTitle>
        <P>
          Where applicable under the EU General Data Protection Regulation (GDPR), we process your data based on one or
          more of the following legal grounds:
        </P>
        <Bullets
          items={[
            "Performance of a contract (providing the Service).",
            "Your consent (where required).",
            "Compliance with legal obligations.",
            "Our legitimate interests in operating and improving the Service.",
          ]}
        />

        <SectionTitle>4. Data Storage and Security</SectionTitle>
        <P>
          We take reasonable technical and organizational measures to protect your personal data against unauthorized
          access, loss, or misuse. However, no digital service can guarantee absolute security.
        </P>

        <SectionTitle>5. Data Sharing</SectionTitle>
        <P>We do not share your personal data with third parties except:</P>
        <Bullets
          items={[
            "When required by law or legal process.",
            "With service providers who process data on our behalf for operating the Service.",
            "To protect our rights, safety, or users.",
          ]}
        />
        <P>All such parties are required to respect the confidentiality and security of your data.</P>

        <SectionTitle>6. International Transfers</SectionTitle>
        <P>
          Your data may be processed in countries other than your own. Where required by law, we ensure appropriate
          safeguards are in place to protect your personal data.
        </P>

        <SectionTitle>7. Data Retention</SectionTitle>
        <P>
          We retain personal data only for as long as necessary to provide the Service and fulfill the purposes outlined
          in this Policy, unless a longer retention period is required or permitted by law.
        </P>

        <SectionTitle>8. Your Rights</SectionTitle>
        <P>Depending on your location, you may have rights regarding your personal data, including:</P>
        <Bullets
          items={[
            "The right to access your data.",
            "The right to correct inaccurate data.",
            "The right to request deletion of your data.",
            "The right to restrict or object to processing.",
            "The right to data portability.",
          ]}
        />
        <P>To exercise these rights, contact us at the email address below.</P>

        <SectionTitle>9. Children’s Privacy</SectionTitle>
        <P>
          Ventfreely is not intended for children under 16 years of age. We do not knowingly collect personal data from
          individuals under 16. If you believe a minor has provided us with personal data, please contact us and we will
          take appropriate action.
        </P>

        <SectionTitle>10. Changes to This Policy</SectionTitle>
        <P>
          We may update this Privacy Policy from time to time. If changes are significant, we will notify you within the
          app or by other appropriate means. Continued use of the Service after updates constitutes acceptance of the
          revised Policy.
        </P>

        <SectionTitle>11. Contact</SectionTitle>
        <P>
          If you have questions about this Privacy Policy or how we handle your data, contact us at:
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
