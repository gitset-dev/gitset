import type { APIRoute } from "astro";
import getUser from "@/lib/getUser";

const GITHUB = "https://api.github.com";
const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE"]);
const TIMEOUT_MS = 30_000;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const ALL: APIRoute = async ({ params, request, cookies, url }) => {
  const user = await getUser(cookies.get("app_auth_token")?.value);
  if (!user) return json(401, { error: "Unauthorized" });

  const token = user.user.githubOauthToken;
  if (!token) {
    return json(403, { error: "GitHub account not linked" });
  }

  if (!ALLOWED_METHODS.has(request.method)) {
    return json(405, { error: `Method ${request.method} not allowed` });
  }

  const rawPath = params.path ?? "";
  const hasTraversalSegment = rawPath
    .split("/")
    .some((seg) => seg === "." || seg === "..");
  if (!rawPath || hasTraversalSegment || /^https?:/i.test(rawPath)) {
    return json(400, { error: "Invalid GitHub path" });
  }
  const target = `${GITHUB}/${rawPath.replace(/^\/+/, "")}${url.search}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "Gitset",
    "X-GitHub-Api-Version": "2022-11-28",
    Accept: request.headers.get("accept") || "application/vnd.github+json",
  };

  let body: string | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    body = await request.text();
    headers["Content-Type"] =
      request.headers.get("content-type") || "application/json";
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const ghRes = await fetch(target, {
      method: request.method,
      headers,
      body,
      signal: controller.signal,
    });

    const out = new Headers();
    const ct = ghRes.headers.get("content-type");
    const link = ghRes.headers.get("link");
    if (ct) out.set("Content-Type", ct);
    if (link) out.set("Link", link);

    return new Response(ghRes.body, { status: ghRes.status, headers: out });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return json(aborted ? 504 : 502, {
      error: aborted ? "GitHub request timed out" : "Failed to reach GitHub",
    });
  } finally {
    clearTimeout(timer);
  }
};
