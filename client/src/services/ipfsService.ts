export type IpfsJsonResponse = { cid: string };

const BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;

export async function uploadHackathonJson(data: unknown): Promise<IpfsJsonResponse> {
  const res = await fetch(`${BASE_URL}/api/ipfs/json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`IPFS upload failed: ${res.status} ${res.statusText} ${text}`);
  }
  return (await res.json()) as IpfsJsonResponse;
}
