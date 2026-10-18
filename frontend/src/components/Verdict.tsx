export function verdictTone(verdict: string) {
  if (verdict.startsWith("Ready")) return "text-success border-success/30 bg-success/10";
  if (verdict.startsWith("High")) return "text-danger border-danger/30 bg-danger/10";
  return "text-warning border-warning/40 bg-warning/10";
}

export function VerdictPill({ verdict }: { verdict: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${verdictTone(verdict)}`}
    >
      {verdict}
    </span>
  );
}
