import { createFileRoute } from "@tanstack/react-router";
import { SummaryView } from "@/components/bricklap/summary-view";
import { AppShell, Wordmark } from "@/components/bricklap/shell";
import { useBricklap } from "@/lib/store";

export const Route = createFileRoute("/session/$id")({ component: SessionPage });

function SessionPage() {
  const { id } = Route.useParams();
  const ready = useBricklap((s) => s.ready);
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
