import dynamic from "next/dynamic";
import Head from "next/head";

const AIChatWidget = dynamic(() => import("../components/AIChatWidget"), { ssr: false });

export default function Home() {
  return (
    <>
      <Head>
        <title>Sumeet Boob | AI Transformation & Delivery Leader</title>
        <meta name="description" content="Portfolio of Sumeet Boob - AI Transformation & Delivery Leader | PMP®" />
      </Head>

      <div style={{ minHeight: "100vh", position: "relative", background: "#05050a" }}>
        <iframe
          src="/index.html"
          title="Sumeet Boob Portfolio"
          style={{
            width: "100%",
            minHeight: "100vh",
            border: "none",
            display: "block"
          }}
        />
        <AIChatWidget />
      </div>
    </>
  );
}
