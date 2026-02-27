import { LinearClient } from "@linear/sdk";
import { NextRequest, NextResponse } from "next/server";

export { LinearClient } from "@linear/sdk";

/**
 * Create a LinearClient from a NextRequest's x-linear-api-key header.
 * Returns the client, or a 401 NextResponse if the key is missing.
 */
export function linearClientFromRequest(
  request: NextRequest,
): LinearClient | NextResponse {
  const apiKey = request.headers.get("x-linear-api-key");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Linear API key not provided" },
      { status: 401 },
    );
  }
  return new LinearClient({ apiKey });
}

/**
 * Wraps a route handler that uses a LinearClient.
 * Extracts the API key, catches errors, and returns proper JSON responses.
 */
export function withLinearClient(
  handler: (client: LinearClient, request: NextRequest) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    const clientOrError = linearClientFromRequest(request);
    if (clientOrError instanceof NextResponse) return clientOrError;

    try {
      return await handler(clientOrError, request);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
