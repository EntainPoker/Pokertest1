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
import { playerConnections } from './services/tournamentService.js';
import { activeGameStates } from './services/gameStateStore.js';
import { handlePlayerAction, getPlayerHoleCards } from './services/gameEngine/gameLoop.js';
import type { GameState, PlayerAction } from '@spin-and-go/shared';

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
// Accepts ?playerId= query param to include that player's hole cards
app.get('/api/game/:gameId/state', (_req, res) => {
  const { gameId } = _req.params;
  const playerId = _req.query.playerId as string | undefined;
  const state = activeGameStates.get(gameId);
  if (state) {
    // Include player's hole cards if requested
    let personalizedState = state;
    if (playerId) {
      const holeCards = getPlayerHoleCards(gameId, playerId);
      if (holeCards && holeCards.length > 0) {
        personalizedState = {
          ...state,
          handState: {
            ...state.handState,
            players: state.handState.players.map(p => ({
              ...p,
              holeCards: p.playerId === playerId ? holeCards : [],
            })),
          },
        };
      }
    }
    res.json({ state: personalizedState });
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
io.on('connection', (socket) => {
  let currentPlayerId: string | null = null;
  /** Set of game rooms this socket has joined */
  const joinedGames = new Set<string>();

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

    // Join the game room
    socket.join(`game:${gameId}`);
    joinedGames.add(gameId);

    // Track player connection if playerId provided
    if (playerId) {
      currentPlayerId = playerId;
      playerConnections.set(playerId, { socketId: socket.id, gameInstanceId: gameId });
    }

    // If a game state exists for this game, send it to the joining player
    const existingState = activeGameStates.get(gameId);
    if (existingState) {
      // Send personalized state with this player's hole cards included
      if (playerId) {
        const holeCards = getPlayerHoleCards(gameId, playerId);
        const personalizedState = {
          ...existingState,
          handState: {
            ...existingState.handState,
            players: existingState.handState.players.map(p => ({
              ...p,
              holeCards: p.playerId === playerId && holeCards ? holeCards : [],
            })),
          },
        };
        socket.emit('game:start', personalizedState);
      } else {
        socket.emit('game:start', existingState);
      }
    }
  });

  // Handle game:resync — re-emit current state if available
  socket.on('game:resync', (data: { gameId: string }) => {
    socket.join(`game:${data.gameId}`);
    joinedGames.add(data.gameId);
  });

  // Handle game:action — player submits an action
  socket.on('game:action', (data: { gameId: string; playerId: string; action: PlayerAction }) => {
    // Validate required fields
    if (!data.gameId || !data.playerId || !data.action) {
      return;
    }
    // Rate limit: ignore duplicate rapid actions (debounce 200ms)
    const now = Date.now();
    const lastActionKey = `${data.playerId}:${data.gameId}`;
    const lastTime = actionTimestamps.get(lastActionKey) || 0;
    if (now - lastTime < 200) {
      return; // Ignore duplicate spam
    }
    actionTimestamps.set(lastActionKey, now);

    // Route action to the game loop engine
    handlePlayerAction(data.gameId, data.playerId, data.action);
  });

  // Handle disconnect — don't remove player connections for in-progress games
  // The server turn timer handles timeouts; player can reconnect
  socket.on('disconnect', () => {
    // Only remove from playerConnections if the game is NOT in progress
    // This prevents the "auto-fold on navigate away" issue
    if (currentPlayerId) {
      const connection = playerConnections.get(currentPlayerId);
      if (connection) {
        const gameState = activeGameStates.get(connection.gameInstanceId);
        if (!gameState || gameState.tournament.status !== 'active') {
          playerConnections.delete(currentPlayerId);
        }
        // If game is active, keep the connection entry so turn timer handles timeout
        // Player can reconnect and their socketId will be updated
      }
    }
  });
});

/** Rate-limiting map for action spam prevention */
const actionTimestamps = new Map<string, number>();

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, io, httpServer };
