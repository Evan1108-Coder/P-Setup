import type { SetupStep } from "../ai/planner.js";

export interface PlanDiff {
  added: SetupStep[];
  removed: SetupStep[];
  changed: Array<{ before: SetupStep; after: SetupStep; changes: string[] }>;
  reordered: Array<{ id: string; from: number; to: number }>;
  summary: string;
}

export function diffPlans(before: SetupStep[], after: SetupStep[]): PlanDiff {
  const beforeById = new Map(before.map((step, index) => [step.id, { step, index }]));
  const afterById = new Map(after.map((step, index) => [step.id, { step, index }]));
  const added = after.filter((step) => !beforeById.has(step.id));
  const removed = before.filter((step) => !afterById.has(step.id));
  const changed: PlanDiff["changed"] = [];
  const reordered: PlanDiff["reordered"] = [];

  for (const { step: beforeStep, index: beforeIndex } of beforeById.values()) {
    const next = afterById.get(beforeStep.id);
    if (!next) continue;
    const changes: string[] = [];
    if (beforeStep.label !== next.step.label) changes.push(`label: ${beforeStep.label} -> ${next.step.label}`);
    if (beforeStep.command !== next.step.command) changes.push(`command: ${beforeStep.command || "(none)"} -> ${next.step.command || "(none)"}`);
    if (beforeStep.status !== next.step.status) changes.push(`status: ${beforeStep.status} -> ${next.step.status}`);
    if (changes.length) changed.push({ before: beforeStep, after: next.step, changes });
    if (beforeIndex !== next.index) reordered.push({ id: beforeStep.id, from: beforeIndex, to: next.index });
  }

  const parts = [
    added.length ? `${added.length} added` : "",
    removed.length ? `${removed.length} removed` : "",
    changed.length ? `${changed.length} changed` : "",
    reordered.length ? `${reordered.length} reordered` : "",
  ].filter(Boolean);

  return {
    added,
    removed,
    changed,
    reordered,
    summary: parts.length ? `Plan changed: ${parts.join(", ")}.` : "Plan unchanged.",
  };
}

export function formatPlanDiff(diff: PlanDiff): string {
  const lines = [diff.summary];
  for (const step of diff.added.slice(0, 6)) lines.push(`+ ${step.label}`);
  for (const step of diff.removed.slice(0, 6)) lines.push(`- ${step.label}`);
  for (const item of diff.changed.slice(0, 6)) lines.push(`~ ${item.after.label}: ${item.changes.join("; ")}`);
  for (const item of diff.reordered.slice(0, 6)) lines.push(`↕ ${item.id}: ${item.from + 1} -> ${item.to + 1}`);
  return lines.join("\n");
}
