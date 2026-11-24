import type { SVGProps } from "react";

type RabbitIconProps = SVGProps<SVGSVGElement> & {
  /** Draw the glowing portal ellipse beneath the rabbit. */
  portal?: boolean;
  title?: string;
};

/** Single-stroke line-art rabbit, sitting in profile. Shares its path with app/icon.svg. */
export const RABBIT_PATH =
  "M14 31C14 25 18 22 23 22C20 15 18 8 20 4C24 6 26 14 27 21C29 14 32 6 35 5C37 9 34 17 32 23C46 24 56 34 55 46C54 53 49 57 42 57L28 57C25 57 24 54 26 52C27 47 25 43 20 40C16 38 14 35 14 31Z";

export function RabbitIcon({ portal = false, title, ...props }: RabbitIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {portal ? (
        <ellipse
          cx="38"
          cy="59"
          rx="22"
          ry="3.5"
          stroke="var(--color-lavender)"
          strokeWidth={1.5}
          className="animate-portal"
        />
      ) : null}
      <path d={RABBIT_PATH} />
      <circle cx="19.5" cy="28.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
