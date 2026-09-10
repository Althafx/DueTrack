// Stub replacement for `iconv-lite`, aliased in via wrangler.jsonc's
// `alias` config. The real package crashes at import time under the
// Cloudflare Workers runtime (`require_streams(...) is not a function` —
// a known upstream nodejs_compat gap in how it touches `node:stream`).
//
// It's only ever pulled in transitively via express -> body-parser ->
// raw-body, none of which this app actually uses (server.ts has its own
// minimal JSON body parser and never calls express.json()/urlencoded()).
// This stub exists purely so the module graph can load without crashing;
// its functions are never expected to be called in practice, so they
// throw clearly if they ever are.
function unsupported() {
  throw new Error("iconv-lite is stubbed out in this build and does not support encoding conversion");
}

module.exports = {
  encode: unsupported,
  decode: unsupported,
  encodingExists: function () {
    return false;
  },
  getEncoder: unsupported,
  getDecoder: unsupported,
};
