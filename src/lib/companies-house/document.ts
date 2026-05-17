export async function fetchOfficialAccountsPdf(
  documentMetadataUrl: string,
): Promise<ArrayBuffer | null> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey || !documentMetadataUrl) return null;
  const basicAuth = Buffer.from(`${apiKey}:`).toString("base64");
  try {
    const res = await fetch(`${documentMetadataUrl}/content`, {
      headers: { Authorization: `Basic ${basicAuth}`, Accept: "application/pdf" },
      redirect: "follow",
    });
    if (!res.ok) {
      console.error(`CH document content returned ${res.status}`);
      return null;
    }
    return await res.arrayBuffer();
  } catch (error) {
    console.error("Failed to fetch CH document content:", error);
    return null;
  }
}
