/** @jest-environment jsdom */
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BeginJourney } from "@/components/landing/BeginJourney";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push, prefetch: jest.fn() }) }));

beforeEach(() => {
  push.mockClear();
  window.localStorage.clear();
});

describe("<BeginJourney>", () => {
  // Regression: a reset meant for returning to the page also ran on first load, wiping anything
  // typed in the first moment (it hit slow phones, and every automated test).
  it("keeps what you type straight after the page loads", async () => {
    const user = userEvent.setup();
    render(<BeginJourney />);
    await user.type(screen.getByLabelText("Your question"), "Why is yawning contagious?");
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(screen.getByLabelText("Your question")).toHaveValue("Why is yawning contagious?");
  });

  it("starts a fall and saves it, so it can be returned to", async () => {
    const user = userEvent.setup();
    render(<BeginJourney />);
    await user.type(screen.getByLabelText("Your question"), "What if cities could remember?{Enter}");
    // After the jump-in animation (about 1.3 s), into the new fall.
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/explore\//)), { timeout: 3000 });
    expect(window.localStorage.getItem("rabbit-hole:sessions:v3")).toContain("What if cities could remember?");
  });
});
