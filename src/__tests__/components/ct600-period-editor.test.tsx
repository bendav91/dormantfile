/**
 * @vitest-environment jsdom
 */

import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const refresh = vi.fn();

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import Ct600PeriodEditor from "@/components/ct600-period-editor";

const baseProps = {
  companyId: "company-1",
  accountsPeriodStartISO: "2023-01-01",
  accountsPeriodEndISO: "2024-03-31",
  suggested: [
    { startISO: "2023-01-01", endISO: "2023-12-31" },
    { startISO: "2024-01-01", endISO: "2024-03-31" },
  ],
  immutable: [] as { startISO: string; endISO: string; status: string }[],
  onClose: vi.fn(),
};

describe("Ct600PeriodEditor", () => {
  beforeEach(() => {
    refresh.mockReset();
    (baseProps.onClose as ReturnType<typeof vi.fn>).mockReset();
    vi.restoreAllMocks();
  });

  it("renders one editable row per suggested entry and the read-only accounts-period header", () => {
    render(<Ct600PeriodEditor {...baseProps} />);

    // Dialog semantics
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");

    // One editable row per suggested entry: start + end date inputs each
    const dateInputs = screen
      .getAllByTestId("ctap-row")
      .flatMap((row) => within(row).getAllByDisplayValue(/2023|2024/));
    expect(screen.getAllByTestId("ctap-row")).toHaveLength(2);

    expect(screen.getByDisplayValue("2023-01-01")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2023-12-31")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2024-01-01")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2024-03-31")).toBeInTheDocument();
    expect(dateInputs.length).toBeGreaterThanOrEqual(4);

    // Read-only accounts-period header reflects the props span
    const header = screen.getByTestId("accounts-period-header");
    expect(header).toHaveTextContent(/2023/);
    expect(header).toHaveTextContent(/2024/);

    // Valid suggested chain → Save enabled
    expect(screen.getByRole("button", { name: /save/i })).toBeEnabled();
  });

  it("shows a validation error and disables Save when a row exceeds 12 months", () => {
    render(<Ct600PeriodEditor {...baseProps} />);

    // Edit first row's end date to make it span more than 12 months
    const firstEnd = screen.getByDisplayValue("2023-12-31");
    fireEvent.change(firstEnd, { target: { value: "2024-06-30" } });

    // Real validateCtapChain produces the "cannot exceed 12 months" message.
    // It appears both in the static explainer and as a validation list item;
    // assert the per-period validation error is present (Period N prefix).
    expect(
      screen.getByText(/Period 1: a CT accounting period cannot exceed 12 months/i),
    ).toBeInTheDocument();

    // Save disabled while invalid
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("POSTs the exact body to /api/company/ct600-periods and refreshes on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, count: 2 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Ct600PeriodEditor {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/company/ct600-periods");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      companyId: "company-1",
      accountsPeriodStartISO: "2023-01-01",
      accountsPeriodEndISO: "2024-03-31",
      periods: [
        { startISO: "2023-01-01", endISO: "2023-12-31" },
        { startISO: "2024-01-01", endISO: "2024-03-31" },
      ],
    });

    // Allow the awaited fetch/json microtasks to flush
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it("shows the server error message when the response is not OK", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "A period in this span has already been filed." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Ct600PeriodEditor {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByText(/already been filed/i),
    ).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("renders immutable rows read-only and excludes them from the submitted body", () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, count: 2 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <Ct600PeriodEditor
        {...baseProps}
        immutable={[
          { startISO: "2022-01-01", endISO: "2022-12-31", status: "accepted" },
        ]}
      />,
    );

    // Immutable row shown
    expect(screen.getByTestId("ctap-immutable-row")).toHaveTextContent(/accepted/i);

    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    // Immutable period is NOT submitted
    expect(body.periods).toEqual([
      { startISO: "2023-01-01", endISO: "2023-12-31" },
      { startISO: "2024-01-01", endISO: "2024-03-31" },
    ]);
  });

  it("closes the modal when Escape is pressed", () => {
    render(<Ct600PeriodEditor {...baseProps} />);

    expect(baseProps.onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });
});
