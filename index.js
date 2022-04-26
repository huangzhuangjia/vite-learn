const createServer = require('./src/server');

async function startServer() {
  const server = await createServer({
    root: process.cwd(),
    server: {
      // open: '/index.html'
    }
  });
  
  await server.listen();
}

startServer();