/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import type { OnboardingState } from "@/lib/onboarding";

// Stub the server-action module so the test never loads @/lib/db
// (which throws at import without POSTGRES_URL). The OnboardingState
// import above is type-only and erased at runtime — @/lib/onboarding is
// pure, so it does not need mocking.
vi.mock("@/lib/onboarding-actions", () => ({ dismissOnboarding: vi.fn() }));

function state(overrides: Partial<OnboardingState> = {}): OnboardingState {
  return {
    steps: [
      { key: "company", label: "Add your company", done: true, locked: false, href: "/onboarding" },
      { key: "plan", label: "Choose your plan", done: false, locked: false, href: "/choose-plan" },
      {
        key: "file",
        label: "File your first return",
        subLabel: "Accounts or CT600 — whichever's due first.",
        done: false,
        locked: false,
        href: "/company/c1",
      },
    ],
    activeStepKey: "plan",
    complete: false,
    visible: true,
    ...overrides,
  };
}

describe("OnboardingChecklist", () => {
  it("renders nothing when not visible and not complete", () => {
    const { container } = render(
      <OnboardingChecklist state={state({ visible: false, complete: false })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders all step labels when visible", () => {
    render(<OnboardingChecklist state={state()} />);
    expect(screen.getByText("Add your company")).toBeInTheDocument();
    expect(screen.getByText("Choose your plan")).toBeInTheDocument();
    expect(screen.getByText("File your first return")).toBeInTheDocument();
  });

  it("shows the active step's CTA as a link to its href", () => {
    render(<OnboardingChecklist state={state()} />);
    const cta = screen.getByRole("link", { name: /continue/i });
    expect(cta).toHaveAttribute("href", "/choose-plan");
  });

  it("renders a locked step's note and no link for it", () => {
    render(
      <OnboardingChecklist
        state={state({
          steps: [
            { key: "company", label: "Add your company", done: true, locked: false, href: "/onboarding" },
            {
              key: "plan",
              label: "Choose your plan",
              done: false,
              locked: true,
              lockedNote: "Opens soon — we'll email you.",
              href: "/choose-plan",
            },
            {
              key: "file",
              label: "File your first return",
              done: false,
              locked: true,
              lockedNote: "Filing opens soon — we'll email you the moment it does.",
              href: "/dashboard",
            },
          ],
          activeStepKey: null,
        })}
      />,
    );
    expect(screen.getByText("Opens soon — we'll email you.")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /choose your plan/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the complete state with a soft pointer", () => {
    render(<OnboardingChecklist state={state({ complete: true, visible: false })} />);
    expect(screen.getByText(/you're set/i)).toBeInTheDocument();
  });

  it("has a Hide this control when visible", () => {
    render(<OnboardingChecklist state={state()} />);
    expect(screen.getByRole("button", { name: /hide this/i })).toBeInTheDocument();
  });
});
