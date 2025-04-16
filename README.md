# WebSocket Connection Demo

A demonstration of a WebSocket server with heartbeat mechanism and frontend with offline detection and reconnection capabilities.

## Features

- Native WebSocket server implementation (no Socket.io)
- Heartbeat mechanism to maintain connection stability
- User's internet connection status detection (online/offline)
- Offline indicator that persists across page refreshes
- Error page when loading without internet connection
- Service Worker for offline support
- Automatic WebSocket reconnection when coming back online

## Installation

1. Clone the repository:
```bash
git clone https://github.com/palashsiyal7/websocket-deep.git
cd websocket-deep
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Running in Development Mode

To run both the WebSocket server and the static file server:

```bash
npm run dev
```

This will start:
- WebSocket server on port 3000
- Static file server on port 8080

You can access the application at http://localhost:8080

### Running Servers Separately

To run only the WebSocket server:

```bash
npm run dev:ws
```

To run only the static file server:

```bash
npm run dev:static
```

### Running in Production Mode

For the WebSocket server:

```bash
npm start
```

For the static file server:

```bash
npm run serve
```

## Testing Offline Functionality

1. Load the application while online
2. Disconnect your internet connection or use browser DevTools to simulate offline status
3. The application will show an offline indicator
4. Refresh the page to see the offline error page
5. Reconnect to the internet, and the application should automatically reconnect

## Implementation Details

### Backend

- Native WebSocket server using the `ws` npm package
- Heartbeat mechanism with ping/pong messages every 30 seconds
- Connection timeout after 60 seconds of no response

### Frontend

- Connection status detection using the Navigator online/offline API
- LocalStorage for persisting connection status across page refreshes
- Service Worker for offline support and caching
- Automatic reconnection with exponential backoff when coming back online

## License

MIT 