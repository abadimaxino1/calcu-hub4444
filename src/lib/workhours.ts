export function nowHHmm() {
  const d = new Date();
  const pad = (s: number) => String(s).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function calcEndTimeLocal(startHHmm: string, targetHrs: number, breakMin: number, breakPaid: boolean) {
  if (!/^\d{2}:\d{2}$/.test(startHHmm || "")) return "--:--";
  const [h, m] = startHHmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "--:--";
  const startMin = h * 60 + m;
  const addWork = Math.round((Number(targetHrs) || 0) * 60);
  const addBreak = Math.round(Number(breakMin) || 0);
  const addMin = breakPaid ? addWork + addBreak : addWork;
  const endMin = (startMin + addMin) % (24 * 60);
  const pad = (s: number) => String(s).padStart(2, "0");
  return `${pad(Math.floor(endMin / 60))}:${pad(endMin % 60)}`;
}
