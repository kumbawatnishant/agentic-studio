/**
 * Socket.io Server Entry Point
 * Runs the standalone Socket.io server for the Ludo game
 */

import { createServer } from 'http';
import { setupSocketServer } from '../src/server/socket-server';

const PORT = process.env.SOCKET_PORT || 3001;

const httpServer = createServer();

const io = setupSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🎲 Ludo Socket.io server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  io.close(() => {
    console.log('Socket.io server closed');
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  io.close(() => {
    console.log('Socket.io server closed');
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});

export { io, httpServer };