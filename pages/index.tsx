import dynamic from "next/dynamic";
import profileData from "../data/profile-data.json";

const AIChatWidget = dynamic(() => import("../components/AIChatWidget"), { ssr: false });

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", padding: "4rem 1.5rem", background: "var(--bg)", color: "var(--text)" }}>
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "3rem 0" }}>
        <p style={{ margin: 0, color: "var(--accent)", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: "0.82rem" }}>
          AI portfolio assistant
        </p>
        <h1 style={{ marginTop: "1rem", fontSize: "clamp(2.6rem, 4vw, 4.5rem)", lineHeight: 1.03 }}>
          Sumeet Satish Boob
        </h1>
        <p style={{ marginTop: "1.25rem", maxWidth: 760, fontSize: "1.05rem", color: "var(--muted)", lineHeight: 1.8 }}>
          {profileData.summary}
        </p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "2rem" }}>
          <a href={profileData.quickActions.downloadResume} style={{ padding: "0.95rem 1.25rem", borderRadius: 999, background: "var(--accent)", color: "#fff", textDecoration: "none", fontWeight: 600 }}>
            Download Resume
          </a>
          <a href={profileData.quickActions.contact} style={{ padding: "0.95rem 1.25rem", borderRadius: 999, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", textDecoration: "none", fontWeight: 600 }}>
            Contact Sumeet
          </a>
        </div>
      </section>
      <AIChatWidget />
    </main>
  );
}
