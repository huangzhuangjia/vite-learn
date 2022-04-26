const path = require('path')
const os = require('os')

const queryRE = /\?.*$/s
const hashRE = /#.*$/s

const isWindows = os.platform() === 'win32'

function slash(p) {
  return p.replace(/\\/g, '/')
}

function normalizePath(id) {
  return path.posix.normalize(isWindows ? slash(id) : id)
}

const cleanUrl = (url) => url.replace(hashRE, '').replace(queryRE, '')

module.exports = {
  cleanUrl,
  normalizePath
};
