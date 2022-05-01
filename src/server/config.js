const path = require('path')
const fs = require('fs')
const build = require('esbuild').build
const { pathToFileURL } = require('url')
const {
  normalizePath,
  isObject,
  arraify,
  dynamicImport
} = require('../utils')

async function resolveConfig(inlineConfig, command, defaultMode = 'development') {
  let config = inlineConfig;
  let mode = inlineConfig.mode || defaultMode

  const configEnv = {
    mode,
    command
  }

  let { configFile } = config
  if (configFile !== false) {
    const loadResult = await loadConfigFromFile(
      configEnv,
      configFile,
      config.root,
      config.logLevel
    )
    
    if (loadResult) {
      config = mergeConfig(loadResult.config, config)
      configFile = loadResult.path
      configFileDependencies = loadResult.dependencies
    }
  }

  // resolve root
  const resolvedRoot = normalizePath(
    config.root ? path.resolve(config.root) : process.cwd()
  )

  return {
    ...config,
    configFile: configFile ? normalizePath(configFile) : undefined,
    inlineConfig,
    root: resolvedRoot
  }
}

function mergeConfigRecursively(
  defaults,
  overrides,
  rootPath
) {
  const merged = { ...defaults }
  for (const key in overrides) {
    const value = overrides[key]
    if (value == null) {
      continue
    }

    const existing = merged[key]

    if (existing == null) {
      merged[key] = value
      continue
    }

    if (Array.isArray(existing) || Array.isArray(value)) {
      merged[key] = [...arraify(existing ?? []), ...arraify(value ?? [])]
      continue
    }
    if (isObject(existing) && isObject(value)) {
      merged[key] = mergeConfigRecursively(
        existing,
        value,
        rootPath ? `${rootPath}.${key}` : key
      )
      continue
    }

    merged[key] = value
  }
  return merged
}

function mergeConfig(
  defaults,
  overrides,
  isRoot = true
) {
  return mergeConfigRecursively(defaults, overrides, isRoot ? '' : '.')
}

async function loadConfigFromFile(
  configEnv,
  configFile,
  configRoot = process.cwd(),
  logLevel
) {
  let resolvedPath = ''
  let dependencies = []
  
  if (configFile) {
    resolvedPath = path.resolve(configFile)
  } else {
    const jsconfigFile = path.resolve(configRoot, 'myVite.config.js')
    if (fs.existsSync(jsconfigFile)) {
      resolvedPath = jsconfigFile
    }
  }

  // 解析用户配置
  let userConfig;

  if (!userConfig) {
    // 打包config文件
    const bundled = await bundleConfigFile(resolvedPath)
    dependencies = bundled.dependencies
    // 获取打包结果文件config
    userConfig = await loadConfigFromBundledFile(resolvedPath, bundled.code)
  }

  const config = await (typeof userConfig === 'function'
  ? userConfig(configEnv)
  : userConfig)

  if (!isObject(config)) {
    throw new Error(`config must export or return an object.`)
  }

  return {
    path: normalizePath(resolvedPath),
    config,
    dependencies
  }
}

// 打包config文件
async function bundleConfigFile(fileName, isESM = false) {
  const result = await build({
    absWorkingDir: process.cwd(),
    entryPoints: [fileName],
    outfile: 'out.js',
    write: false,
    platform: 'node',
    bundle: true,
    format: isESM ? 'esm' : 'cjs',
    sourcemap: 'inline',
    metafile: true,
    plugins: [
      {
        name: 'externalize-deps',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            const id = args.path
            if (id[0] !== '.' && !path.isAbsolute(id)) {
              return {
                external: true
              }
            }
          })
        }
      },
      {
        name: 'replace-import-meta',
        setup(build) {
          build.onLoad({ filter: /\.[jt]s$/ }, async (args) => {
            const contents = await fs.promises.readFile(args.path, 'utf8')
            return {
              loader: args.path.endsWith('.ts') ? 'ts' : 'js',
              contents: contents
                .replace(
                  /\bimport\.meta\.url\b/g,
                  JSON.stringify(pathToFileURL(args.path).href)
                )
                .replace(
                  /\b__dirname\b/g,
                  JSON.stringify(path.dirname(args.path))
                )
                .replace(/\b__filename\b/g, JSON.stringify(args.path))
            }
          })
        }
      }
    ]
  })
  const { text } = result.outputFiles[0]

  return {
    code: text,
    dependencies: result.metafile ? Object.keys(result.metafile.inputs) : []
  }
}

// 获取打包结果文件config
async function loadConfigFromBundledFile(fileName, bundledCode) {
  const extension = path.extname(fileName)

  const defaultLoader = require.extensions[extension]
  // 重写extensions扩展，目的是修改成对应文件的bundledCode进行编译
  require.extensions[extension] = (module, filename) => {
    if (filename === fileName) {
      module._compile(bundledCode, filename)
    } else {
      defaultLoader(module, filename)
    }
  }

  // 每次重启服务器都清除缓存
  delete require.cache[require.resolve(fileName)]
  const raw = require(fileName)
  const config = raw.__esModule ? raw.default : raw
  require.extensions[extension] = defaultLoader
  return config;
}

module.exports = {
  resolveConfig,
  mergeConfig
}
