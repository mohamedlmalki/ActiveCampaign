const express = require('express');
const axios = require('axios');
const router = express.Router();

// --- LOGGING MIDDLEWARE ---
router.use((req, res, next) => {
    console.log(`\n[BUTTONDOWN] 📩 Incoming ${req.method} request to ${req.originalUrl}`);
    if (req.body && !req.body.importData) {
        console.log(`[BUTTONDOWN] 📦 Body:`, JSON.stringify(req.body, null, 2));
    }
    next();
});

// Helper: Buttondown Client
const getClient = (apiKey) => {
    if (!apiKey) throw new Error("API Key missing");
    return axios.create({
        baseURL: "https://api.buttondown.email/v1",
        headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json'
        },
        timeout: 20000
    });
};

// --- ROUTES ---

// 1. Check Status
router.post("/check-status", async (req, res) => {
    const { apiKey } = req.body;
    try {
        const client = getClient(apiKey);
        // Fetch 1 email just to check auth
        const response = await client.get('/emails', { params: { limit: 1 } });
        console.log("[BUTTONDOWN] ✅ Status Check: Connected.");
        res.json({ status: 'connected', response: { status: response.status } });
    } catch (error) {
        console.error("[BUTTONDOWN] ❌ Status Check Failed:", error.message);
        res.status(401).json({ status: 'failed', response: error.response?.data || error.message });
    }
});

// 2. Import Contact (Single)
router.post("/import/contact", async (req, res) => {
    const { apiKey, contact } = req.body;
    if (!contact?.email) return res.status(400).json({ error: "Email is required" });

    try {
        const client = getClient(apiKey);
        // Buttondown expects 'email_address'
        const payload = {
            email_address: contact.email,
            type: 'regular',
            tags: contact.tags || []
        };
        
        // Add optional notes if present
        if (contact.firstName || contact.lastName) {
             payload.notes = `Name: ${contact.firstName || ''} ${contact.lastName || ''}`.trim();
        }

        const response = await client.post('/subscribers', payload);
        res.status(201).json({ success: true, id: response.data.id });
    } catch (error) {
        // Handle "already subscribed" errors gracefully if needed, 
        // but Buttondown usually returns 400 for duplicates.
        const msg = error.response?.data?.detail || error.message;
        console.error(`[BUTTONDOWN] ❌ Import Failed: ${msg}`);
        res.status(400).json({ error: "Import failed", details: msg });
    }
});

// 3. Get Subscribers
router.post("/subscribers", async (req, res) => {
    const { apiKey, page = 1 } = req.body;
    try {
        const client = getClient(apiKey);
        const response = await client.get('/subscribers', { params: { page } });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch subscribers" });
    }
});

// 4. Get Emails (Sent Newsletters)
router.post("/emails", async (req, res) => {
    const { apiKey } = req.body;
    try {
        const client = getClient(apiKey);
        const response = await client.get('/emails');
        res.json(response.data.results);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch emails" });
    }
});

// 5. Send Email (Add Letter)
router.post("/send-email", async (req, res) => {
    const { apiKey, subject, body, tags, status = 'sent' } = req.body;
    try {
        const client = getClient(apiKey);
        const payload = {
            subject,
            body,
            tags: tags || [],
            email_type: 'public', // or 'private'
            status: status // 'sent', 'scheduled', 'draft'
        };
        const response = await client.post('/emails', payload);
        res.json({ success: true, data: response.data });
    } catch (error) {
        res.status(500).json({ error: error.response?.data || "Failed to send email" });
    }
});

// 6. Email Analytics
router.post("/emails/:emailId/analytics", async (req, res) => {
    const { apiKey } = req.body;
    const { emailId } = req.params;
    try {
        const client = getClient(apiKey);
        const response = await client.get(`/emails/${emailId}/analytics`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch analytics" });
    }
});

// 7. Get Newsletter Info (For Sender Name)
router.post("/newsletter", async (req, res) => {
    const { apiKey } = req.body;
    try {
        const client = getClient(apiKey);
        const response = await client.get('/newsletters');
        // Usually returns a list, we take the first one
        const newsletter = response.data.results?.[0];
        if (newsletter) {
            res.json(newsletter);
        } else {
            res.status(404).json({ error: "No newsletter found" });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch newsletter info" });
    }
});

// 8. Update Newsletter (Sender Name)
router.patch("/newsletter/:id", async (req, res) => {
    const { apiKey, from_name } = req.body;
    const { id } = req.params;
    try {
        const client = getClient(apiKey);
        const response = await client.patch(`/newsletters/${id}`, { from_name });
        res.json({ success: true, data: response.data });
    } catch (error) {
        res.status(500).json({ error: "Failed to update sender name" });
    }
});

module.exports = router;