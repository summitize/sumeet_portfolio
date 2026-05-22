import type { NextApiRequest, NextApiResponse } from "next";
import { buildAssistantMessages } from "../../lib/assistant";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type HandlerResponse = {
  error?: string;
  message?: string;
};

type OpenAiErrorPayload = {
  error?: {
    code?: string | null;
    message?: string;
    type?: string;
  };
};

const rateLimitStore = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 15);

function getIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress ?? "unknown";
}

function enforceRateLimit(ip: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return { ok: true };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { ok: false, retryAfter: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000) };
  }

  rateLimitStore.set(ip, { count: entry.count + 1, windowStart: entry.windowStart });
  return { ok: true };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<HandlerResponse>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const ip = getIp(req);
  const limit = enforceRateLimit(ip);

  if (!limit.ok) {
    res.setHeader("Retry-After", String(limit.retryAfter ?? 60));
    return res.status(429).json({ error: "Rate limit exceeded. Please try again shortly." });
  }

  const { prompt, chatHistory } = req.body as {
    prompt?: string;
    chatHistory?: ChatMessage[];
  };

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing required prompt in request body." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured. Please set the OpenAI API key in Vercel environment variables." });
  }

  const messages = buildAssistantMessages(chatHistory ?? [], prompt);

  let openAiResponse: Response;
  try {
    openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.ASSISTANT_MODEL || "gpt-4o-mini",
        messages,
        temperature: Number(process.env.ASSISTANT_TEMPERATURE || 0.0),
        top_p: 1,
        max_completion_tokens: 700,
        stream: true
      })
    });
  } catch (error) {
    console.error("OpenAI API network error:", error);
    return res.status(502).json({ error: "Assistant service could not reach OpenAI." });
  }

  if (!openAiResponse.ok) {
    const errorText = await openAiResponse.text();
    let openAiError: OpenAiErrorPayload | null = null;

    try {
      openAiError = JSON.parse(errorText) as OpenAiErrorPayload;
    } catch {
      // Keep the raw text in server logs when OpenAI returns a non-JSON error.
    }

    console.error("OpenAI API error:", {
      status: openAiResponse.status,
      code: openAiError?.error?.code,
      type: openAiError?.error?.type,
      message: openAiError?.error?.message ?? errorText
    });

    if (openAiResponse.status === 401) {
      return res.status(502).json({ error: "Assistant authentication with OpenAI failed. Check OPENAI_API_KEY in Vercel." });
    }

    if (openAiResponse.status === 429) {
      return res.status(503).json({ error: "Assistant capacity is unavailable right now. Check OpenAI quota or try again shortly." });
    }

    if (openAiResponse.status === 400) {
      return res.status(502).json({ error: "OpenAI rejected the assistant request. Check ASSISTANT_MODEL settings." });
    }

    return res.status(502).json({ error: "Assistant service received an OpenAI error." });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const reader = openAiResponse.body?.getReader();
  if (!reader) {
    return res.status(500).json({ error: "Streaming response is unavailable." });
  }

  const textDecoder = new TextDecoder();
  let finished = false;

  try {
    while (!finished) {
      const { done, value } = await reader.read();
      if (done) {
        finished = true;
        break;
      }
      if (value) {
        const chunk = textDecoder.decode(value);
        res.write(chunk);
      }
    }
  } catch (error) {
    console.error("Streaming failure:", error);
  } finally {
    res.end();
  }
}
