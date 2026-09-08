import { createFileRoute } from "@tanstack/react-router";
import { SummaryView } from "@/components/afterlap/summary-view";
import { AppShell, Wordmark } from "@/components/afterlap/shell";
import { useAfterlap } from "@/lib/afterlap/store";

export const Route = createFileRoute("/session/$id")({ component: SessionPage });

function SessionPage() {
  const { id } = Route.useParams();
  const ready = useAfterlap((s) => s.ready);
  if (!ready) {
    return (
      <AppShell>
        <Wordmark />
        <p className="mt-16 text-sm text-muted-foreground">Opening session…</p>
      </AppShell>
    );
  }
  return <SummaryView id={id} />;
}
