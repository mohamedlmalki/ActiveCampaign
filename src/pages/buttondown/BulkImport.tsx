import { useState, useEffect } from 'react';
import { useAccount } from "@/contexts/AccountContext";
import { useJob } from "@/contexts/JobContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Play, RefreshCw, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ButtondownBulkImport() {
  const { activeAccount } = useAccount();
  const { addJob } = useJob();
  
  // Sender Name State
  const [newsletterId, setNewsletterId] = useState<string | null>(null);
  const [senderName, setSenderName] = useState("");
  const [loadingSender, setLoadingSender] = useState(false);

  // Import State
  const [textInput, setTextInput] = useState("");
  const [tags, setTags] = useState("");

  // --- 1. SENDER NAME LOGIC ---
  useEffect(() => {
    if (activeAccount) fetchNewsletterInfo();
  }, [activeAccount]);

  const fetchNewsletterInfo = async () => {
    if (!activeAccount) return;
    setLoadingSender(true);
    try {
      const res = await fetch('/api/buttondown/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: activeAccount.apiKey })
      });
      const data = await res.json();
      if (data && data.id) {
        setNewsletterId(data.id);
        setSenderName(data.from_name || data.name || "");
      }
    } catch (err) {
      console.error("Failed to fetch sender info");
    } finally {
      setLoadingSender(false);
    }
  };

  const updateSenderName = async () => {
    if (!activeAccount || !newsletterId) return;
    setLoadingSender(true);
    try {
      const res = await fetch(`/api/buttondown/newsletter/${newsletterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: activeAccount.apiKey, from_name: senderName })
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Success", description: "Sender Name Updated" });
    } catch (err) {
      toast({ title: "Error", description: "Could not update sender name", variant: "destructive" });
    } finally {
      setLoadingSender(false);
    }
  };

  // --- 2. IMPORT LOGIC ---
  const handleImport = () => {
    if (!textInput.trim()) {
      toast({ title: "Empty Input", description: "Please enter emails to import.", variant: "destructive" });
      return;
    }

    const lines = textInput.split('\n').map(l => l.trim()).filter(l => l);
    const contacts = lines.map(line => {
        // Simple parse: assume "email, firstname lastname" or just "email"
        const parts = line.split(',');
        return {
            email: parts[0].trim(),
            firstName: parts[1] ? parts[1].trim() : undefined,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean)
        };
    });

    if (contacts.length === 0) return;

    addJob({
      title: `Buttondown Import (${contacts.length})`,
      totalItems: contacts.length,
      data: contacts,
      batchSize: 1, // Buttondown API is strict, safer to do 1 by 1 or small batches
      apiEndpoint: '/api/buttondown/import/contact',
      processItem: async (contact) => {
        const res = await fetch('/api/buttondown/import/contact', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ 
               apiKey: activeAccount?.apiKey, 
               contact 
           })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.details || "Failed");
        }
        return await res.json();
      }
    });

    toast({ title: "Job Started", description: `${contacts.length} contacts queued for import.` });
    setTextInput("");
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* SENDER NAME CONFIG */}
      <Card>
        <CardHeader>
          <CardTitle>Newsletter Settings</CardTitle>
          <CardDescription>Configure your public sender name.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-end gap-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="sender">From Name</Label>
            <Input 
                id="sender" 
                value={senderName} 
                onChange={(e) => setSenderName(e.target.value)} 
                placeholder="e.g. John Doe"
            />
          </div>
          <Button onClick={updateSenderName} disabled={loadingSender}>
            {loadingSender ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </CardContent>
      </Card>

      {/* BULK IMPORT */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Import Subscribers</CardTitle>
          <CardDescription>Add multiple subscribers to your Buttondown account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label>Tags (Comma separated)</Label>
                <Input 
                    placeholder="newsletter, 2024-leads" 
                    value={tags} 
                    onChange={e => setTags(e.target.value)} 
                />
            </div>
            <div className="space-y-2">
                <Label>Paste Emails (One per line)</Label>
                <Textarea 
                    placeholder="user@example.com&#10;user2@example.com, John Doe" 
                    rows={10} 
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    className="font-mono"
                />
            </div>
            <Button onClick={handleImport} className="w-full">
                <Upload className="w-4 h-4 mr-2" /> Start Import
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}