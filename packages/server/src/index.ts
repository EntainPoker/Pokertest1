import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import lobbyRoutes from './routes/lobby.js';
import adminRoutes from './routes/admin.js';
import historyRoutes from './routes/history.js';
import { runSQLiteMigrations } from './migrations/setup-sqlite.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize database tables
runSQLiteMigrations();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/lobby', lobbyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/history', historyRoutes);

// Game state endpoint — returns active game state for a given game instance
app.get('/api/game/:gameId/state', (_req, res) => {
  const { gameId } = _req.params;
  const state = activeGameStates.get(gameId);
  if (state) {
    res.json({ state });
  } else {
    res.status(404).json({ state: null, message: 'No active game state' });
  }
});

// Serve the built client files in production
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));

// SPA fallback - serve index.html for any non-API route
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 4000;

// Socket.IO connection handling
import { playerConnections } from './services/tournamentService.js';
import { activeGameStates } from './services/gameStateStore.js';
import { handlePlayerAction } from './services/gameEngine/gameLoop.js';
import type { GameState, PlayerAction } from '@spin-and-go/shared';

io.on('connection', (socket) => {
  let currentPlayerId: string | null = null;
  let currentGameId: string | null = null;

  // Handle lobby subscription
  socket.on('lobby:subscribe', () => {
    socket.join('lobby');
  });

  socket.on('lobby:unsubscribe', () => {
    socket.leave('lobby');
  });

  // Handle game join — track player connection and join room
  socket.on('game:join', (data: { gameId: string; playerId?: string }) => {
    const { gameId, playerId } = data;
    currentGameId = gameId;

    // Join the game room
    socket.join(`game:${gameId}`);

    // Track player connection if playerId provided
    if (playerId) {
      currentPlayerId = playerId;
      playerConnections.set(playerId, { socketId: socket.id, gameInstanceId: gameId });
    }

    // If a game state exists for this game, send it to the joining player
    const existingState = activeGameStates.get(gameId);
    if (existingState) {
      socket.emit('game:start', existingState);
    }
  });

  // Handle game:resync — re-emit current state if available
  socket.on('game:resync', (data: { gameId: string }) => {
    socket.join(`game:${data.gameId}`);
  });

  // Handle game:action — player submits an action
  socket.on('game:action', (data: { gameId: string; playerId: string; action: any }) => {
    // Forward action to game engine (to be wired up with full game loop)
    io.to(`game:${data.gameId}`).emit('game:action:received', data);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (currentPlayerId) {
      playerConnections.delete(currentPlayerId);
    }
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, io, httpServer };
