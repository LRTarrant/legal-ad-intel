export type WindowPreset = "7d" | "30d" | "90d" | "ytd" | "custom";

export function computeDateRange(
  window: string | undefined,
  from: string | undefined,
  to: string | undefined
): { windowStart: string; windowEnd: string; preset: WindowPreset } {
  const today = new Date();
  const windowEnd = today.toISOString().slice(0, 10);

  const preset = (["7d", "30d", "90d", "ytd", "custom"].includes(window ?? "")
    ? window
    : "30d") as WindowPreset;

  if (preset === "custom" && from && to) {
    return { windowStart: from, windowEnd: to, preset };
  }

  if (preset === "ytd") {
    return {
      windowStart: `${today.getFullYear()}-01-01`,
      windowEnd,
      preset,
    };
  }

  const days = preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
  const start = new Date(today);
  start.setDate(start.getDate() - days);
  return {
    windowStart: start.toISOString().slice(0, 10),
    windowEnd,
    preset,
  };
}
