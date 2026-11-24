import { Logo } from "@/components/branding/Logo";
import { RabbitIcon } from "@/components/branding/RabbitIcon";
import { BeginJourney } from "./BeginJourney";

// Fixed positions so server and client render identically.
const STARS = [
  [8, 12], [22, 30], [35, 8], [48, 22], [63, 14], [77, 28], [90, 10],
  [12, 62], [28, 80], [55, 70], [70, 88], [86, 66], [94, 46], [4, 40],
] as const;

export function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {STARS.map(([x, y], i) => (
          <span
            key={i}
            className="absolute h-0.5 w-0.5 rounded-full bg-soft animate-twinkle"
            style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(i % 5) * 0.9}s` }}
          />
        ))}
      </div>

      <header className="relative z-10 px-4 py-5 sm:px-8">
        <Logo />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-16 text-center">
        <RabbitIcon portal className="mb-8 h-16 w-16 text-soft/80 animate-float" />
        <h1 className="max-w-3xl font-serif text-4xl leading-tight text-soft sm:text-6xl">
          What if there&rsquo;s{" "}
          <em className="bg-gradient-to-r from-ice via-lavender to-pink bg-clip-text text-transparent">
            another way
          </em>{" "}
          to see it?
        </h1>
        <p className="mt-5 max-w-md text-lg text-muted">
          Ask a question. Instead of answers, follow the questions it opens.
        </p>
        <div className="mt-10 flex w-full justify-center">
          <BeginJourney />
        </div>
      </main>

      <footer className="relative z-10 px-4 py-6 text-center font-display text-xs tracking-[0.25em] text-muted/70 uppercase">
        Follow a thought. See where it might take you.
      </footer>
    </div>
  );
}
