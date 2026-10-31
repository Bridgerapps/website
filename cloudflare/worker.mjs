import files from './assets.json';
const assets = new Set(files.map(p => `/${p}`));

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'bridgerapps.com' || (url.hostname === 'www.bridgerapps.com' && url.protocol === 'http:')) {
      url.hostname = 'www.bridgerapps.com';
      url.protocol = 'https:';
      return Response.redirect(url, 308);
    }
    const path = url.pathname;
    if (assets.has(path)) return env.ASSETS.fetch(request);
    const index = `${path.replace(/\/$/, '')}/index.html`;
    if (assets.has(index)) {
      if (!path.endsWith('/')) {
        url.pathname += '/';
        return Response.redirect(url, 308);
      }
      url.pathname = index;
      return env.ASSETS.fetch(new Request(url, request));
    }
    return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
};
