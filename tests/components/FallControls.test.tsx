/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComponentProps } from "react";
import { FallControls } from "@/components/fall/FallControls";

const handlers = () => ({ onRetry: jest.fn(), onMore: jest.fn(), onTour: jest.fn(), onDeclineTour: jest.fn() });
const props = (over: Partial<ComponentProps<typeof FallControls>> = {}): ComponentProps<typeof FallControls> => ({
  className: "",
  mode: "deeper",
  risingCount: 4,
  growing: false,
  hasDived: false,
  offerTour: false,
  habitLine: null,
  ...handlers(),
  ...over,
});

describe("<FallControls>", () => {
  it("says questions are on their way while the first ones stream in, in each direction's voice", () => {
    const { rerender } = render(<FallControls {...props({ risingCount: 0, growing: true })} />);
    expect(screen.getByText("Questions are rising from below…")).toBeInTheDocument();
    rerender(<FallControls {...props({ risingCount: 0, growing: true, mode: "astray" })} />);
    expect(screen.getByText("Turning away from your usual paths…")).toBeInTheDocument();
  });

  it("offers Let others rise once questions have risen", async () => {
    const p = props();
    render(<FallControls {...p} />);
    expect(screen.getByText(/Tap a question to fall into it/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "↻ Let others rise" }));
    expect(p.onMore).toHaveBeenCalled();
  });

  it("shows an error with Try again", async () => {
    const p = props({ error: "The rabbit took too long to come back." });
    render(<FallControls {...p} />);
    expect(screen.getByRole("alert")).toHaveTextContent("The rabbit took too long to come back.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(p.onRetry).toHaveBeenCalled();
  });

  it("has the rabbit name your habits in Astray", () => {
    render(<FallControls {...props({ mode: "astray", habitLine: "You keep choosing playful questions. Not this time." })} />);
    expect(screen.getByText("You keep choosing playful questions. Not this time.")).toBeInTheDocument();
  });

  it("offers the tour only when asked to, with Take the tour and Not now", async () => {
    const { rerender } = render(<FallControls {...props()} />);
    expect(screen.queryByText("First time down here?")).not.toBeInTheDocument();
    const p = props({ offerTour: true });
    rerender(<FallControls {...p} />);
    await userEvent.click(screen.getByRole("button", { name: "Take the tour" }));
    expect(p.onTour).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(p.onDeclineTour).toHaveBeenCalled();
  });
});
