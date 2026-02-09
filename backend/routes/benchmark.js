const express = require('express');
const axios = require('axios');
const router = express.Router();

// --- LOGGING MIDDLEWARE ---
router.use((req, res, next) => {
    console.log(`\n[BENCHMARK] 📩 Incoming ${req.method} request to ${req.originalUrl}`);
    if (req.body && !req.body.importData) { 
        console.log(`[BENCHMARK] 📦 Body:`, JSON.stringify(req.body, null, 2));
    }
    next();
});

// Helper: Benchmark Client
const getBMClient = (apiKey) => {
    if (!apiKey) {
        throw new Error("API Token missing");
    }
    return axios.create({
        baseURL: "https://clientapi.benchmarkemail.com",
        headers: { 
            'AuthToken': apiKey,
            'Content-Type': 'application/json'
        },
        timeout: 15000 
    });
};

// --- ROUTES ---

// 1. Check Status
router.post("/check-status", async (req, res) => {
    const { apiKey } = req.body;
    try {
        const client = getBMClient(apiKey);
        const response = await client.get('/Client/Setting');
        if (response.data?.Response) {
            console.log("[BENCHMARK] ✅ Status Check: Connected.");
            res.json({ status: 'connected', response: response.data.Response });
        } else {
            throw new Error("Invalid response");
        }
    } catch (error) {
        res.status(401).json({ status: 'failed', response: error.message });
    }
});

