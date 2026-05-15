/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const updateMock = vi.fn();
let sessionData: unknown = null;
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: sessionData, update: updateMock }),
}));

import { ImpersonationBanner } from "@/components/ImpersonationBanner";

describe("ImpersonationBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionData = null;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "" },
    });
  });

  it("renders nothing when not impersonating", () => {
    sessionData = { impersonating: false };
    const { container } = render(<ImpersonationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when session is null (loading)", () => {
    sessionData = null;
    const { container } = render(<ImpersonationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the impersonated name when impersonating", () => {
    sessionData = { impersonating: true, impersonatedName: "Acme Ltd" };
    render(<ImpersonationBanner />);
    expect(screen.getByText(/impersonating/i)).toHaveTextContent("Acme Ltd");
  });

  it("Stop calls update({stopImpersonating}) and navigates to /admin", async () => {
    sessionData = { impersonating: true, impersonatedName: "Acme Ltd" };
    updateMock.mockResolvedValue({});
    render(<ImpersonationBanner />);
    fireEvent.click(screen.getByRole("button", { name: /stop/i }));
    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith({ stopImpersonating: true }),
    );
    await waitFor(() => expect(window.location.href).toBe("/admin"));
  });
});
