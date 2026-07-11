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
        <title>Sumeet Boob | Enterprise Transformation & Delivery Leader | PMP®</title>
        <meta name="description" content="Portfolio of Sumeet Boob - Enterprise Transformation & Delivery Leader | Program & Portfolio Management | PMP® | 20 Years of Global Leadership" />
      </Head>

      <div style={{ minHeight: "100vh", position: "relative", background: "var(--bg-color)" }}>
        <div dangerouslySetInnerHTML={{ __html: pageHtml }} />
        <AIChatWidget />
      </div>
    </>
  );
}
