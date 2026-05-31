import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { createAppStore } from "../src/state/store.js";
import { hydrateChatSession, loadChatSession, saveChatSession } from "../src/state/chatSession.js";

describe("chat session persistence", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "setupr-chat-session-"));
    await mkdir(join(tempDir, "home"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("saves and reloads recoverable chat state", async () => {
    const store = createAppStore(tempDir);
    store.getState().addMessage({ role: "user", content: "how do I start?" });
    store.getState().addMessage({ role: "assistant", content: "Run npm run dev." });
    store.getState().addLog({ type: "command", content: "npm run dev" });
    store.getState().setSteps([
      { id: "deps", label: "Install dependencies", type: "deps", command: "npm install", status: "pending" },
    ]);
    store.getState().setPendingPrompt({
      id: "confirm",
      type: "confirm",
      title: "Run command?",
      options: [{ id: "yes", label: "Proceed" }],
      includeOther: true,
      createdAt: Date.now(),
    });

    await saveChatSession(tempDir, store, { status: "awaiting-choice", lastAction: "prompt.ask" });
    const loaded = await loadChatSession(tempDir);

    expect(loaded?.messages).toHaveLength(2);
    expect(loaded?.logs[0].content).toBe("npm run dev");
    expect(loaded?.steps[0].label).toBe("Install dependencies");
    expect(loaded?.pendingPrompt?.id).toBe("confirm");
    expect(loaded?.status).toBe("awaiting-choice");
  });

  it("redacts secrets before persistence and hydrates without transient input", async () => {
    const store = createAppStore(tempDir);
    store.getState().setInput("do not persist me");
    store.getState().addMessage({ role: "user", content: "OPENAI_API_KEY=sk-secret-value" });
    store.getState().addLog({ type: "warning", content: "Bearer github_pat_secret_token" });
    store.getState().setEnvVars([
      { key: "OPENAI_API_KEY", value: "sk-secret-value", status: "filled", source: "chat" },
      { key: "PUBLIC_URL", value: "http://localhost:3000", status: "filled", source: "chat" },
    ]);

    await saveChatSession(tempDir, store);
    const raw = JSON.stringify(await loadChatSession(tempDir));

    expect(raw).not.toContain("sk-secret-value");
    expect(raw).not.toContain("github_pat_secret_token");
    expect(raw).toContain("PUBLIC_URL");

    const restored = createAppStore(tempDir);
    await hydrateChatSession(tempDir, restored);
    expect(restored.getState().messages).toHaveLength(1);
    expect(restored.getState().inputValue).toBe("");
    expect(restored.getState().promptResponse).toBeNull();
  });
});
