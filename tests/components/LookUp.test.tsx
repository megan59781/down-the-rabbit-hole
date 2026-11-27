/** @jest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LookUp } from "@/components/fall/LookUp";
import { makeSession } from "../support/session";

jest.mock("@/lib/share/cards", () => ({
  renderCard: jest.fn(async () => new Blob(["png"], { type: "image/png" })),
}));

beforeAll(() => {
  URL.createObjectURL = jest.fn(() => "blob:card");
  URL.revokeObjectURL = jest.fn();
});

const fall = makeSession(
  [
    ["r", null, "Why do we keep things we never use?"],
    ["a", "r", "What makes an object feel like part of us?"],
    ["a2", "r", "Is clutter a kind of hope?"],
    ["b", "a", "Do objects remember the hands that held them?", "stranger"],
  ],
  "b",
);

describe("<LookUp>", () => {
  it("shows the way down, with the questions you passed beside it, and lets you jump back in", async () => {
    const user = userEvent.setup();
    const onJump = jest.fn();
    render(<LookUp session={fall} onJump={onJump} onClose={() => {}} />);
    expect(screen.getByRole("tab", { name: /Your fall/ })).toHaveAttribute("aria-selected", "true");
    const page = screen.getByRole("tabpanel");
    expect(within(page).getByText("Why do we keep things we never use?")).toBeInTheDocument();
    await user.click(within(page).getByText("Is clutter a kind of hope?"));
    expect(onJump).toHaveBeenCalledWith("a2");
  });

  it("switches to About you, by click or with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<LookUp session={fall} onJump={() => {}} onClose={() => {}} />);
    await user.click(screen.getByRole("tab", { name: /About you/ }));
    expect(await screen.findByText(/What the rabbit has learnt about you/i)).toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    expect(await screen.findByRole("tab", { name: /Your fall/, selected: true })).toBeInTheDocument();
  });

  it("opens Share, and Escape then closes Share rather than Look up", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<LookUp session={fall} onJump={() => {}} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Share" }));
    expect(await screen.findByRole("heading", { name: "Share" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Share" })).not.toBeInTheDocument());
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