// 2. Fetch Lists
router.post("/lists", async (req, res) => {
    const { apiKey } = req.body;
    try {
        const client = getBMClient(apiKey);
        const response = await client.get('/Contact/');
        if (response.data?.Response?.Data) {
            const lists = response.data.Response.Data.map(l => ({ 
                listId: l.ID, name: l.Name, count: l.ContactCount 
            }));
            res.json(lists);
        } else {
            res.json([]);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Import Contact
router.post("/import/contact", async (req, res) => {
    const { apiKey, contact, listId } = req.body;
    if (!contact?.email || !listId) return res.status(400).json({ error: "Missing email or listId" });

    try {
        const client = getBMClient(apiKey);
        const payload = {
            Data: {
                Email: contact.email,
                FirstName: contact.firstName || "",
                LastName: contact.lastName || "",
                EmailPerm: "1"
            }
        };
        const response = await client.post(`/Contact/${listId}/ContactDetails`, payload);
        if (response.data.Response.Status === 1 || response.data.Response.Status === "1") {
            res.status(202).json({ success: true, data: response.data.Response });
        } else {
            res.status(400).json({ error: "API Failure", details: response.data.Response });
        }
    } catch (error) {
        res.status(500).json({ error: "Import failed", details: error.message });
    }
});

// 4. Fetch Contacts
router.post("/contacts-by-list", async (req, res) => {
    const { apiKey, listId, page = 1, perPage = 20 } = req.body;
    try {
        const client = getBMClient(apiKey);
        const response = await client.get(`/Contact/${listId}/ContactDetails`, { 
            params: { PageNumber: page, PageSize: perPage } 
        });
        if (response.data?.Response?.Data) {
            const contacts = response.data.Response.Data.map(c => ({
                id: c.ID, email: c.Email, firstName: c.FirstName, lastName: c.LastName,
                status: c.EmailPerm, dateAdded: c.CreatedDate
            }));
            res.json({ contacts, total: parseInt(response.data.Response.Count || '0', 10) });
        } else {
            res.json({ contacts: [], total: 0 });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch contacts" });
    }
});

// 5. Delete Contacts (Loop)
router.delete("/lists/:listId/contacts", async (req, res) => {
    const { apiKey, contactIds } = req.body;
    const { listId } = req.params;
    if (!apiKey || !contactIds) return res.status(400).json({ error: "Missing fields" });

    const client = getBMClient(apiKey);
    let successCount = 0;
    
    // Run deletions
    await Promise.allSettled(contactIds.map(async (id) => {
        const response = await client.delete(`/Contact/${listId}/ContactDetails/${id}`);
        if (response.data?.Response?.Status === "1" || response.data?.Response?.Status === 1) {
            successCount++;
        }
    }));

    console.log(`[BENCHMARK] ✅ Deleted ${successCount} contacts.`);
    res.json({ message: "Deletion complete", successCount });
});

// 6. Unsubscribe
router.post("/unsubscribe", async (req, res) => {
    const { apiKey, contacts } = req.body;
    try {
        const client = getBMClient(apiKey);
        const payload = { Data: { Contacts: contacts.map(c => ({ Email: c.email })) } };
        await client.post('/Contact/UnsubscribeContacts', payload);
        res.json({ message: "Unsubscribed" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- AUTOMATION ROUTES (NEW) ---

// 7. Get Automations List
router.post("/automations", async (req, res) => {
    const { apiKey } = req.body;
    try {
        console.log("[BENCHMARK] 📡 Fetching Automations...");
        const client = getBMClient(apiKey);
        const response = await client.get('/Automation/Report'); // Using Report endpoint as it lists active automations

        if (response.data?.Response?.Data) {
            const automations = response.data.Response.Data.map(a => ({
                workflowId: a.ID,
                name: a.Name,
                status: String(a.Status), // "1" = Active
                contactCount: a.ContactCount,
                fromName: a.FromName
            }));
            console.log(`[BENCHMARK] ✅ Found ${automations.length} automations.`);
            res.json(automations);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error("Fetch Automations Error:", error.message);
        res.status(500).json({ error: "Failed to fetch automations" });
    }
});

// 8. Get Automation Stats (Report)
router.post("/automations/:id/report", async (req, res) => {
    const { apiKey } = req.body;
    const { id } = req.params;
    try {
        console.log(`[BENCHMARK] 📡 Fetching Report for Automation ${id}...`);
        const client = getBMClient(apiKey);
        const response = await client.get(`/Automation/${id}/Report`);

        if (response.data?.Response?.Data) {
            // API returns array of steps/emails. We summarize or return raw.
            // Let's return the raw list so frontend can display table of emails in workflow.
            const reportData = response.data.Response.Data.map(item => ({
                stepId: item.ID,
                subject: item.Subject,
                sends: parseInt(item.Sends || 0),
                opens: parseInt(item.Opens || 0),
                clicks: parseInt(item.Clicks || 0),
                bounces: parseInt(item.Bounces || 0)
            }));
            res.json(reportData);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error("Fetch Automation Report Error:", error.message);
        res.status(500).json({ error: "Failed to fetch report" });
    }
});

// 9. Update "From Name"
router.patch("/automations/:id/from-name", async (req, res) => {
    const { apiKey, newFromName } = req.body;
    const { id } = req.params;
    
    if (!newFromName) return res.status(400).json({ error: "New name required" });

    try {
        console.log(`[BENCHMARK] 📝 Updating FromName for Automation ${id}...`);
        const client = getBMClient(apiKey);

        // 1. Get current details to preserve other fields
        const detailsRes = await client.get(`/Automation/${id}`);
        const current = detailsRes.data.Response;

        // 2. Patch with new name
        const payload = {
            Detail: {
                ...current,
                FromName: newFromName
            }
        };
        
        // Remove ID from payload body if it exists (Benchmark might complain)
        delete payload.Detail.ID; 

        const response = await client.patch(`/Automation/${id}`, payload);
        
        if (response.data?.Response?.Status === "1" || response.data?.Response?.Status === 1) {
            console.log("[BENCHMARK] ✅ Update Success");
            res.json({ success: true });
        } else {
            throw new Error("Benchmark refused update");
        }
    } catch (error) {
        console.error("Update Automation Error:", error.message);
        res.status(500).json({ error: "Failed to update automation" });
    }
});

module.exports = router;