import { useState } from "react";
import { useAccount } from "@/contexts/AccountContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ButtondownSendEmail() {
  const { activeAccount } = useAccount();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!subject || !body) {
        toast({ title: "Validation Error", description: "Subject and Body are required.", variant: "destructive" });
        return;
    }
    
    setLoading(true);
    try {
        const res = await fetch('/api/buttondown/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey: activeAccount?.apiKey,
                subject,
                body,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                status: 'sent' // Or 'draft' if you want to support drafts
            })
        });
        
        if (!res.ok) throw new Error("Failed to send");
        
        toast({ title: "Email Sent", description: "Your email has been queued." });
        setSubject("");
        setBody("");
        setTags("");
    } catch (error) {
        toast({ title: "Error", description: "Failed to send email.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Send Email</CardTitle>
          <CardDescription>Compose a new email to your subscribers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="My Awesome Newsletter" />
            </div>
            <div className="space-y-2">
                <Label>Tags (Optional)</Label>
                <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="weekly, updates" />
            </div>
            <div className="space-y-2">
                <Label>Body (Markdown supported)</Label>
                <Textarea 
                    value={body} 
                    onChange={e => setBody(e.target.value)} 
                    rows={12} 
                    placeholder="# Hello World&#10;&#10;Write your content here..." 
                    className="font-mono"
                />
            </div>
        </CardContent>
        <CardFooter className="flex justify-end">
            <Button onClick={handleSend} disabled={loading}>
                <Send className="w-4 h-4 mr-2" /> 
                {loading ? "Sending..." : "Send Now"}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}