// Keep NovelFire's production HTTPS link semantics while serving deterministic local HTML.
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.origin === 'https://novelfire.net') {
    const target = `http://127.0.0.1:3101/nf${url.pathname}${url.search}`;
    return originalFetch(input instanceof Request ? new Request(target, input) : target, init);
  }
  return originalFetch(input, init);
};
