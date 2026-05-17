import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchActiveDirectors } from "@/lib/companies-house/officers";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function chResponse(items: unknown[], status = 200) {
  return new Response(JSON.stringify({ items }), { status });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("COMPANIES_HOUSE_API_KEY", "test-key");
  vi.stubEnv("COMPANY_INFORMATION_API_ENDPOINT", "https://api.test");
});

describe("fetchActiveDirectors", () => {
  it("returns only active natural-person directors", async () => {
    mockFetch.mockResolvedValue(
      chResponse([
        { name: "SMITH, Jane", officer_role: "director", appointed_on: "2020-01-02" },
        { name: "DOE, John", officer_role: "secretary" },
        { name: "OLD, Bob", officer_role: "director", resigned_on: "2022-06-01" },
        { name: "ACME NOMINEES LTD", officer_role: "corporate-director" },
        { name: "ROE, Rita", officer_role: "nominee-director" },
      ]),
    );

    const result = await fetchActiveDirectors("12345678");

    expect(result).toEqual([
      { name: "SMITH, Jane", appointedOn: "2020-01-02" },
      { name: "ROE, Rita", appointedOn: null },
    ]);
  });

  it("trims names and tolerates a missing items array", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    expect(await fetchActiveDirectors("12345678")).toEqual([]);
  });

  it("calls the officers endpoint with Basic auth", async () => {
    mockFetch.mockResolvedValue(chResponse([]));
    await fetchActiveDirectors("0099 88");
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.test/company/0099%2088/officers?items_per_page=50");
    expect((opts.headers as Record<string, string>).Authorization).toMatch(/^Basic /);
  });

  it("throws when the API is not configured", async () => {
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "");
    await expect(fetchActiveDirectors("12345678")).rejects.toThrow("not configured");
  });

  it("throws when the API returns a non-ok status", async () => {
    mockFetch.mockResolvedValue(chResponse([], 500));
    await expect(fetchActiveDirectors("12345678")).rejects.toThrow("500");
  });
});
