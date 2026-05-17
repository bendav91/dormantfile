import { describe, it, expect } from "vitest";
import { resolvePostFilingDocument } from "@/lib/post-filing-resolution";

const ch = (madeUpDate: string, url: string | null = "https://doc/x") => ({
  madeUpDate: new Date(madeUpDate), type: "AA", date: null,
  transactionId: "t", documentMetadataUrl: url,
});

describe("resolvePostFilingDocument", () => {
  it("official when an AA doc matches periodEnd within 31 days", () => {
    expect(resolvePostFilingDocument({
      periodEnd: new Date("2023-12-31"), filingType: "accounts",
      hasSnapshot: true, chFilings: [ch("2024-01-10")],
    })).toEqual({ kind: "official", documentMetadataUrl: "https://doc/x" });
  });

  it("interim when no CH match but a snapshot exists", () => {
    expect(resolvePostFilingDocument({
      periodEnd: new Date("2023-12-31"), filingType: "accounts",
      hasSnapshot: true, chFilings: [ch("2022-12-31")],
    })).toEqual({ kind: "interim" });
  });

  it("legacy-none when no CH match and no snapshot", () => {
    expect(resolvePostFilingDocument({
      periodEnd: new Date("2023-12-31"), filingType: "accounts",
      hasSnapshot: false, chFilings: [],
    })).toEqual({ kind: "legacy-none" });
  });

  it("not official beyond tolerance (46 days)", () => {
    expect(resolvePostFilingDocument({
      periodEnd: new Date("2023-12-31"), filingType: "accounts",
      hasSnapshot: true, chFilings: [ch("2024-02-15")],
    })).toEqual({ kind: "interim" });
  });

  it("not official when match has no document url", () => {
    expect(resolvePostFilingDocument({
      periodEnd: new Date("2023-12-31"), filingType: "accounts",
      hasSnapshot: true, chFilings: [ch("2024-01-02", null)],
    })).toEqual({ kind: "interim" });
  });
});
