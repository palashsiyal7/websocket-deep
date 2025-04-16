// DOM Elements
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const websocketStatus = document.getElementById('websocket-status');
const lastHeartbeat = document.getElementById('last-heartbeat');
const errorPage = document.getElementById('error-page');
const connectionDetails = document.getElementById('connection-details');
const messageContainer = document.querySelector('.message-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const messageHistory = document.getElementById('message-history');
const retryButton = document.getElementById('retry-button');

// WebSocket Configuration
const WS_URL = `ws://${window.location.hostname}:3000`;
let socket = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let isFirstConnect = true;
let isOnline = navigator.onLine;
let lastPingTime = null;

// Connection state storage key
const CONNECTION_STATE_KEY = 'websocket_connection_state';

// Initialize app
function init() {
  // Check network status on load
  updateNetworkStatus();
  
  // Check if previously connected
  checkPreviousConnectionState();

  // Event listeners
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  retryButton.addEventListener('click', connectWebSocket);
  sendButton.addEventListener('click', sendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  // Connect to WebSocket if online
  if (isOnline) {
    connectWebSocket();
  } else {
    showErrorPage();
  }
}

// Check previous connection state from localStorage
function checkPreviousConnectionState() {
  try {
    const savedState = localStorage.getItem(CONNECTION_STATE_KEY);
    if (savedState) {
      const state = JSON.parse(savedState);
      if (state.wasOffline) {
        showErrorPage();
      }
    }
  } catch (error) {
    console.error('Error loading previous connection state:', error);
  }
}

// Save connection state to localStorage
function saveConnectionState(wasOffline) {
  try {
    localStorage.setItem(CONNECTION_STATE_KEY, JSON.stringify({
      wasOffline,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Error saving connection state:', error);
  }
}

// Show error page
function showErrorPage() {
  errorPage.classList.remove('hidden');
  connectionDetails.classList.add('hidden');
  messageContainer.classList.add('hidden');
  saveConnectionState(true);
}

// Hide error page
function hideErrorPage() {
  errorPage.classList.add('hidden');
  connectionDetails.classList.remove('hidden');
  messageContainer.classList.remove('hidden');
  saveConnectionState(false);
}

// Update network status UI
function updateNetworkStatus() {
  isOnline = navigator.onLine;
  
  if (isOnline) {
    statusIndicator.className = socket && socket.readyState === WebSocket.OPEN ? 'status-online' : 'status-connecting';
    statusText.textContent = socket && socket.readyState === WebSocket.OPEN ? 'Connected' : 'Connecting...';
  } else {
    statusIndicator.className = 'status-offline';
    statusText.textContent = 'Offline';
    websocketStatus.textContent = 'Disconnected (Offline)';
    saveConnectionState(true);
  }
}

// Handle online event
function handleOnline() {
  console.log('Network is online');
  updateNetworkStatus();
  
  // Reconnect WebSocket
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    connectWebSocket();
  }
}

// Handle offline event
function handleOffline() {
  console.log('Network is offline');
  updateNetworkStatus();
  
  if (socket) {
    // No need to explicitly close, but update UI
    addMessageToHistory('System', 'Network connection lost. Reconnecting when online...', 'system');
  }
}

// Connect to WebSocket server
function connectWebSocket() {
  // Clear previous connection
  if (socket) {
    socket.close();
  }
  
  // Clear reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  
  // Update UI
  statusIndicator.className = 'status-connecting';
  statusText.textContent = 'Connecting...';
  websocketStatus.textContent = 'Connecting...';
  
  try {
    // Create new WebSocket connection
    socket = new WebSocket(WS_URL);
    
    // Connection opened
    socket.addEventListener('open', () => {
      console.log('WebSocket connection established');
      reconnectAttempts = 0;
      statusIndicator.className = 'status-online';
      statusText.textContent = 'Connected';
      websocketStatus.textContent = 'Connected';
      sendButton.disabled = false;
      hideErrorPage();
      
      if (!isFirstConnect) {
        addMessageToHistory('System', 'Reconnected to server', 'system');
      } else {
        addMessageToHistory('System', 'Connected to server', 'system');
        isFirstConnect = false;
      }
    });
    
    // Listen for messages
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different message types
        switch (data.type) {
          case 'ping':
            // Respond to heartbeat ping
            lastPingTime = new Date(data.timestamp);
            lastHeartbeat.textContent = formatTime(lastPingTime);
            socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;
            
          case 'connection':
            addMessageToHistory('Server', data.message, 'system');
            break;
            
          case 'message':
            addMessageToHistory('Server', data.message, 'received');
            break;
            
          default:
            addMessageToHistory('Server', JSON.stringify(data), 'received');
        }
      } catch (error) {
        console.error('Error parsing message:', error);
        addMessageToHistory('System', `Error parsing message: ${event.data}`, 'system');
      }
    });
    
    // Connection closed
    socket.addEventListener('close', (event) => {
      console.log('WebSocket connection closed', event.code, event.reason);
      statusIndicator.className = 'status-offline';
      statusText.textContent = 'Disconnected';
      websocketStatus.textContent = `Disconnected (Code: ${event.code})`;
      sendButton.disabled = true;
      
      // Only attempt to reconnect if we're online
      if (isOnline) {
        scheduleReconnect();
      }
    });
    
    // Connection error
    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      addMessageToHistory('System', 'Connection error', 'system');
      
      // Show error page on first connection attempt
      if (isFirstConnect) {
        showErrorPage();
      }
    });
    
  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
    if (isFirstConnect) {
      showErrorPage();
    }
    scheduleReconnect();
  }
}

// Schedule WebSocket reconnection with exponential backoff
function scheduleReconnect() {
  const maxReconnectDelay = 30000; // 30 seconds max
  const baseDelay = 1000; // 1 second
  
  reconnectAttempts++;
  const delay = Math.min(baseDelay * Math.pow(1.5, reconnectAttempts - 1), maxReconnectDelay);
  
  console.log(`Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts})`);
  addMessageToHistory('System', `Reconnecting in ${delay/1000} seconds...`, 'system');
  
  reconnectTimer = setTimeout(connectWebSocket, delay);
}

// Send message to server
function sendMessage() {
  const message = messageInput.value.trim();
  
  if (message && socket && socket.readyState === WebSocket.OPEN) {
    // Create message object
    const messageObj = {
      type: 'message',
      message: message,
      timestamp: Date.now()
    };
    
    // Send to server
    socket.send(JSON.stringify(messageObj));
    
    // Add to UI
    addMessageToHistory('You', message, 'sent');
    
    // Clear input
    messageInput.value = '';
  }
}

// Add message to history
function addMessageToHistory(sender, message, type) {
  const messageItem = document.createElement('div');
  messageItem.className = `message-item ${type}`;
  
  const time = new Date();
  const timeStr = formatTime(time);
  
  messageItem.innerHTML = `
    <strong>${sender}:</strong> ${message}
    <div class="timestamp">${timeStr}</div>
  `;
  
  messageHistory.appendChild(messageItem);
  messageHistory.scrollTop = messageHistory.scrollHeight;
}

// Format time
function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Initialize the app
init(); 