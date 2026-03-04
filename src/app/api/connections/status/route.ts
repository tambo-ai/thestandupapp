import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const workos = getWorkOS();

  const [github, linear] = await Promise.all([
    workos.pipes
      .getAccessToken({ provider: "github", userId: user.id })
      .catch(
        () =>
          ({ active: false, error: "not_installed" }) as {
            active: false;
            error: string;
          },
      ),
    workos.pipes
      .getAccessToken({ provider: "linear", userId: user.id })
      .catch(
        () =>
          ({ active: false, error: "not_installed" }) as {
            active: false;
            error: string;
          },
      ),
  ]);

  return NextResponse.json({
    github: github.active
      ? "connected"
      : "error" in github
        ? github.error
        : "not_installed",
    linear: linear.active
      ? "connected"
      : "error" in linear
        ? linear.error
        : "not_installed",
  });
}
