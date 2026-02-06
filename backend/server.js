const express = require("express");
const fs = require("fs").promises;
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;
const ACCOUNTS_FILE = path.join(__dirname, "accounts.json");

app.use(cors());
app.use(express.json());

// Helper function to create an authorized Axios instance for ActiveCampaign
const getActiveCampaignApiClient = (apiKey, apiUrl) => {
    if (!apiKey || !apiUrl) {
        throw new Error("API Key or API URL is missing.");
    }
    return axios.create({
        baseURL: apiUrl,
        headers: {
            'Api-Token': apiKey,
            'Content-Type': 'application/json'
        }
    });
};


// Helper function to read accounts
const readAccounts = async () => {
  try {
    const data = await fs.readFile(ACCOUNTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};

// Helper function to write accounts
const writeAccounts = async (accounts) => {
  await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
};

// --- Account Management Endpoints ---
app.get("/api/accounts", async (req, res) => {
  const accounts = await readAccounts();
  res.json(accounts);
});

app.post("/api/accounts", async (req, res) => {
  const { name, apiKey, apiUrl } = req.body;
  const accounts = await readAccounts();
  const newAccount = { id: `acc_${Date.now()}`, name, apiKey, apiUrl };
  accounts.push(newAccount);
  await writeAccounts(accounts);
  res.status(201).json(newAccount);
});

app.put("/api/accounts/:id", async (req, res) => {
    const { id } = req.params;
    const { name, apiKey, apiUrl } = req.body;
    const accounts = await readAccounts();
    const accountIndex = accounts.findIndex(acc => acc.id === id);
    if (accountIndex === -1) return res.status(404).json({ error: "Account not found" });
    accounts[accountIndex] = { ...accounts[accountIndex], name, apiKey, apiUrl };
    await writeAccounts(accounts);
    res.json(accounts[accountIndex]);
});

app.delete("/api/accounts/:id", async (req, res) => {
    const { id } = req.params;
    let accounts = await readAccounts();
    const updatedAccounts = accounts.filter(acc => acc.id !== id);
    await writeAccounts(updatedAccounts);
    res.status(200).json({ message: "Account deleted successfully" });
});

// --- ActiveCampaign API Endpoints ---

app.post("/api/accounts/check-status", async (req, res) => {
  const { apiKey, apiUrl } = req.body;
  try {
    const apiClient = getActiveCampaignApiClient(apiKey, apiUrl);
    const response = await apiClient.get('/api/3/users/me');
    res.json({ status: 'connected', response: response.data });
  } catch (error) {
    console.error("Check status failed:", error.response ? error.response.data : error.message);
    res.status(401).json({ status: 'failed', response: error.response ? error.response.data : { message: error.message } });
  }
});

// --- ActiveCampaign Contact/List Endpoints ---
app.post("/api/activecampaign/lists", async (req, res) => {
    const { apiKey, apiUrl } = req.body;
    try {
        const apiClient = getActiveCampaignApiClient(apiKey, apiUrl);
        const response = await apiClient.get('/api/3/lists');
        res.json(response.data.lists.map(l => ({ listId: l.id, name: l.name })));
    } catch (error) {
        console.error("Failed to fetch lists:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to fetch lists", details: error.response ? error.response.data : error.message });
    }
});

app.post("/api/import/contact", async (req, res) => {
    const { apiKey, apiUrl, contact, listId } = req.body;
    try {
        const apiClient = getActiveCampaignApiClient(apiKey, apiUrl);
        const contactPayload = { contact: { email: contact.email, firstName: contact.firstName, lastName: contact.lastName } };
        const contactResponse = await apiClient.post('/api/3/contact/sync', contactPayload);
        const contactId = contactResponse.data.contact.id;
        const listPayload = { contactList: { list: listId, contact: contactId, status: 1 } };
        await apiClient.post('/api/3/contactLists', listPayload);
        res.status(202).json(contactResponse.data);
    } catch (error) {
         console.error("Failed to import contact:", error.response ? error.response.data : error.message);
         res.status(error.response?.status || 500).json(error.response?.data || { message: "An unknown error occurred" });
    }
});

app.post("/api/activecampaign/contacts-by-list", async (req, res) => {
    const { apiKey, apiUrl, listId, page = 1, perPage = 10 } = req.body;
    try {
        const apiClient = getActiveCampaignApiClient(apiKey, apiUrl);
        const offset = (page - 1) * perPage;
        const response = await apiClient.get('/api/3/contacts', { params: { 'listid': listId, 'limit': perPage, 'offset': offset, 'include': 'contactLists' } });
        const contactLists = response.data.contactLists || [];
        const contactsWithListId = response.data.contacts.map(contact => {
            const contactList = contactLists.find(cl => cl.contact === contact.id && cl.list === listId);
            return { ...contact, contactListId: contactList?.id };
        });
        res.json({ contacts: contactsWithListId, total: response.data.meta.total });
    } catch (error) {
        console.error("Failed to fetch contacts:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to fetch contacts", details: error.response ? error.response.data : error.message });
    }
});

