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

function isObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function arraify(target) {
  return Array.isArray(target) ? target : [target]
}

function lookupFile(
  dir,
  formats,
  options
) {
  for (const format of formats) {
    const fullPath = path.join(dir, format)
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return options?.pathOnly ? fullPath : fs.readFileSync(fullPath, 'utf-8')
    }
  }
  const parentDir = path.dirname(dir)
  if (
    parentDir !== dir &&
    (!options?.rootDir || parentDir.startsWith(options?.rootDir))
  ) {
    return lookupFile(parentDir, formats, options)
  }
}

const usingDynamicImport = typeof jest === 'undefined'

const dynamicImport = usingDynamicImport
  ? new Function('file', 'return import(file)')
  : require

module.exports = {
  cleanUrl,
  normalizePath,
  isObject,
  arraify,
  lookupFile,
  usingDynamicImport,
  dynamicImport
};
