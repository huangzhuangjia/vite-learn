const path = require('path')
const fs = require('fs')
const history = require('connect-history-api-fallback');

module.exports = function spaFallbackMiddleware(root) {
  const historySpaFallbackMiddleware = history({
    rewrites: [
      {
        from: /\/$/,
        to({ parsedUrl }) {
          const rewritten =
            decodeURIComponent(parsedUrl.pathname) + 'index.html'

          if (fs.existsSync(path.join(root, rewritten))) {
            return rewritten
          } else {
            return `/index.html`
          }
        }
      }
    ]
  });
  return function _spaFallbackMiddleware(req, res, next) {
    return historySpaFallbackMiddleware(req, res, next)
  }
}