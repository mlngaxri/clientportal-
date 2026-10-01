export type ScheduledState = {
  id: string;
  title: string;
  enabled: boolean;
  timezone: string;
  days: number[];
  start: string;
  end: string;
  priority: number;
  overrides: Record<string, string>;
};
const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const minutes = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
export function validateState(s: ScheduledState): string[] {
  const errors: string[] = [];
  if (
    !s ||
    typeof s.id !== "string" ||
    typeof s.title !== "string" ||
    typeof s.timezone !== "string" ||
    !Array.isArray(s.days) ||
    typeof s.start !== "string" ||
    typeof s.end !== "string" ||
    typeof s.enabled !== "boolean" ||
    !s.overrides ||
    typeof s.overrides !== "object" ||
    Array.isArray(s.overrides)
  )
    return [
      "This State has invalid data. Remove it and create a new schedule.",
    ];
  if (s.id.length > 100 || s.title.length > 160 || !s.id || !s.title.trim())
    errors.push("Give this State a name.");
  try {
    new Intl.DateTimeFormat("en", { timeZone: s.timezone }).format();
  } catch {
    errors.push("Choose a valid timezone.");
  }
  if (
    !s.days.length ||
    new Set(s.days).size !== s.days.length ||
    s.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
  )
    errors.push("Choose at least one day.");
  if (!clock.test(s.start) || !clock.test(s.end) || s.start === s.end)
    errors.push("Choose different valid start and end times.");
  if (!Number.isSafeInteger(s.priority) || s.priority < 0 || s.priority > 100)
    errors.push("Priority must be between 0 and 100.");
  if (
    Object.keys(s.overrides).some(
      (key) =>
        !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(key) ||
        ["__proto__", "constructor", "prototype"].includes(key),
    ) ||
    Object.values(s.overrides).some(
      (v) => typeof v !== "string" || v.length > 10000,
    )
  )
    errors.push("Content overrides must be text under 10,000 characters.");
  return errors;
}
export function stateActive(s: ScheduledState, at: Date): boolean {
  if (validateState(s).length || !s.enabled || !Number.isFinite(at.getTime()))
    return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: s.timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    get("weekday"),
  );
  const now = Number(get("hour")) * 60 + Number(get("minute"));
  const start = minutes(s.start),
    end = minutes(s.end);
  // Overnight windows belong to the day on which service starts. End is exclusive.
  return start < end
    ? s.days.includes(day) && now >= start && now < end
    : (s.days.includes(day) && now >= start) ||
        (s.days.includes((day + 6) % 7) && now < end);
}
export function evaluateStates(
  states: ScheduledState[],
  at: Date,
  base: Record<string, string>,
) {
  const active = states
    .filter((s) => stateActive(s, at))
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  const content = { ...base },
    conflicts: string[] = [];
  const fields = new Set(active.flatMap((s) => Object.keys(s.overrides)));
  for (const field of fields) {
    const candidates = active.filter((s) => Object.hasOwn(s.overrides, field));
    const highest = candidates[0].priority;
    const winners = candidates.filter((s) => s.priority === highest);
    if (new Set(winners.map((s) => s.overrides[field])).size > 1) {
      conflicts.push(field);
      continue;
    }
    content[field] = winners[0].overrides[field];
  }
  // An ambiguous field retains base content, never an arbitrary winner.
  return { content, activeIds: active.map((s) => s.id), conflicts };
}
