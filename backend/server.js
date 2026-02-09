const express = require("express");
const fs = require("fs").promises;
const cors = require("cors");
const path = require("path");
// Import the ActiveCampaign logic
const activeCampaignRoutes = require('./routes/activecampaign');
const benchmarkRoutes = require('./routes/benchmark');

const app = express();
const PORT = 3001;
const ACCOUNTS_FILE = path.join(__dirname, "accounts.json");

app.use(cors());
app.use(express.json());

// --- Shared Database Helpers ---

const readAccounts = async () => {
  try {
    const data = await fs.readFile(ACCOUNTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};

const writeAccounts = async (accounts) => {
  await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
};

// --- Generic Account Management ---

app.get("/api/accounts", async (req, res) => {
  const accounts = await readAccounts();
  res.json(accounts);
});

app.post("/api/accounts", async (req, res) => {
  // We include 'provider' so the frontend knows this is an AC account
  const { name, apiKey, apiUrl, provider } = req.body;
  const accounts = await readAccounts();
  
  const newAccount = { 
      id: `acc_${Date.now()}`, 
      name, 
      apiKey, 
      apiUrl, 
      provider: provider || 'activecampaign' 
  };
  
  accounts.push(newAccount);
  await writeAccounts(accounts);
  res.status(201).json(newAccount);
});

app.put("/api/accounts/:id", async (req, res) => {
    const { id } = req.params;
    const { name, apiKey, apiUrl, provider } = req.body;
    const accounts = await readAccounts();
    const index = accounts.findIndex(acc => acc.id === id);
    
    if (index === -1) return res.status(404).json({ error: "Account not found" });
    
    accounts[index] = { ...accounts[index], name, apiKey, apiUrl, provider };
    
    await writeAccounts(accounts);
    res.json(accounts[index]);
});

app.delete("/api/accounts/:id", async (req, res) => {
    const { id } = req.params;
    let accounts = await readAccounts();
    const updatedAccounts = accounts.filter(acc => acc.id !== id);
    await writeAccounts(updatedAccounts);
    res.status(200).json({ message: "Account deleted" });
});

// --- Mount ActiveCampaign Routes ---
// This connects the logic file to the /api/activecampaign address
app.use('/api/activecampaign', activeCampaignRoutes);
app.use('/api/benchmark', benchmarkRoutes);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});