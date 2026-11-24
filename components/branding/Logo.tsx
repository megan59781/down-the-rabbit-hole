import { clsx } from "clsx";
import { RabbitIcon } from "./RabbitIcon";

type LogoProps = {
  className?: string;
  /** Hide the wordmark and show only the rabbit mark. */
  compact?: boolean;
};

/** Brand lockup: rabbit mark + wordmark. The "O" in HOLE is drawn as a glowing portal. */
export function Logo({ className, compact = false }: LogoProps) {
  return (
    <span
      className={clsx("inline-flex items-center gap-3 text-soft", className)}
      aria-label="Down the Rabbit Hole"
      role="img"
    >
      <RabbitIcon portal className="h-9 w-9 shrink-0" />
      {compact ? null : (
        <span className="flex flex-col font-display leading-none" aria-hidden>
          <span className="text-[0.6rem] font-medium tracking-[0.42em] text-muted">
            DOWN THE
          </span>
          <span className="mt-1 flex items-center text-base font-semibold tracking-[0.18em]">
            RABBIT&nbsp;H
            <span className="mx-[0.08em] inline-block h-[0.78em] w-[0.52em] rounded-[50%] border-[2px] border-lavender shadow-[0_0_10px_rgb(183_154_255/0.6),inset_0_0_6px_rgb(183_154_255/0.5)]" />
            LE
          </span>
        </span>
      )}
    </span>
  );
}
