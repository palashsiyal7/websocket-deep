const WebSocket = require('ws');
const http = require('http');

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Server Running');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Track all clients
const clients = new Map();

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL = 30000;

// Connection timeout (if no pong received after 60 seconds)
const CONNECTION_TIMEOUT = 60000;

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Add client to map with connection time
  const clientId = Date.now();
  clients.set(ws, {
    id: clientId,
    isAlive: true,
    lastPong: Date.now()
  });
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to WebSocket server',
    clientId
  }));

  // Handle messages
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    // Handle heartbeat pong response
    if (data.type === 'pong') {
      const client = clients.get(ws);
      if (client) {
        client.isAlive = true;
        client.lastPong = Date.now();
      }
      return;
    }
    
    // Handle other message types
    console.log(`Received message from client ${clients.get(ws).id}:`, data);
    
    // Echo back any other messages
    ws.send(JSON.stringify({
      type: 'message',
      message: `Server received: ${data.message || JSON.stringify(data)}`
    }));
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log(`Client ${clients.get(ws)?.id} disconnected`);
    clients.delete(ws);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clients.get(ws)?.id}:`, error);
  });
});

// Heartbeat mechanism
const heartbeat = setInterval(() => {
  const now = Date.now();
  
  wss.clients.forEach((ws) => {
    const client = clients.get(ws);
    
    // Check if client is still connected
    if (client && now - client.lastPong > CONNECTION_TIMEOUT) {
      console.log(`Client ${client.id} timed out, terminating connection`);
      ws.terminate();
      clients.delete(ws);
      return;
    }
    
    // Send ping to check if client is still alive
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping', timestamp: now }));
    }
  });
}, HEARTBEAT_INTERVAL);

// Clean up interval on server close
server.on('close', () => {
  clearInterval(heartbeat);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
}); 