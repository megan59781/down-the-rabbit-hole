/** @jest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HowItWorks } from "@/components/landing/HowItWorks";

describe("<HowItWorks> on the landing page", () => {
  it("explains the idea and points to the tour, then closes back to the ?", async () => {
    const user = userEvent.setup();
    render(<HowItWorks />);
    const trigger = screen.getByRole("button", { name: "How it works" });
    await user.click(trigger);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("A place for questions");
    expect(dialog).toHaveTextContent("Ask anything. You won't get an answer.");
    expect(dialog).toHaveTextContent(/for a quick tour/);

    await user.keyboard("{Escape}");
    // It fades out before it goes.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("closes with Got it too", async () => {
    const user = userEvent.setup();
    render(<HowItWorks />);
    await user.click(screen.getByRole("button", { name: "How it works" }));
    await user.click(await screen.findByRole("button", { name: "Got it" }));
    // It fades out before it goes.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
