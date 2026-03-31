# Trust & Conversion Improvements Design

## Context

DormantFile has strong positioning, clear pricing, and good content — but the site doesn't yet earn enough trust for a product that handles government filings and credentials. The messaging explains the value well; the gap is confidence. This spec addresses six areas identified in a comprehensive site audit: homepage trust section, distributed micro-trust signals, launch state clarity, FAQ enrichment, product preview visuals, and social proof infrastructure.

### Constraints

- Founder identity: first name (Ben) + short bio, no surname or photo
- No company registration number (sole trader)
- Filing is not yet live — signups work, filing flow is not enabled yet
- Product visuals: placeholder UI components, not real screenshots
- FAQ stays in frontmatter YAML (no infrastructure restructure)
- Styling: Tailwind CSS v4, CSS custom properties (`--color-*`), dark mode via `.dark` class

---

## 1. Homepage Trust Section

### What

A new section on the homepage consolidating trust signals: founder identity, official API usage, credential handling, support SLA, and refund policy.

### Where

`src/app/page.tsx` — new section between the Pricing section and the mini-FAQ section. This placement catches visitors at the decision point: they've seen the price and are evaluating whether to trust the product.

### Layout

Two-column on desktop (grid-cols-2), stacked on mobile.

**Left column — Founder card:**

- Heading: "Built by Ben"
- Bio: "Software engineer based in the UK. I built DormantFile because dormant company filing shouldn't require an accountant or expensive software." (2 sentences, written in first person for authenticity)
- Icon: a code/terminal-style icon (from lucide-react, e.g., `Terminal` or `Code2`) as a visual anchor instead of a photo
- Subtle background card with border

**Right column — 2×2 trust grid:**
Each item: icon (lucide-react) + heading + one-line description.

1. **Official APIs** (icon: `Shield`) — "Files directly via HMRC GovTalk and Companies House Software Filing APIs"
2. **Credentials never stored** (icon: `KeyRound`) — "Your Gateway password is used once at submission, then immediately discarded"
3. **Email support** (icon: `MessageCircle`) — "Replies within one working day"
4. **14-day refund** (icon: `RotateCcw`) — "Full refund within 14 days if you haven't filed"

### New Component

`src/components/marketing/TrustSection.tsx`

### Relationship with existing trust indicators

The homepage already has a 3-column trust strip immediately below the hero ("Credentials never stored", "File in under 2 minutes", "Direct submission"). That section stays — it serves the top-of-page quick-scan. The new TrustSection serves a different position: below pricing, at the decision point, with more depth (founder identity, specific API names, support/refund commitments). Some messaging overlap is intentional — repetition of key trust points at different funnel stages.

### Implementation Notes

- Uses the site's existing CSS custom properties for colours
- Dark mode compatible via existing `.dark` class token system
- Section heading: "Why trust DormantFile?" or "Built for trust" (test which feels better)
- Responsive: on mobile, founder card stacks above the trust grid

---

## 2. Distributed Micro-Trust Signals

### What

Small, muted text badges (icon + one-liner) placed near CTAs across the site. These reinforce trust at the moment of action without being heavy.

### New Component

`src/components/marketing/MicroTrust.tsx`

Props: `icon: LucideIcon`, `text: string`, optional `className`.

Renders as: small inline-flex row, `text-xs` (12px) muted text (`--color-text-secondary`), icon at 14px. Subtle, not attention-grabbing.

### Placements

**Homepage hero (src/app/page.tsx):**
Below the hero CTA button, two MicroTrust badges:

- `Shield` + "Files via official government APIs"
- `KeyRound` + "Credentials used once, never stored"

**Homepage pricing cards (src/app/page.tsx):**
Below each pricing card's CTA button:

- `RotateCcw` + "14-day refund guarantee"

**Homepage final CTA section (src/app/page.tsx):**
Below the final CTA button, a single line:

- "Official APIs · Credentials never stored · Cancel anytime"

**ContentCTA component (src/components/marketing/ContentCTA.tsx):**
Below the existing "Get started →" link:

- `Shield` + "Official government APIs · Credentials never stored"

### Implementation Notes

- MicroTrust is a pure presentational component, no logic
- All text is hardcoded at each placement (no config needed)
- Spacing: `mt-3` below the CTA it accompanies

---

## 3. Launch State Resolution

### What

