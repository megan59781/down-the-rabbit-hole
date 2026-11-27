/** @jest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tour, TOURED_KEY } from "@/components/fall/Tour";

beforeEach(() => window.localStorage.clear());

describe("<Tour>", () => {
  it("walks through the steps with Next and Back, and finishes with Start falling", async () => {
    const user = userEvent.setup();
    const onDone = jest.fn();
    render(<Tour onDone={onDone} />);

    expect(await screen.findByText("The question you're holding")).toBeInTheDocument();
    expect(screen.getByText("1 / 7")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Questions rise")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(await screen.findByText("The question you're holding")).toBeInTheDocument();

    for (let i = 0; i < 6; i++) await user.click(await screen.findByRole("button", { name: "Next" }));
    await user.click(await screen.findByRole("button", { name: "Start falling ↓" }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(TOURED_KEY)).toBe("1");
  });

  it("focuses each new card as it appears, so keyboard users keep their place", async () => {
    const user = userEvent.setup();
    render(<Tour onDone={() => {}} />);
    await user.click(await screen.findByRole("button", { name: "Next" }));
    const card = await screen.findByRole("dialog");
    expect(card).toHaveTextContent("Questions rise");
    expect(card).toHaveFocus();
  });

  it("asks before ending when you click outside the card", async () => {
    const user = userEvent.setup();
    const onDone = jest.fn();
    const { container } = render(<Tour onDone={onDone} />);
    await user.click(await screen.findByRole("button", { name: "Next" }));
    await screen.findByText("Questions rise");

    // Clicking the dimmed hole around the card.
    fireEvent.click(container.firstElementChild!);
    expect(await screen.findByText("End the tour?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep going" }));
    expect(await screen.findByText("Questions rise")).toBeInTheDocument(); // back where you were
    expect(onDone).not.toHaveBeenCalled();

    fireEvent.click(container.firstElementChild!);
    await user.click(await screen.findByRole("button", { name: "End tour" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("ends straight away with Escape, and moves with the arrow keys", async () => {
    const onDone = jest.fn();
    render(<Tour onDone={onDone} />);
    await screen.findByText("The question you're holding");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(await screen.findByText("Questions rise")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
