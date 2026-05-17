/**
 * @vitest-environment jsdom
 */

import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

// Mock next/navigation — FilingFlow calls useRouter for handleDashboard.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import FilingFlow from "@/app/(app)/file/[companyId]/ct600/filing-flow";

// Full set of required props.
const baseProps = {
  companyId: "cmp-1",
  companyName: "Test Co Ltd",
  uniqueTaxReference: "1234567890",
  declarantName: "Jane Smith",
  periodStart: "1 January 2024",
  periodEnd: "31 December 2024",
  periodStartISO: "2024-01-01",
  periodEndISO: "2024-12-31",
  filingId: "f1",
};

/**
 * Returns a fetch stub that resolves GET /api/company/directors with a single
 * director ("Jane") so the component auto-selects it and Continue becomes enabled.
 */
function makeDirectorsFetch() {
  return vi.fn().mockImplementation((url: string) => {
    if (typeof url === "string" && url.includes("/api/company/directors")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          directors: [{ name: "Jane", appointedOn: null }],
          saved: "Jane",
          chError: false,
        }),
      });
    }
    // Unexpected call — safe fallback.
    return Promise.resolve({ ok: false, json: async () => ({}) });
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FilingFlow — preview step", () => {
  it("shows the Preview step after confirm Continue, then credentials step after preview Continue", async () => {
    const fetchStub = makeDirectorsFetch();
    vi.stubGlobal("fetch", fetchStub);

    render(<FilingFlow {...baseProps} />);

    // Wait for the single director ("Jane") to auto-select so Continue is enabled.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();
    });

    // Credentials step must NOT be visible yet.
    expect(
      screen.queryByText(/government gateway/i),
    ).not.toBeInTheDocument();

    // ── Confirm → Preview ────────────────────────────────────────────────────
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    // Preview heading is present.
    expect(
      screen.getByRole("heading", { name: /review the return to be filed/i }),
    ).toBeInTheDocument();

    // The iframe with the computations preview src is present.
    const iframe = screen.getByTitle("Corporation Tax computations");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      "src",
      "/api/file/preview-computations?filingId=f1",
    );

    // A secondary link to the attached accounts iXBRL is present.
    const accountsLink = screen.getByRole("link", { name: /view attached accounts/i });
    expect(accountsLink).toBeInTheDocument();
    expect(accountsLink).toHaveAttribute(
      "href",
      "/api/file/preview-accounts?filingId=f1",
    );

    // Credentials step is still NOT visible.
    expect(
      screen.queryByText(/government gateway user id/i),
    ).not.toBeInTheDocument();

    // ── Preview → Credentials ────────────────────────────────────────────────
    const continueButtons = screen.getAllByRole("button", { name: /continue/i });
    // There should be exactly one Continue on the preview step.
    expect(continueButtons).toHaveLength(1);
    fireEvent.click(continueButtons[0]);

    // Government Gateway credentials step is now visible.
    expect(
      screen.getByRole("heading", { name: /government gateway credentials/i }),
    ).toBeInTheDocument();

    // Preview heading is gone.
    expect(
      screen.queryByRole("heading", { name: /review the return to be filed/i }),
    ).not.toBeInTheDocument();
  });

  it("navigates Back from preview to the confirm step", async () => {
    const fetchStub = makeDirectorsFetch();
    vi.stubGlobal("fetch", fetchStub);

    render(<FilingFlow {...baseProps} />);

    // Wait for director auto-select.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();
    });

    // Confirm → Preview.
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(
      screen.getByRole("heading", { name: /review the return to be filed/i }),
    ).toBeInTheDocument();

    // Click Back.
    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    // We should be back on the confirm step (heading "Review and confirm").
    expect(
      screen.getByRole("heading", { name: /review and confirm/i }),
    ).toBeInTheDocument();

    // Preview heading is gone.
    expect(
      screen.queryByRole("heading", { name: /review the return to be filed/i }),
    ).not.toBeInTheDocument();
  });
});
