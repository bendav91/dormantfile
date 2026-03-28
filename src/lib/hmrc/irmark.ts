import { DOMParser } from "@xmldom/xmldom";
import { createHash } from "crypto";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CanonicalisationFactory = require("xml-c14n");

const EXC_C14N = "http://www.w3.org/2001/10/xml-exc-c14n#";

/**
 * Calculates the IRmark for a GovTalk Body XML string.
 *
 * The IRmark is a SHA-1 hash of the Exclusive XML Canonicalised (exc-c14n)
 * Body content (with any existing IRmark elements stripped out), then
 * base64-encoded. HMRC uses this as a tamper-evidence check on the
 * submission payload.
 */
export function calculateIRmark(bodyXml: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(bodyXml, "text/xml");

    // Remove any existing IRmark elements so the hash is computed without them.
    const existingIRmarks = doc.getElementsByTagName("IRmark");
    const toRemove: Element[] = [];
    for (let i = 0; i < existingIRmarks.length; i++) {
      toRemove.push(existingIRmarks[i] as Element);
    }
    for (const el of toRemove) {
      el.parentNode?.removeChild(el);
    }

    const factory = CanonicalisationFactory();
    const canonicaliser = factory.createCanonicaliser(EXC_C14N);

    canonicaliser.canonicalise(doc.documentElement, (err: Error | null, canonical: string) => {
      if (err) {
        return reject(err);
      }

      const hash = createHash("sha1").update(canonical, "utf8").digest("base64");
      resolve(hash);
    });
  });
}
