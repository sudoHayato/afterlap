import { createFileRoute } from "@tanstack/react-router";
import { LiveView } from "@/components/afterlap/live-view";
import { AppShell, Wordmark } from "@/components/afterlap/shell";
import { useAfterlap } from "@/lib/afterlap/store";

export const Route = createFileRoute("/record")({ component: RecordPage });

function RecordPage() {
  const ready = useAfterlap((s) => s.ready);
  if (!ready) {
    return (
      <AppShell>
        <Wordmark kicker="Live" />
        <p className="mt-16 text-sm text-muted-foreground">Opening session…</p>
      </AppShell>
    );
  }
  return <LiveView />;
}
