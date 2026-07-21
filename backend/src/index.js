const { createApp } = require('./app');
const prisma = require('./lib/prisma');
const { validateRuntimeConfig } = require('./config');

async function main() {
  validateRuntimeConfig();
  const port = Number(process.env.PORT || 3001);
  const host = process.env.HOST || '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535');
  const app = createApp({ prisma });
  const server = app.listen(port, host, () => {
    console.log(`Moving Company legal-document workflow listening on http://${host}:${port}`);
  });
  const shutdown = async (signal) => {
    console.log(`${signal} received; stopping HTTP server`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  return server;
}

if (require.main === module) {
  main().catch(async (error) => {
    console.error(`Startup failed: ${error.message}`);
    await prisma.$disconnect();
    process.exit(1);
  });
}

module.exports = { main };