Replace the confusing `isPreviewMode` / `LaunchBanner` system with a clean `isFilingLive` flag that controls all CTA text and launch messaging site-wide.

### Mechanism

**New utility:** `src/lib/launch-mode.ts`

```ts
export function isFilingLive(): boolean {
  return process.env.NEXT_PUBLIC_FILING_LIVE === "true";
}
```

**Environment variable:** `NEXT_PUBLIC_FILING_LIVE=false` (add to `.env` and Vercel env vars). On launch day, flip to `true`.

### CTA Text Changes

| Location          | When NOT live               | When live                   |
| ----------------- | --------------------------- | --------------------------- |
| Hero CTA          | "Set up your account"       | "Start filing"              |
| Pricing card CTAs | "Get started" (unchanged)   | "Get started" (unchanged)   |
| Final CTA heading | "Get ready to file"         | "Start filing today"        |
| Final CTA button  | "Set up your account"       | "Start filing"              |
| ContentCTA button | "Get started →" (unchanged) | "Get started →" (unchanged) |

**Hero inline notice (when NOT live):**
Below the hero CTA and micro-trust badges, a single muted line:
"Filing opens soon — set up now so you're ready on day one."

This line disappears entirely when `isFilingLive()` returns true.

### Note on `NEXT_PUBLIC_FILING_LIVE`

This is a `NEXT_PUBLIC_` env var, so it's inlined at build time by Next.js. Flipping it in Vercel requires a redeploy. On launch day: change the env var, trigger a redeploy.

### Full `isPreviewMode` Migration

The current `isPreviewMode` utility is used in **7+ files**. Replacing it with `isFilingLive()` **inverts the boolean semantics**: `isPreviewMode` was truthy when filing was NOT live, while `isFilingLive()` is truthy when filing IS live. Every consumer's condition must be flipped.

| File                                     | Current usage                                  | New usage                                       |
| ---------------------------------------- | ---------------------------------------------- | ----------------------------------------------- |
| `src/app/page.tsx`                       | CTA text conditional on `isPreviewMode`        | Use `isFilingLive()` with inverted logic        |
| `src/app/(marketing)/layout.tsx`         | Renders `<LaunchBanner>`                       | Remove LaunchBanner entirely                    |
| `src/app/(app)/layout.tsx`               | Renders `<LaunchBanner variant="app">`         | Remove LaunchBanner entirely                    |
| `src/components/filings-tab.tsx`         | `!isPreviewMode && ...` to show filing buttons | `isFilingLive() && ...`                         |
| `src/components/subscription-banner.tsx` | Returns null in preview mode                   | Returns null when `!isFilingLive()`             |
| `src/app/(app)/choose-plan/page.tsx`     | `disabled={isPreviewMode}` on PlanPicker       | `disabled={!isFilingLive()}`                    |
| `src/app/api/cron/reminders/route.ts`    | Short-circuits in preview mode                 | Short-circuits when `!isFilingLive()`           |
| `src/env.d.ts`                           | Declares `NEXT_PUBLIC_LAUNCH_MODE?: string`    | Replace with `NEXT_PUBLIC_FILING_LIVE?: string` |

### Removal

- Delete `src/components/launch-banner.tsx`
- Remove all `LaunchBanner` imports/usage from layouts
- Remove the `isPreviewMode` utility entirely
- Remove `NEXT_PUBLIC_LAUNCH_MODE` from env.d.ts

### Files Modified

- `src/app/page.tsx` — CTA text conditional on `isFilingLive()`
- `src/components/filings-tab.tsx` — flip `isPreviewMode` to `isFilingLive()`
- `src/components/subscription-banner.tsx` — flip condition
- `src/app/(app)/choose-plan/page.tsx` — flip `disabled` prop
- `src/app/api/cron/reminders/route.ts` — flip guard condition
- `src/app/(marketing)/layout.tsx` — remove LaunchBanner
- `src/app/(app)/layout.tsx` — remove LaunchBanner
- `src/env.d.ts` — update type declaration
- `src/components/marketing/ContentCTA.tsx` — no changes needed (text stays generic)
- New: `src/lib/launch-mode.ts`
- Delete: `src/components/launch-banner.tsx`

---

## 4. FAQ Enrichment

### What

