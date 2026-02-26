const LINEAR_API = "https://api.linear.app/graphql";

export async function linearQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
  apiKey?: string,
): Promise<T> {
  const key = apiKey;
  if (!key) throw new Error("Linear API key not provided");

  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: key,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Linear API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  return json.data as T;
}
