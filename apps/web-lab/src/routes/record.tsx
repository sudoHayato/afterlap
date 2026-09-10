import { createFileRoute } from "@tanstack/react-router";
import { LiveView } from "@/components/bricklap/live-view";
import { AppShell, Wordmark } from "@/components/bricklap/shell";
import { t } from "@/lib/i18n";
import { useBricklap } from "@/lib/store";

export const Route = createFileRoute("/record")({ component: RecordPage });

function RecordPage() {
  const ready = useBricklap((s) => s.ready);
  if (!ready) {
    return (
      <AppShell>
        <Wordmark kicker={t("common.live")} />
        <p className="mt-16 text-sm text-muted-foreground">{t("common.openingSession")}</p>
      </AppShell>
    );
  }
  return <LiveView />;
}
