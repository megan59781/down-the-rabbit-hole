/** @jest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareSheet } from "@/components/fall/ShareSheet";
import { renderCard } from "@/lib/share/cards";
import { makeSession } from "../support/session";

// Drawing needs a real canvas; here we only care what's asked for and what the sheet does.
jest.mock("@/lib/share/cards", () => ({
  renderCard: jest.fn(async () => new Blob(["png"], { type: "image/png" })),
}));
const renderCardMock = renderCard as jest.MockedFunction<typeof renderCard>;

beforeAll(() => {
  URL.createObjectURL = jest.fn(() => "blob:card");
  URL.revokeObjectURL = jest.fn();
});
beforeEach(() => {
  renderCardMock.mockClear();
  window.localStorage.clear();
});

const fall = makeSession(
  [
    ["r", null, "Why does the first sip of tea taste the best?"],
    ["a", "r", "Do taste buds get bored?"],
    ["a2", "r", "Is the first sip mostly memory?"],
    ["b", "a", "What's in your cupboard?", "deeper", { answer: "Three kinds of tea" }],
  ],
  "b",
);

const lastRequest = () => renderCardMock.mock.calls.at(-1)![0];

describe("<ShareSheet>", () => {
  it("starts on your fall, in Story size, with your answers and the roads not taken left off", async () => {
    render(<ShareSheet session={fall} initial="path" onClose={() => {}} />);
    await waitFor(() => expect(renderCardMock).toHaveBeenCalled());
    const request = lastRequest();
    expect(request).toMatchObject({ kind: "path", format: "story" });
    expect(request.kind === "path" && request.data).toMatchObject({ includeAnswers: false, showPassed: false });
    expect(screen.getByRole("radio", { name: "Story" })).toHaveAttribute("aria-checked", "true");
  });

  it("switches put the roads not taken and your answers on the card", async () => {
    const user = userEvent.setup();
    render(<ShareSheet session={fall} initial="path" onClose={() => {}} />);
    await user.click(screen.getByRole("switch", { name: "Show the questions I didn't pick" }));
    await user.click(screen.getByRole("switch", { name: "Include my answers to the rabbit" }));
    await waitFor(() => {
      const r = lastRequest();
      expect(r.kind === "path" && r.data).toMatchObject({ includeAnswers: true, showPassed: true });
    });
    const r = lastRequest();
    expect(r.kind === "path" && r.data.steps[1].passed).toEqual(["Is the first sip mostly memory?"]);
  });

  it("keeps the caption hidden until you've shared, then offers it to paste", async () => {
    const user = userEvent.setup();
    render(<ShareSheet session={fall} initial="path" onClose={() => {}} />);
    expect(screen.queryByText(/I fell 2 questions down the rabbit hole/)).not.toBeInTheDocument();
    const download = await screen.findByRole("button", { name: "Download" });
    await waitFor(() => expect(download).toBeEnabled());
    await user.click(download);
    expect(await screen.findByText(/I fell 2 questions down the rabbit hole/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy caption" })).toBeInTheDocument();
  });

  it("waits for the rabbit to learn something before offering About you", async () => {
    render(<ShareSheet session={fall} initial="you" onClose={() => {}} />);
    expect(await screen.findByText(/hasn.t learnt enough about you yet/)).toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    const onClose = jest.fn();
    render(<ShareSheet session={fall} initial="path" onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