Expand the 8 most important existing FAQ answers from 1-2 sentences to 4-6 sentences each. Add 6 new questions that address common objections and edge cases. All changes in `content/pages/faq.mdx` frontmatter YAML.

### Existing Answers to Expand

**Filing category:**

1. **"What filings does DormantFile handle?"**
   Expand to: Explain both filings (dormant company accounts to Companies House, nil CT600 return to HMRC). Mention the specific APIs used. Note that both are submitted electronically. Explain that DormantFile covers the complete annual filing obligation for a dormant company.

2. **"What if I'm behind on my filings?"**
   Expand to: Explain catch-up mechanics — DormantFile detects outstanding periods and lets you file them in sequence. Note that Companies House and HMRC track periods independently. Mention late filing penalties briefly and link context.

3. **"Can I use DormantFile if my company has a Bounce Back Loan?"**
   Expand to: Explain that a BBL doesn't necessarily make a company non-dormant for Companies Act purposes, but HMRC may view it differently. Recommend checking with HMRC if unsure. Be honest about the grey area.

4. **"What happens after I file?"**
   Expand to: Explain the full confirmation flow — submission via API, polling for response, dashboard status update, email confirmation. Note typical turnaround times (CH usually minutes, HMRC can take hours/days). Explain what "accepted" and "rejected" mean.

**Security category:**

5. **"Is my data secure?"**
   Expand to: Consolidate key security page highlights — TLS encryption, bcrypt password hashing, Stripe for payments, credentials used once and discarded, minimal cookies. Keep it concise but substantive.

6. **"How do you handle my HMRC Gateway credentials?"**
   Expand to: Full explanation — entered at filing time only, transmitted directly to HMRC over TLS, used to authenticate the submission, immediately discarded, never written to database, never logged.

7. **"How do you handle my Companies House authentication code?"**
   Expand to: Same pattern — entered at filing time, included in the submission XML, transmitted to Companies House, never stored.

**Pricing category:**

8. **"Is there a free trial?"**
   Expand to: Reframe — no free trial, but the 14-day refund policy means you can try the service risk-free. If you sign up and decide not to file within 14 days, you get a full refund. At £19/year, it's less than most accountants charge for a single filing.

### New Questions to Add

**Filing category (add these):**

9. **"What happens if HMRC or Companies House rejects my filing?"**
   Answer: Explain that rejections are rare for dormant filings but can happen (wrong credentials, company not registered for CT, period mismatch). DormantFile shows the rejection reason in the dashboard. You can correct and resubmit. Email support is available.

10. **"Can I amend a filing after it's been accepted?"**
    Answer: Be honest — once accepted, amendments need to be filed separately through official channels. DormantFile doesn't currently support amendment filings. For dormant accounts, amendments are extremely rare since the figures are standardised.

11. **"Is this my first year — can I still use DormantFile?"**
    Answer: Yes. First-year filings work the same as subsequent years. DormantFile calculates your first accounting period from incorporation date to your accounting reference date. If your company was incorporated within the current period, DormantFile handles the first-year filing correctly.

12. **"My company has a bank account but no transactions — is it still dormant?"**
    Answer: For Companies Act purposes, holding a bank account is fine as long as there are no "significant accounting transactions" (which excludes shares paid for, filing fees, and penalties). The key test is whether the company has traded. If the only transactions are formation costs and filing fees, the company is dormant.

**General category (add new category or add to Filing):**

13. **"What happened to CATO and why does it matter?"**
    Answer: HMRC's Corporation Tax Online (CATO) service closed on 31 March 2026. CATO was the free way to file a nil CT600 return directly with HMRC. With it gone, you need either approved software (like DormantFile) or an accountant to file your Corporation Tax return. Companies House accounts filing is unaffected — that's a separate filing.

14. **"Who can see the filings DormantFile submits?"**
    Answer: Companies House filings (annual accounts) are public record — anyone can view them on the Companies House register. This is true regardless of how they're filed. HMRC Corporation Tax returns are not public. DormantFile submits to the same official systems as any accountant or software provider.

### Implementation Notes

- All changes are in `content/pages/faq.mdx` frontmatter
- Answers remain plain text (no MDX markup in frontmatter YAML)
- New questions integrate into existing categories
- Question 13 (CATO) and 14 (who can see) can go in Filing category
- Consider also rendering FAQPageJsonLd on the FAQ page (already defined in `src/lib/content/json-ld.tsx`, just needs to be called in the FAQ page component)

