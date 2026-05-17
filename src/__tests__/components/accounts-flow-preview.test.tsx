/**
 * @vitest-environment jsdom
 */

import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

// Mock next/navigation — AccountsFlow calls useRouter for handleDashboard.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import AccountsFlow from "@/app/(app)/file/[companyId]/accounts/accounts-flow";

// Full set of required props (companyId, companyName, companyRegistrationNumber,
// periodStart, periodEnd, periodStartISO, periodEndISO, shareCapitalPence, filingId).
const baseProps = {
  companyId: "cmp-1",
  companyName: "Test Co Ltd",
  companyRegistrationNumber: "12345678",
  periodStart: "1 January 2024",
  periodEnd: "31 December 2024",
  periodStartISO: "2024-01-01",
  periodEndISO: "2024-12-31",
  shareCapitalPence: 100,
  filingId: "f1",
};

/**
 * Returns a fetch stub that:
 *   - Resolves GET /api/company/directors with a single director ("Jane") so the
 *     component auto-selects it and the Continue button becomes enabled.
 *   - Leaves any other calls unmatched (should not arise in these tests).
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
    // Unexpected call — return a safe fallback so tests don't hang.
    return Promise.resolve({ ok: false, json: async () => ({}) });
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AccountsFlow — preview step", () => {
  it("shows the Preview step after confirm Continue, then auth step after preview Continue", async () => {
    // Stub global.fetch so DirectorConfirm can load its single director.
    const fetchStub = makeDirectorsFetch();
    vi.stubGlobal("fetch", fetchStub);

    render(<AccountsFlow {...baseProps} />);

    // Wait for the single director ("Jane") to auto-select so Continue is enabled.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();
    });

    // Auth step must NOT be visible yet.
    expect(screen.queryByText(/companies house authentication/i)).not.toBeInTheDocument();

    // ── Confirm → Preview ────────────────────────────────────────────────────
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    // Preview heading is present.
    expect(
      screen.getByRole("heading", { name: /review the accounts to be filed/i }),
    ).toBeInTheDocument();

    // The iframe with the correct preview src is present.
    const iframe = screen.getByTitle("Dormant accounts to be filed");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src", "/api/file/preview-accounts?filingId=f1");

    // Auth step is still NOT visible.
    expect(screen.queryByText(/companies house authentication/i)).not.toBeInTheDocument();

    // ── Preview → Authenticate ───────────────────────────────────────────────
    // The preview card has two buttons; the Continue is the second one.
    const continueButtons = screen.getAllByRole("button", { name: /continue/i });
    // There should be exactly one Continue on the preview step.
    expect(continueButtons).toHaveLength(1);
    fireEvent.click(continueButtons[0]);

    // Companies House authentication step is now visible.
    expect(
      screen.getByRole("heading", { name: /companies house authentication/i }),
    ).toBeInTheDocument();

    // Preview heading is gone.
    expect(
      screen.queryByRole("heading", { name: /review the accounts to be filed/i }),
    ).not.toBeInTheDocument();
  });

  it("navigates Back from preview to the confirm step", async () => {
    const fetchStub = makeDirectorsFetch();
    vi.stubGlobal("fetch", fetchStub);

    render(<AccountsFlow {...baseProps} />);

    // Wait for director auto-select.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();
    });

    // Confirm → Preview.
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(
      screen.getByRole("heading", { name: /review the accounts to be filed/i }),
    ).toBeInTheDocument();

    // Click Back.
    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    // We should be back on the confirm step (heading "File annual accounts").
    expect(
      screen.getByRole("heading", { name: /file annual accounts/i }),
    ).toBeInTheDocument();

    // Preview heading is gone.
    expect(
      screen.queryByRole("heading", { name: /review the accounts to be filed/i }),
    ).not.toBeInTheDocument();
  });
});
