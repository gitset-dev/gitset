const PROXY_PREFIX = "/api/github";
const GITHUB_ORIGIN = "https://api.github.com";

export function toProxyUrl(pathOrUrl: string): string {
  let rest = pathOrUrl;
  if (rest.startsWith(GITHUB_ORIGIN)) {
    rest = rest.slice(GITHUB_ORIGIN.length);
  }
  if (!rest.startsWith("/")) rest = `/${rest}`;
  return `${PROXY_PREFIX}${rest}`;
}

export function ghFetch(
  pathOrUrl: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(toProxyUrl(pathOrUrl), {
    ...init,
    credentials: "same-origin",
  });
}
