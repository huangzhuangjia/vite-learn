const path = require('path')
const fs = require('fs')
const { cleanUrl, normalizePath } = require('../utils');

module.exports = function indexHtmlMiddleware(server) {
  return function _indexHtmlMiddlware(req, res, next) {
    const url = cleanUrl(req.url);

    if (url?.endsWith('.html') && req.headers['sec-fetch-dest'] !== 'script') {
      const filename = getHtmlFilename(url, server)
      console.log(filename);
      if (fs.existsSync(filename)) {
        try {
          let html = fs.readFileSync(filename, 'utf-8')
          res.setHeader('Content-Type', 'html')
          res.statusCode = 200
          res.end(html)
        } catch (e) {
          return next(e)
        }
      }
    }
    next()
  }
}

function getHtmlFilename(url, server) {
  return decodeURIComponent(
    normalizePath(path.join(server.config.root, url.slice(1)))
  )
}