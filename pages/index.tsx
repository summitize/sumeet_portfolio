import fs from "fs";
import path from "path";
import dynamic from "next/dynamic";
import Head from "next/head";

const AIChatWidget = dynamic(() => import("../components/AIChatWidget"), { ssr: false });

function extractBodyHtml(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyHtml = match?.[1] ?? html;
  return bodyHtml.replace(/<script\b[^>]*src=["']\/script\.js["'][^>]*>[\s\S]*?<\/script>/gi, "");
}

export async function getStaticProps() {
  const filePath = path.join(process.cwd(), "public", "index.html");
  const rawHtml = fs.readFileSync(filePath, "utf8");
  return {
    props: {
      pageHtml: extractBodyHtml(rawHtml)
    }
  };
}

type HomeProps = {
  pageHtml: string;
};

export default function Home({ pageHtml }: HomeProps) {
  return (
    <>
      <Head>
        <title>Sumeet Boob | AI Transformation & Delivery Leader</title>
        <meta name="description" content="Portfolio of Sumeet Boob - AI Transformation & Delivery Leader | PMP®" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&family=Space+Grotesk:wght@300;400;600&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/styles.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" />
        <script defer src="/script.js"></script>
      </Head>

      <div style={{ minHeight: "100vh", position: "relative", background: "#05050a" }}>
        <div dangerouslySetInnerHTML={{ __html: pageHtml }} />
        <AIChatWidget />
      </div>
    </>
  );
}
