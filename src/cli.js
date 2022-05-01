const cac = require('cac');

const cli = cac('myVite');

function cleanOptions(
  options
) {
  const ret = { ...options }
  delete ret['--']
  delete ret.c
  delete ret.config
  delete ret.base
  delete ret.l
  delete ret.logLevel
  delete ret.clearScreen
  delete ret.d
  delete ret.debug
  delete ret.f
  delete ret.filter
  delete ret.m
  delete ret.mode
  return ret
}

cli
  .command('[root]', 'start dev server')
  .alias('serve')
  .alias('dev')
  .option('--host [host]', `[string] specify hostname`)
  .option('--port <port>', `[number] specify port`)
  .option('--open [path]', `[boolean | string] open browser on startup`)
  .action(async (root, options) => {
    const createServer = require('./server');
    const server = await createServer({
      root,
      server: cleanOptions(options)
    });
    
    await server.listen();
  });

cli.help()
cli.version(require('../package.json').version)

cli.parse()