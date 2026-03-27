import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { createHash } from "crypto";

/**
 * Calculates the IRmark for a GovTalk Body XML string.
 *
 * The IRmark is a SHA-512 hash of the canonicalised Body content (with any
 * existing IRmark elements stripped out), base64-encoded. HMRC use this as
 * a lightweight integrity check on the submission payload.
 *
 * Full exc-c14n canonicalisation can be substituted here later if HMRC
 * rejects the IRmark for a non-nil return; for nil CT600s the XMLSerializer
 * round-trip is sufficient.
 */
export function calculateIRmark(bodyXml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(bodyXml, "text/xml");

  // Remove any existing IRmark elements so the hash is computed without them.
  const existingIRmarks = doc.getElementsByTagName("IRmark");
  // Collect into array first — live NodeList shrinks as we remove nodes.
  const toRemove: Element[] = [];
  for (let i = 0; i < existingIRmarks.length; i++) {
    toRemove.push(existingIRmarks[i] as Element);
  }
  for (const el of toRemove) {
    el.parentNode?.removeChild(el);
  }

  // Serialise each child node of the document root (i.e. the Body element and
  // its descendants) using XMLSerializer as a stand-in for c14n.
  const serializer = new XMLSerializer();
  const canonical = serializer.serializeToString(doc);

  const hash = createHash("sha512").update(canonical, "utf8").digest("base64");
  return hash;
}
