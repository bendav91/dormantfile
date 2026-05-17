import { TOLERANCE_MS, type ChAccountsFilingDoc } from "@/lib/companies-house/filing-history";

export type PostFilingResolution =
  | { kind: "official"; documentMetadataUrl: string }
  | { kind: "interim" }
  | { kind: "legacy-none" };

export function resolvePostFilingDocument(args: {
  periodEnd: Date;
  filingType: string;
  hasSnapshot: boolean;
  chFilings: ChAccountsFilingDoc[];
}): PostFilingResolution {
  const { periodEnd, filingType, hasSnapshot, chFilings } = args;
  if (filingType === "accounts") {
    const match = chFilings.find(
      (f) =>
        f.type.startsWith("AA") &&
        f.documentMetadataUrl &&
        Math.abs(f.madeUpDate.getTime() - periodEnd.getTime()) <= TOLERANCE_MS,
    );
    if (match) {
      return { kind: "official", documentMetadataUrl: match.documentMetadataUrl! };
    }
  }
  return hasSnapshot ? { kind: "interim" } : { kind: "legacy-none" };
}