---

## 5. Product Preview Component

### What

A tabbed, styled browser-frame mockup showing three key product steps. Provides visual confidence without needing real screenshots. Designed to be swappable for real screenshots later.

### New Components

**`src/components/marketing/BrowserFrame.tsx`**
A wrapper that looks like a browser window:

- Top bar: three dots (red/yellow/green), URL text "dormantfile.co.uk/dashboard"
- Rounded corners, subtle border, background matching the site's card colour
- Dark mode compatible
- Children render inside the "browser" area

**`src/components/marketing/ProductPreview.tsx`**
A tabbed interface with 3 views inside a BrowserFrame:

**Tab 1: "Add your company"**

- Styled input field with placeholder "Search by company name or number..."
- Below it, a sample result card:
  - Company name: "EXAMPLE HOLDINGS LTD"
  - Company number: "12345678"
  - Registered address: "10 Example Street, London, EC1A 1BB"
  - Status badge: "Active"
  - "Add company" button

**Tab 2: "File in one click"**

- A filing card showing:
  - Company name: "EXAMPLE HOLDINGS LTD"
  - Period: "01 Apr 2025 – 31 Mar 2026"
  - Filing type: "Dormant accounts + CT600"
  - Status: "Ready to file"
  - "Submit filings" button (primary colour)

**Tab 3: "Get confirmation"**

- Success state:
  - Green checkmark icon
  - "Filed successfully"
  - Reference: "CH-2026-00001234"
  - "Accounts accepted by Companies House"
  - "CT600 accepted by HMRC"
  - Timestamp: "29 March 2026, 14:32"

### Layout

- Tabs sit above the BrowserFrame
- Active tab highlighted with primary colour underline
- The whole component is max-width ~640px, centred
- Content inside each tab uses the site's card/form design tokens

### Where

- **How It Works page** (`content/pages/how-it-works.mdx`): Add ProductPreview component after the existing Steps section, with a heading like "See it in action"
- **Homepage** (`src/app/page.tsx`): Optionally add a simplified version in the How It Works section (just show one step, or link to the full preview on the How It Works page)
- Register in `src/components/marketing/MDXComponents.tsx` so it can be used in MDX

### Implementation Notes