app.post("/api/activecampaign/unsubscribe", async (req, res) => {
    const { apiKey, apiUrl, contacts } = req.body;
    if (!apiKey || !apiUrl || !contacts) return res.status(400).json({ error: "API Key, API URL, and contacts are required" });
    try {
        const apiClient = getActiveCampaignApiClient(apiKey, apiUrl);
        for (const contact of contacts) {
            if (contact.contactListId) {
                await apiClient.put(`/api/3/contactLists/${contact.contactListId}`, { contactList: { status: 2 } });
            }
        }
        res.status(200).json({ message: `${contacts.length} contact(s) unsubscribed successfully` });
    } catch (error) {
        console.error("Failed to unsubscribe contacts:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to unsubscribe contacts", details: error.response ? error.response.data : error.message });
    }
});

app.post("/api/activecampaign/delete-contacts", async (req, res) => {
    const { apiKey, apiUrl, contactIds } = req.body;
    if (!apiKey || !apiUrl || !contactIds || !Array.isArray(contactIds)) return res.status(400).json({ error: "API Key, API URL, and a contactIds array are required" });
    try {
        const apiClient = getActiveCampaignApiClient(apiKey, apiUrl);
        for (const contactId of contactIds) {
            await apiClient.delete(`/api/3/contacts/${contactId}`);
        }
        res.status(200).json({ message: `${contactIds.length} contact(s) deleted successfully` });
    } catch (error) {
        console.error("Failed to delete contacts:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to delete from ActiveCampaign", details: error.response ? error.response.data : error.message });
    }
});

// --- ActiveCampaign Automation & Campaign Endpoints ---
app.post("/api/activecampaign/automations", async (req, res) => {
    const { apiKey, apiUrl } = req.body;
    try {
        const apiClient = getActiveCampaignApiClient(apiKey, apiUrl);
        const response = await apiClient.get('/api/3/automations');
        res.json(response.data.automations.map(a => ({ workflowId: a.id, name: a.name, status: a.status })));
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch automations", details: error.response?.data || error.message });
    }
});

// --- UPDATED ENDPOINT FOR AUTOMATION STATS ---
app.post("/api/activecampaign/automations/:workflowId/stats", async (req, res) => {
    const { apiKey, apiUrl } = req.body;
    const { workflowId } = req.params;
    try {
        const apiClient = getActiveCampaignApiClient(apiKey, apiUrl);
        
        // Fetch total number of contacts that have ever been in the automation
        const allContactsResponse = await apiClient.get('/api/3/contactAutomations', { 
            params: { 'filters[automation]': workflowId } 
        });
        const totalEntrants = allContactsResponse.data.meta.total;

        // Fetch only the contacts currently active in the automation
        const activeContactsResponse = await apiClient.get('/api/3/contactAutomations', { 
            params: { 'filters[automation]': workflowId, 'filters[status]': 1 }
        });
        const inProgressCount = activeContactsResponse.data.meta.total;
        
        // Calculate completed contacts
        const completedCount = totalEntrants - inProgressCount;

        res.json({
            subscriberStatistics: {
                totalEntrants,
                inProgressCount,
                completedCount
            }
        });
    } catch (error) {
        console.error("Failed to fetch workflow stats:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to fetch workflow stats", details: error.response?.data || error.message });
    }
});

app.post("/api/activecampaign/campaigns", async (req, res) => {
    const { apiKey, apiUrl } = req.body;
    try {
        const apiClient = getActiveCampaignApiClient(apiKey, apiUrl);
        const response = await apiClient.get('/api/3/campaigns', { params: { limit: 100, orders: { sdate: 'DESC' } } });
        res.json(response.data);
    } catch (error) {
        console.error("Failed to fetch campaigns:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to fetch campaigns", details: error.response?.data || error.message });
    }
});

app.post("/api/activecampaign/campaigns/:campaignId/stats", async (req, res) => {
    const { apiKey, apiUrl } = req.body;
    const { campaignId } = req.params;
    try {
        const apiClient = getActiveCampaignApiClient(apiKey, apiUrl);
        const response = await apiClient.get(`/api/3/campaigns/${campaignId}/reportTotals`);
        res.json(response.data);
    } catch (error) {
        console.error("Failed to fetch campaign stats:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to fetch campaign stats", details: error.response?.data || error.message });
    }
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});