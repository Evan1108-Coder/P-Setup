import type { SetupStep } from "../ai/planner.js";

export type SafetyRisk = "none" | "low" | "medium" | "high" | "critical";
export type SafetyDecision = "allow" | "confirm" | "block";

export interface SafetyEvaluation {
  decision: SafetyDecision;
  risk: SafetyRisk;
  reasons: string[];
  forceCanSkipConfirmation: boolean;
}

const SECRET_PATTERN = /(API[_-]?KEY|TOKEN|SECRET|PASSWORD|PRIVATE[_-]?KEY|CREDENTIAL|AUTH)/i;
const SHELL_META_PATTERN = /(;|&&|\|\||`|\$\(|>\s*\/|rm\s+-rf\s+(?:\/|\*|~|\$HOME))/;
const DESTRUCTIVE_PATTERN = /\b(rm|del|rmdir|trash|git\s+reset|git\s+clean|docker\s+system\s+prune)\b/i;
const INSTALL_PATTERN = /\b(npm|pnpm|yarn|bun|pip|poetry|cargo|go)\b.*\b(install|add|get|download|build)\b/i;

export function evaluateCommandSafety(command: string, options: { force?: boolean } = {}): SafetyEvaluation {
  const reasons: string[] = [];
  let risk: SafetyRisk = "none";
  let decision: SafetyDecision = "allow";

  if (SECRET_PATTERN.test(command)) {
    risk = maxRisk(risk, "high");
    reasons.push("The command text appears to include a secret-looking token or variable name.");
  }

  if (SHELL_META_PATTERN.test(command)) {
    risk = maxRisk(risk, "medium");
    reasons.push("The command contains shell metacharacters or redirection.");
  }

  if (DESTRUCTIVE_PATTERN.test(command)) {
    risk = maxRisk(risk, "high");
    reasons.push("The command can delete files, reset git state, or prune local resources.");
  }

  if (/rm\s+-rf\s+(?:\/|\*|~|\$HOME)(?:\s|$)/i.test(command)) {
    risk = maxRisk(risk, "critical");
    reasons.push("The command targets a root, home, or wildcard delete.");
  }

  if (INSTALL_PATTERN.test(command)) {
    risk = maxRisk(risk, "low");
    reasons.push("The command can modify dependency state.");
  }

  if (/sudo\b|chmod\s+777|chown\s+-R|\bcurl\b.*\|\s*(sh|bash)/i.test(command)) {
    risk = maxRisk(risk, "critical");
    reasons.push("The command requires elevated or highly risky shell behavior.");
  }

  if (risk === "critical") decision = "block";
  else if (risk === "high") decision = options.force ? "confirm" : "confirm";
  else if (risk === "medium") decision = options.force ? "allow" : "confirm";

  return {
    decision,
    risk,
    reasons,
    forceCanSkipConfirmation: risk === "low" || risk === "medium",
  };
}

export function evaluateStepSafety(step: SetupStep, options: { force?: boolean } = {}): SafetyEvaluation {
  if (!step.command) {
    return { decision: "allow", risk: "none", reasons: [], forceCanSkipConfirmation: true };
  }
  return evaluateCommandSafety(step.command, options);
}

function maxRisk(a: SafetyRisk, b: SafetyRisk): SafetyRisk {
  const order: SafetyRisk[] = ["none", "low", "medium", "high", "critical"];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}
