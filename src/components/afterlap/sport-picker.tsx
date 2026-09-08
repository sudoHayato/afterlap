import { SportIcon } from "@/components/afterlap/icons";
import { SPORT_META, SPORTS, type Sport } from "@/lib/afterlap/types";
import { cn } from "@/lib/utils";

export function SportPicker({
  value,
  onChange,
  exclude,
  size = "md",
}: {
  value?: Sport | null;
  onChange: (sport: Sport) => void;
  exclude?: Sport | null;
  size?: "md" | "lg";
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SPORTS.filter((s) => s !== exclude).map((sport) => {
        const active = value === sport;
        return (
          <button
            key={sport}
            type="button"
            onClick={() => onChange(sport)}
            className={cn(
              "flex items-center gap-3 border text-left transition-[background-color,border-color,color,transform] duration-[var(--motion-quick)] ease-[var(--ease-out)] active:scale-[0.98]",
              size === "lg" ? "min-h-16 rounded-xl px-4 py-3" : "min-h-12 rounded-lg px-3.5 py-2.5",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-strong",
            )}
          >
            <SportIcon sport={sport} className="size-4 shrink-0" />
            <span className="text-sm font-medium">{SPORT_META[sport].label}</span>
          </button>
        );
      })}
    </div>
  );
}
