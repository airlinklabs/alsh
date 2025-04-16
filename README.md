# ALSH - AirLink Shell

ALSH stands for AirLink Shell. It provides a secure connection to your AirLink server, allowing you to easily interact with the server from your terminal.

Installer for Linux and macOS

The following script installs ALSH on Linux and macOS:

```bash
#!/bin/bash
# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  # If Homebrew is available (macOS and Linux)
  if command -v brew &> /dev/null; then
    brew install node
  # If APT is available (Linux)
  elif command -v apt &> /dev/null; then
    sudo apt update && sudo apt install -y nodejs npm
  # Otherwise, install Node.js from NodeSource
  else
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
  fi
fi

# Create ALSH directory and install dependencies
ALSH_DIR="$HOME/.local/share/alsh"
mkdir -p "$ALSH_DIR"
cd "$ALSH_DIR"
npm init -y > /dev/null
npm install ws > /dev/null

# Create the alsh-client.js script
cat > "$ALSH_DIR/alsh-client.js" << 'EOF'
const WebSocket = require('ws');
const readline = require('readline');

// Get the credentials from the command line arguments
const credentials = process.argv[2];
if (!credentials || !credentials.includes(':')) {
  console.error('Usage: node yourscript.js id:password');
  process.exit(1);
}
const [ID, PASSWORD] = credentials.split(':');

// AirLink WebSocket URL
const WS_URL = 'wss://alsh.airlinklabs.xyz';
const ws = new WebSocket(WS_URL);
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Suppress default console output
console.log = function () {};
console.error = function () {};

// Connect to WebSocket server and authenticate
ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'login', role: 'client', id: ID, password: PASSWORD }));
});

// Handle messages from the WebSocket server
ws.on('message', (msg) => {
  const data = JSON.parse(msg);
  
  // Handle login success
  if (data.type === 'login-success') {
    rl.on('line', (line) => {
      ws.send(JSON.stringify({ type: 'stream', payload: line + '\n' }));
    });
  }
  
  // Handle stream messages
  else if (data.type === 'stream') {
    process.stdout.write(data.payload);
  }
  
  // Handle errors
  else if (data.type === 'error') {
    process.exit(1);
  }
});
EOF

# Create the executable alsh script
BIN_PATH="$HOME/.local/bin"
mkdir -p "$BIN_PATH"
echo "#!/bin/bash" > "$BIN_PATH/alsh"
echo "node \"$ALSH_DIR/alsh-client.js\" \"\$1\"" >> "$BIN_PATH/alsh"
chmod +x "$BIN_PATH/alsh"

# Add the binary path to the system PATH if it's not already included
if [[ ":$PATH:" != *":$BIN_PATH:"* ]]; then
  echo "export PATH=\"\$PATH:$BIN_PATH\"" >> "$HOME/.zshrc"
  echo "Run: source ~/.zshrc"
fi

echo "Installation complete. Use the following command to connect to the AirLink server:"
echo "alsh id:password"
```

Instructions for Use:
	1.	Run the above script to install ALSH.
	2.	Once installed, use the following command to connect to the AirLink server:

alsh id:password

Replace id and password with your actual credentials, or just copy the command from the Airlink Panel.
