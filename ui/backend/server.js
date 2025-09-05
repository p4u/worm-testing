const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Path to scripts directory
const SCRIPTS_PATH = path.join(__dirname, '../../scripts');

// Helper function to execute shell scripts
const executeScript = (scriptName, args = []) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(SCRIPTS_PATH, scriptName);
    const command = `cd ${SCRIPTS_PATH} && ./${scriptName} ${args.join(' ')}`;
    
    console.log(`Executing: ${command}`);
    
    exec(command, { timeout: 300000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing ${scriptName}:`, error);
        reject({ error: error.message, stderr });
        return;
      }
      
      console.log(`${scriptName} output:`, stdout);
      resolve({ success: true, output: stdout, stderr });
    });
  });
};

// Parse WORM info output
const parseWormInfo = (output) => {
  const lines = output.split('\n');
  const info = {
    network: 'sepolia',
    address: '',
    currentEpoch: 0,
    bethBalance: '0',
    wormBalance: '0',
    claimableWorm: '0',
    epochs: [],
    coins: []
  };

  let inEpochSection = false;
  let inCoinsSection = false;

  for (const line of lines) {
    if (line.includes('Address:')) {
      info.address = line.split('Address:')[1].trim();
    } else if (line.includes('Current epoch:')) {
      info.currentEpoch = parseInt(line.split('Current epoch:')[1].trim());
    } else if (line.includes('BETH balance:')) {
      info.bethBalance = line.split('BETH balance:')[1].trim();
    } else if (line.includes('WORM balance:')) {
      info.wormBalance = line.split('WORM balance:')[1].trim();
    } else if (line.includes('Claimable WORM')) {
      info.claimableWorm = line.split(':')[1].trim();
    } else if (line.includes('Epoch #')) {
      const epochMatch = line.match(/Epoch #(\d+) => ([\d.]+) \/ ([\d.]+) \(Expecting ([\d.]+) WORM\)/);
      if (epochMatch) {
        info.epochs.push({
          epoch: parseInt(epochMatch[1]),
          committed: epochMatch[2],
          total: epochMatch[3],
          expected: epochMatch[4]
        });
      }
    } else if (line.includes('Found') && line.includes('entries for network')) {
      inCoinsSection = true;
    } else if (inCoinsSection && line.includes('"id":')) {
      // Parse coin information
      try {
        const coinMatch = line.match(/"id": "(\d+)"/);
        if (coinMatch) {
          info.coins.push({
            id: coinMatch[1],
            amount: '0' // Simplified for now
          });
        }
      } catch (e) {
        console.log('Error parsing coin:', e);
      }
    }
  }

  return info;
};

// API Routes

// Get account information
app.get('/api/account/info', async (req, res) => {
  try {
    const result = await executeScript('info.sh');
    const parsedInfo = parseWormInfo(result.output);
    res.json({ success: true, data: parsedInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.error || 'Failed to get account info' });
  }
});

// Burn ETH to BETH
app.post('/api/worm/burn', async (req, res) => {
  try {
    const { amount, spend, fee } = req.body;
    
    if (!amount || !spend || !fee) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    const result = await executeScript('burn.sh', [amount, spend, fee]);
    res.json({ success: true, data: result.output });
  } catch (error) {
    res.status(500).json({ success: false, error: error.error || 'Burn operation failed' });
  }
});

// Participate in mining
app.post('/api/worm/participate', async (req, res) => {
  try {
    const { amountPerEpoch, numEpochs } = req.body;
    
    if (!amountPerEpoch || !numEpochs) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    const result = await executeScript('participate.sh', [amountPerEpoch, numEpochs]);
    res.json({ success: true, data: result.output });
  } catch (error) {
    res.status(500).json({ success: false, error: error.error || 'Participation failed' });
  }
});

// Claim rewards
app.post('/api/worm/claim', async (req, res) => {
  try {
    const { fromEpoch, numEpochs } = req.body;
    
    if (fromEpoch === undefined || !numEpochs) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    const result = await executeScript('claim.sh', [fromEpoch, numEpochs]);
    res.json({ success: true, data: result.output });
  } catch (error) {
    res.status(500).json({ success: false, error: error.error || 'Claim operation failed' });
  }
});

// Spend BETH
app.post('/api/worm/spend', async (req, res) => {
  try {
    const { coinId, amount, fee, receiver } = req.body;
    
    if (!coinId || !amount || !fee) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    const args = [coinId, amount, fee];
    if (receiver) args.push(receiver);

    const result = await executeScript('spend.sh', args);
    res.json({ success: true, data: result.output });
  } catch (error) {
    res.status(500).json({ success: false, error: error.error || 'Spend operation failed' });
  }
});

// Recover failed burns
app.post('/api/worm/recover', async (req, res) => {
  try {
    const { method, idOrKey, spend, fee } = req.body;
    
    if (!method || !idOrKey) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    const args = [method, idOrKey];
    if (spend) args.push(spend);
    if (fee) args.push(fee);

    const result = await executeScript('recover.sh', args);
    res.json({ success: true, data: result.output });
  } catch (error) {
    res.status(500).json({ success: false, error: error.error || 'Recovery operation failed' });
  }
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send periodic updates
  const updateInterval = setInterval(async () => {
    try {
      const result = await executeScript('info.sh');
      const parsedInfo = parseWormInfo(result.output);
      socket.emit('accountUpdate', parsedInfo);
    } catch (error) {
      console.error('Error sending update:', error);
    }
  }, 30000); // Update every 30 seconds

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    clearInterval(updateInterval);
  });

  // Manual refresh request
  socket.on('requestUpdate', async () => {
    try {
      const result = await executeScript('info.sh');
      const parsedInfo = parseWormInfo(result.output);
      socket.emit('accountUpdate', parsedInfo);
    } catch (error) {
      socket.emit('error', { message: 'Failed to get account update' });
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 WORM API Server running on port ${PORT}`);
  console.log(`📊 WebSocket server ready for real-time updates`);
  console.log(`📁 Scripts path: ${SCRIPTS_PATH}`);
});
