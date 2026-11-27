/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GravityToggle } from "@/components/fall/GravityToggle";

describe("<GravityToggle>", () => {
  it("shows the three directions as a radio group, with the current one checked", () => {
    render(<GravityToggle mode="stranger" onChange={() => {}} />);
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.textContent?.replace(/[^A-Za-z]/g, ""))).toEqual(["Deeper", "Stranger", "Astray"]);
    expect(screen.getByRole("radio", { name: /Stranger/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Deeper/ })).toHaveAttribute("aria-checked", "false");
  });

  it("changes direction, and ignores a click on the one you're already in", async () => {
    const onChange = jest.fn();
    render(<GravityToggle mode="deeper" onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: /Deeper/ }));
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("radio", { name: /Astray/ }));
    expect(onChange).toHaveBeenCalledWith("astray");
  });
});
