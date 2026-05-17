import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchOfficialAccountsPdf } from "@/lib/companies-house/document";

describe("fetchOfficialAccountsPdf", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("fetches <url>/content with Accept: application/pdf and Basic auth, returns ArrayBuffer on 200", async () => {
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "testkey");
    const buf = new ArrayBuffer(8);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(buf, { status: 200 }),
    );

    const result = await fetchOfficialAccountsPdf("https://doc.test/abc");

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://doc.test/abc/content");
    expect((init.headers as Record<string, string>)["Accept"]).toBe("application/pdf");
    expect((init.headers as Record<string, string>)["Authorization"]).toMatch(/^Basic /);
  });

  it("returns null on non-OK response (500)", async () => {
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "testkey");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("error", { status: 500 }),
    );
    expect(await fetchOfficialAccountsPdf("https://doc.test/abc")).toBeNull();
  });

  it("returns null on network error (thrown)", async () => {
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "testkey");
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network failure"));
    expect(await fetchOfficialAccountsPdf("https://doc.test/abc")).toBeNull();
  });

  it("returns null when COMPANIES_HOUSE_API_KEY is not set", async () => {
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "");
    const spy = vi.spyOn(globalThis, "fetch");
    expect(await fetchOfficialAccountsPdf("https://doc.test/abc")).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns null when documentMetadataUrl is empty string", async () => {
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "testkey");
    const spy = vi.spyOn(globalThis, "fetch");
    expect(await fetchOfficialAccountsPdf("")).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});
