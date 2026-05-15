/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const updateMock = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => ({ update: updateMock }),
}));

import { ImpersonateButton } from "@/components/admin/ImpersonateButton";

describe("ImpersonateButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "" },
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("does nothing if the confirm dialog is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ImpersonateButton userId="cust1" name="Acme Ltd" />);
    fireEvent.click(screen.getByRole("button", { name: /impersonate/i }));
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("on success calls update and navigates to /dashboard", async () => {
    updateMock.mockResolvedValue({ impersonating: true });
    render(<ImpersonateButton userId="cust1" name="Acme Ltd" />);
    fireEvent.click(screen.getByRole("button", { name: /impersonate/i }));
    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith({ impersonate: "cust1" }),
    );
    await waitFor(() => expect(window.location.href).toBe("/dashboard"));
  });

  it("on failure shows an error and does NOT navigate", async () => {
    updateMock.mockResolvedValue({ impersonating: undefined });
    render(<ImpersonateButton userId="cust1" name={null} />);
    fireEvent.click(screen.getByRole("button", { name: /impersonate/i }));
    expect(
      await screen.findByText(/could not start impersonation/i),
    ).toBeInTheDocument();
    expect(window.location.href).toBe("");
  });
});