- All content is hardcoded sample data (not dynamic)
- Uses existing Tailwind classes and CSS custom properties
- Dark mode: uses `--color-bg-card`, `--color-border`, `--color-text-primary`, `--color-text-secondary` tokens (not `--color-surface` which doesn't exist)
- The BrowserFrame wrapper is generic — can later receive `<img>` children instead of styled components
- Tab state managed with simple `useState` — component needs `"use client"` directive
- No animations needed, keep it static and clean
- **Placement approach:** Render ProductPreview in the page component (`src/app/(marketing)/how-it-works/page.tsx`) between `{page.content}` and `<ContentCTA />`, not inside the MDX. This keeps MDX content-only and makes placement easier to control. Still register in MDXComponents for optional use elsewhere.

---

## 6. Social Proof Infrastructure

### What

Three components that start hidden or with minimal factual content, and grow as the product gets real users.

### Components

**`src/components/marketing/TrustBadges.tsx`**

- Shows immediately (no threshold)
- Renders 3-4 small factual badges in a horizontal row:
  - "Stripe-secured payments"
  - "UK-based"
  - "Official HMRC & CH APIs"
  - "TLS encrypted"
- Placement: inside the TrustSection on homepage, below the founder card or trust grid
- Styled as small pills/tags with muted background

**`src/components/marketing/FilingCounter.tsx`**

- Hidden until filing count exceeds a threshold (10)
- Reads from `NEXT_PUBLIC_FILING_COUNT` env var (updated periodically, or via API later)
- When visible: "Over X filings submitted" with a subtle counter display
- Returns `null` when count < threshold
- Placement: homepage, above or inside the trust section

**`src/components/marketing/Testimonials.tsx`**

- Hidden until there are testimonials to show
- Data: hardcoded array in the component (or a simple JSON file) — start with empty array
- When populated: renders quote cards with name, role, quote text
- Returns `null` when array is empty
- Placement: homepage, between trust section and FAQ (when active)

### Implementation Notes

- All three components return `null` gracefully when inactive — no empty states visible
- TrustBadges shows immediately, the other two wait for real data
- `NEXT_PUBLIC_FILING_COUNT` is a string env var — use `parseInt(process.env.NEXT_PUBLIC_FILING_COUNT || '0', 10)` to parse. It's also build-time inlined, so updating it requires a redeploy.
- Keep the testimonial data structure simple: `{ name: string, role: string, quote: string }[]`

---

## 7. Content Authorship & Freshness

### What

Small enhancements to content pages for better E-E-A-T signals and SEO.

### Changes

**Guide and answer detail pages:**

- Add "By DormantFile" byline next to the existing "Updated [date]" line
- Format: "By DormantFile · Updated 29 March 2026"
- Files: `src/app/(marketing)/guides/[slug]/page.tsx`, `src/app/(marketing)/answers/[slug]/page.tsx`

**FAQ page:**

- Add "Last reviewed [date]" below the page heading
- `FAQPageJsonLd` is already rendered on `/faq` (verified in `src/app/(marketing)/faq/page.tsx` line 42) — no changes needed
- File: `src/app/(marketing)/faq/page.tsx`

**How It Works page:**

- `HowToJsonLd` is already rendered on `/how-it-works` (verified in `src/app/(marketing)/how-it-works/page.tsx` line 75) — no changes needed

### Implementation Notes

- Both JSON-LD schemas are already in place — only new work is the bylines and "Last reviewed" line
- The byline is purely presentational — no new data fields needed, just a text addition
- Keep "By DormantFile" as organisational attribution (not "By Ben") for consistency with JSON-LD

---

## Implementation Sequence

### Phase 1: Launch State (time-sensitive)

1. Create `src/lib/launch-mode.ts` with `isFilingLive()` utility
2. Add `NEXT_PUBLIC_FILING_LIVE=false` to `.env` and `src/env.d.ts`
3. Migrate all `isPreviewMode` consumers to `isFilingLive()` (7+ files — see migration table above)
4. Update homepage CTA text to be conditional
5. Remove LaunchBanner component and all its usages from both layouts
6. Remove old `isPreviewMode` utility and `NEXT_PUBLIC_LAUNCH_MODE` env var
7. Add inline launch notice to hero

### Phase 2: Trust Foundation

8. Build `MicroTrust` component
9. Build `TrustSection` component
10. Add TrustSection to homepage
11. Add MicroTrust badges to homepage (hero, pricing, final CTA)
12. Add MicroTrust to ContentCTA

### Phase 3: FAQ & Content

13. Expand 8 existing FAQ answers in `faq.mdx`
14. Add 6 new FAQ questions in `faq.mdx`
15. Add "By DormantFile" bylines to guide/answer pages
16. Add "Last reviewed" line to FAQ page

### Phase 4: Product Preview

17. Build `BrowserFrame` component
18. Build `ProductPreview` component (3 tabs, `"use client"`)
19. Register in MDXComponents
20. Add to How It Works page (in page component, between content and CTA)
21. Optionally add to homepage

### Phase 5: Social Proof Infrastructure

22. Build `TrustBadges` component (shows immediately)
23. Build `FilingCounter` component (hidden initially)
24. Build `Testimonials` component (hidden initially)
25. Add TrustBadges to homepage trust section
26. Add FilingCounter and Testimonials slots to homepage

---

## Verification

1. **Visual check:** Run `npm run dev`, visit homepage — verify trust section renders correctly in both light and dark mode
2. **Launch state:** Verify CTAs show pre-launch text with `NEXT_PUBLIC_FILING_LIVE=false`, and live text with `=true`
3. **Responsive:** Check homepage on mobile viewport — trust section stacks, micro-trust badges wrap cleanly
4. **FAQ:** Visit /faq — verify expanded answers display, new questions appear in correct categories
5. **Product preview:** Visit /how-it-works — verify tabbed preview renders, tabs switch, browser frame looks correct
6. **JSON-LD:** Verify existing FAQPage and HowTo schemas still render correctly (already in place, just confirm no regressions)
7. **Social proof:** Verify TrustBadges show, FilingCounter and Testimonials return null (hidden)
8. **Content pages:** Visit any guide/answer — verify "By DormantFile · Updated [date]" byline
9. **Build:** Run `npm run build` — no errors
10. **Lint:** Run `npm run lint` — no new warnings
