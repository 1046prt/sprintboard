import http from 'node:http';
import { assertEnv, env } from './config/env.js';

assertEnv();

const { default: app } = await import('./app.js');
const { connectDB, disconnectDB } = await import('./config/db.js');
const { initSocket } = await import('./socket.js');

await connectDB();

const server = http.createServer(app);
app.set('io', initSocket(server));

server.listen(env.port, () => {
  console.log(`SprintBoard API listening on http://localhost:${env.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
