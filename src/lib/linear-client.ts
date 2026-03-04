import { LinearClient } from "@linear/sdk";
import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";

export { LinearClient } from "@linear/sdk";

/**
 * Wraps a route handler that uses a LinearClient.
 * Retrieves the Linear OAuth token server-side via WorkOS Pipes.
 * The handler signature is unchanged — callers still receive a LinearClient.
 */
export function withLinearClient(
  handler: (
    client: LinearClient,
    request: NextRequest,
  ) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    const { user, organizationId } = await withAuth({ ensureSignedIn: true });
    const result = await getWorkOS().pipes.getAccessToken({
      provider: "linear",
      userId: user.id,
      ...(organizationId ? { organizationId } : {}),
    });

    if (!result.active) {
      return NextResponse.json(
        { error: "Linear not connected", code: result.error },
        { status: 401 },
      );
    }

    const client = new LinearClient({
      accessToken: result.accessToken.accessToken,
    });

    try {
      return await handler(client, request);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
