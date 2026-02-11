const express = require("express");
const fs = require("fs").promises;
const cors = require("cors");
const path = require("path");
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;
const ACCOUNTS_FILE = path.join(__dirname, "accounts.json");

app.use(cors());
app.use(express.json());

// --- 1. IMPORT ROUTERS ---
const activeCampaignRoutes = require('./routes/activecampaign');
const benchmarkRoutes = require('./routes/benchmark');
const omnisendRoutes = require('./routes/omnisend'); // <--- NEW IMPORT

// --- 2. MOUNT ROUTERS ---
app.use('/api/activecampaign', activeCampaignRoutes);
app.use('/api/benchmark', benchmarkRoutes);
app.use('/api/omnisend', omnisendRoutes); // <--- NEW MOUNT


// --- 3. ACCOUNTS MANAGEMENT ---

const readAccounts = async () => {
  try {
    const data = await fs.readFile(ACCOUNTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    console.error("Error reading accounts file:", error);
    throw new Error("Could not read accounts data.");
  }
};

const writeAccounts = async (accounts) => {
  try {
      await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
  } catch (error) {
      console.error("Error writing accounts file:", error);
      throw new Error("Could not save accounts data.");
  }
};

// GET Accounts
app.get("/api/accounts", async (req, res) => {
  try {
    const accounts = await readAccounts();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: "Failed to read accounts" });
  }
});

// CREATE Account
app.post("/api/accounts", async (req, res) => {
  try {
    const { name, apiKey, apiUrl, provider } = req.body;
    if (!name || !apiKey) return res.status(400).json({ error: "Name and apiKey are required" });
    
    const accounts = await readAccounts();
    const newAccount = { 
        id: `acc_${Date.now()}_${uuidv4().substring(0, 4)}`, 
        name, 
        apiKey, 
        apiUrl: apiUrl || '', // Only for ActiveCampaign
        provider: provider || 'activecampaign' 
    };
    
    accounts.push(newAccount);
    await writeAccounts(accounts);
    res.status(201).json(newAccount);
  } catch (error) {
    res.status(500).json({ error: "Failed to save account" });
  }
});

// UPDATE Account
app.put("/api/accounts/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, apiKey, apiUrl, provider } = req.body;
        
        const accounts = await readAccounts();
        const index = accounts.findIndex(acc => acc.id === id);
        if (index === -1) return res.status(404).json({ error: "Account not found" });
        
        accounts[index] = { ...accounts[index], name, apiKey, apiUrl, provider };
        await writeAccounts(accounts);
        res.json(accounts[index]);
    } catch (error) {
        res.status(500).json({ error: "Failed to update account" });
    }
});

// DELETE Account
app.delete("/api/accounts/:id", async (req, res) => {
    try {
        const { id } = req.params;
        let accounts = await readAccounts();
        const filtered = accounts.filter(acc => acc.id !== id);
        
        if (accounts.length === filtered.length) return res.status(404).json({ error: "Account not found" });
        
        await writeAccounts(filtered);
        res.status(200).json({ message: "Account deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete account" });
    }
});

// Endpoint to check account status (Traffic Cop)
app.post("/api/accounts/check-status", async (req, res) => {
    const { provider } = req.body;
    
    if (provider === 'benchmark') {
        res.redirect(307, '/api/benchmark/check-status');
    } else if (provider === 'omnisend') {
        res.redirect(307, '/api/omnisend/check-status'); // <--- NEW REDIRECT
    } else {
        res.redirect(307, '/api/activecampaign/check-status');
    }
});


// --- 4. CATCH ALL ---
app.use('/api/*', (req, res) => {
    console.log(`[SERVER] ⚠️ 404 Endpoint Not Found: ${req.originalUrl}`);
    res.status(404).json({ error: 'API endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
  console.log(`   - ActiveCampaign Routes: /api/activecampaign/*`);
  console.log(`   - Benchmark Routes:      /api/benchmark/*`);
  console.log(`   - Omnisend Routes:       /api/omnisend/*`);
});