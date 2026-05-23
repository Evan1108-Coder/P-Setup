import OpenAI from "openai";

let client: OpenAI | null = null;

export function getAIClient(): OpenAI | null {
  if (client) return client;

  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) return null;

  client = new OpenAI({
    apiKey,
    baseURL: "https://api.minimaxi.chat/v1",
  });

  return client;
}

export function hasAIKey(): boolean {
  return !!process.env.MINIMAX_API_KEY;
}

export function getModel(): string {
  return process.env.P_SETUP_AI_MODEL || "MiniMax-Text-01";
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chat(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<{ content: string; tokens: number }> {
  const ai = getAIClient();
  if (!ai) throw new Error("No AI API key configured");

  const response = await ai.chat.completions.create({
    model: getModel(),
    messages,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 2048,
  });

  const choice = response.choices[0];
  const usage = response.usage;

  return {
    content: choice?.message?.content || "",
    tokens: (usage?.prompt_tokens || 0) + (usage?.completion_tokens || 0),
  };
}
