const sirv = require('sirv');
const path = require('path');
const { cleanUrl } = require('../utils');

const sirvOptions = {
  dev: true,
  etag: true,
  extensions: [],
  setHeaders(res, pathname) {
    if (/\.[tj]sx?$/.test(pathname)) {
      res.setHeader('Content-Type', 'application/javascript')
    }
  }
}

function servePublicMiddleware(publicDir) {
  const serve = sirv(publicDir, sirvOptions);

  return function _servePublicMiddleware(req, res, next) {
    serve(req, res, next)
  }
}

function serveStaticMiddleware(dir, server) {
  const serve = sirv(dir, sirvOptions);

  return function _serveStaticMiddleware(req, res, next) {
    const cleanedUrl = cleanUrl(req.url);
    if (
      cleanedUrl.endsWith('/') ||
      path.extname(cleanedUrl) === '.html'
    ) {
      return next()
    }
    serve(req, res, next);
  }
}

module.exports = {
  servePublicMiddleware,
  serveStaticMiddleware
}