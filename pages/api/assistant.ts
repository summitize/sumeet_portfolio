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

type GeminiErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type AssistantMessage = ReturnType<typeof buildAssistantMessages>[number];

type ProviderName = "gemini" | "openai";

type ProviderResponse = {
  provider: ProviderName;
  response: Response;
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

function getProviderOrder(): ProviderName[] {
  const provider = (process.env.ASSISTANT_PROVIDER || "auto").toLowerCase();

  if (provider === "gemini") return ["gemini", "openai"];
  if (provider === "openai") return ["openai", "gemini"];

  return ["gemini", "openai"];
}

function getSanitizedHistory(chatHistory: ChatMessage[] = [], prompt: string): ChatMessage[] {
  const history = chatHistory.filter(
    (message) => message.content && (message.role === "user" || message.role === "assistant")
  );
  const lastMessage = history[history.length - 1];

  if (lastMessage?.role === "user" && lastMessage.content.trim() === prompt.trim()) {
    return history.slice(0, -1);
  }

  return history;
}

async function createOpenAiResponse(messages: AssistantMessage[]): Promise<ProviderResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_ASSISTANT_MODEL || process.env.ASSISTANT_MODEL || "gpt-4o-mini",
        messages,
        temperature: Number(process.env.ASSISTANT_TEMPERATURE || 0.0),
        top_p: 1,
        max_completion_tokens: 700,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let openAiError: OpenAiErrorPayload | null = null;

      try {
        openAiError = JSON.parse(errorText) as OpenAiErrorPayload;
      } catch {
        // Keep the raw text in server logs when OpenAI returns a non-JSON error.
      }

      console.error("OpenAI API error:", {
        status: response.status,
        code: openAiError?.error?.code,
        type: openAiError?.error?.type,
        message: openAiError?.error?.message ?? errorText
      });
    }

    return { provider: "openai", response };
  } catch (error) {
    console.error("OpenAI API network error:", error);
    return null;
  }
}

function toGeminiRequest(messages: AssistantMessage[]) {
  const systemText = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");

  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  for (const message of messages) {
    if (message.role === "system" || !message.content.trim()) continue;

    const role = message.role === "assistant" ? "model" : "user";
    if (role === "model" && contents.length === 0) continue;

    const previous = contents[contents.length - 1];
    if (previous?.role === role) {
      previous.parts[0].text += `\n\n${message.content}`;
    } else {
      contents.push({ role, parts: [{ text: message.content }] });
    }
  }

  return {
    systemInstruction: {
      parts: [{ text: systemText }]
    },
    contents,
    generationConfig: {
      temperature: Number(process.env.ASSISTANT_TEMPERATURE || 0.0),
      topP: 1,
      maxOutputTokens: 700
    }
  };
}

async function createGeminiResponse(messages: AssistantMessage[]): Promise<ProviderResponse | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_ASSISTANT_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(toGeminiRequest(messages))
    });

    if (!response.ok) {
      const errorText = await response.text();
      let geminiError: GeminiErrorPayload | null = null;

      try {
        geminiError = JSON.parse(errorText) as GeminiErrorPayload;
      } catch {
        // Keep the raw text in server logs when Gemini returns a non-JSON error.
      }

      console.error("Gemini API error:", {
        status: response.status,
        code: geminiError?.error?.code,
        type: geminiError?.error?.status,
        message: geminiError?.error?.message ?? errorText
      });
    }

    return { provider: "gemini", response };
  } catch (error) {
    console.error("Gemini API network error:", error);
    return null;
  }
}

async function createProviderResponse(messages: AssistantMessage[]): Promise<ProviderResponse | null> {
  for (const provider of getProviderOrder()) {
    const result =
      provider === "gemini"
        ? await createGeminiResponse(messages)
        : await createOpenAiResponse(messages);

    if (result?.response.ok) {
      return result;
    }
  }

  return null;
}

function writeStreamHeaders(res: NextApiResponse<HandlerResponse>) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
}

async function pipeOpenAiStream(response: Response, res: NextApiResponse<HandlerResponse>) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("OpenAI streaming response is unavailable.");
  }

  const textDecoder = new TextDecoder();
  let finished = false;

  while (!finished) {
    const { done, value } = await reader.read();
    if (done) {
      finished = true;
      break;
    }
    if (value) {
      res.write(textDecoder.decode(value));
    }
  }
}

async function pipeGeminiAsOpenAiStream(response: Response, res: NextApiResponse<HandlerResponse>) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Gemini streaming response is unavailable.");
  }

  const textDecoder = new TextDecoder();
  let buffer = "";
  let finished = false;

  while (!finished) {
    const { done, value } = await reader.read();
    if (done) {
      finished = true;
      break;
    }

    if (!value) continue;

    buffer += textDecoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const dataLines = part
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("data:"));

      for (const line of dataLines) {
        const payload = line.replace(/^data:\s*/, "");
        if (!payload || payload === "[DONE]") continue;

        try {
          const parsed = JSON.parse(payload);
          const text = parsed.candidates?.[0]?.content?.parts
            ?.map((item: { text?: string }) => item.text ?? "")
            .join("");

          if (text) {
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
          }
        } catch (error) {
          console.error("Gemini stream parse error:", error);
        }
      }
    }
  }

  res.write("data: [DONE]\n\n");
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

  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_AI_API_KEY && !process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "No assistant provider key is configured. Set GEMINI_API_KEY or OPENAI_API_KEY in Vercel." });
  }

  const messages = buildAssistantMessages(getSanitizedHistory(chatHistory ?? [], prompt), prompt);
  const providerResponse = await createProviderResponse(messages);

  if (!providerResponse) {
    return res.status(502).json({ error: "Assistant provider request failed. Check GEMINI_API_KEY, OPENAI_API_KEY, model settings, and provider quota." });
  }

  try {
    writeStreamHeaders(res);

    if (providerResponse.provider === "gemini") {
      await pipeGeminiAsOpenAiStream(providerResponse.response, res);
    } else {
      await pipeOpenAiStream(providerResponse.response, res);
    }
  } catch (error) {
    console.error("Streaming failure:", error);
  } finally {
    res.end();
  }
}
