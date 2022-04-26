const path = require('path');
const connect = require('connect');
const open = require('open');
const colors = require('picocolors');
const chokidar = require('chokidar');

const serveStaticMiddleware = require('../middlewares/static');
const indexHtmlMiddleware = require('../middlewares/indexHtml');
const spaFallbackMiddleware = require('../middlewares/spaFallback');

module.exports = async function createServer(config) {
  const middlewares = connect();
  const { root, server: serverConfig } = config;

  const httpServer = await resolveHttpServer(middlewares);

  const { ignored = [], ...watchOptions } = serverConfig.watch || {};
  // 监听文件变化
  const watcher = chokidar.watch(path.resolve(root), {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      ...(Array.isArray(ignored) ? ignored : [ignored])
    ],
    ignoreInitial: true,
    ignorePermissionErrors: true,
    disableGlobbing: true,
    ...watchOptions
  });

  const server = {
    config,
    httpServer,
    listen(port) {
      return startServer(server, port);
    }
  };

  watcher.on('change', (file) => {
    console.log(file);
  });

  // 静态服务中间件
  middlewares.use(serveStaticMiddleware(root, server));
  // 单页面 fallback中间件
  middlewares.use(spaFallbackMiddleware(root));
  // index.html中间件，主要是返回html内容
  middlewares.use(indexHtmlMiddleware(server));

  return server;
}

async function resolveHttpServer(app) {
  return require('http').createServer(app);
}

async function startServer(server, inlinePort) {
  const { httpServer } = server;

  const options = server.config.server;
  const port = inlinePort || 3000;
  const hostname = {
    host: '127.0.0.1',
    name: 'localhost'
  };

  const serverPort = await httpServerStart(httpServer, {
    port,
    host: hostname.host
  });

  if (options.open) {
    const path = typeof options.open === 'string' ? options.open : '/'
    open(`http://${hostname.name}:${serverPort}${path}`, {})
  }
  return server;
}

async function httpServerStart(httpServer, options) {
  return new Promise((resolve, reject) => {
    let { port, host } = options;
    const onError = (e) => {
      if (e.code === 'EADDRINUSE') {
        httpServer.listen(++port, host);
        console.info((`Port ${port} is in use, trying another one...`));
      } else {
        httpServer.removeListener('error', onError)
        reject(e)
      }
    }
    httpServer.on('error', onError);

    httpServer.listen(port, host, () => {
      httpServer.removeListener('error', onError);
      resolve(port);
      console.info(
        colors.green(`server running at http://${host}:${port}`)
      );
    });
  })
}