export function serverBaseUrl(name: string) {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} must be an absolute URL`);
  }
  const localDevelopment = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(localDevelopment && url.protocol === "http:")) {
    throw new Error(`${name} must use HTTPS (HTTP is only allowed for local development)`);
  }
  return url.toString().replace(/\/$/, "");
}

