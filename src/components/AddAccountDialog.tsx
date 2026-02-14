import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccount } from "@/contexts/AccountContext";
import { toast } from "@/hooks/use-toast";

export function AddAccountDialog({ open, onOpenChange }: any) {
  // Handle both controlled and uncontrolled modes
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const show = isControlled ? open : internalOpen;
  const setShow = isControlled ? onOpenChange : setInternalOpen;

  const { addAccount } = useAccount();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<string>("activecampaign");
  const [apiKey, setApiKey] = useState("");
  const [apiUrl, setApiUrl] = useState("");

  const handleSave = async () => {
    if (!name || !provider || !apiKey) {
        toast({ title: "Validation Error", description: "Name, Provider, and API Key are required.", variant: "destructive" });
        return;
    }
    
    if (provider === 'activecampaign' && !apiUrl) {
         toast({ title: "Validation Error", description: "API URL is required for ActiveCampaign.", variant: "destructive" });
         return;
    }

    setLoading(true);
    try {
        await addAccount({
            name,
            provider: provider as any,
            apiKey,
            apiUrl: provider === 'activecampaign' ? apiUrl : undefined
        });
        toast({ title: "Success", description: "Account added successfully." });
        setShow(false);
        // Reset form
        setName("");
        setApiKey("");
        setApiUrl("");
        setProvider("activecampaign");
    } catch (error) {
        toast({ title: "Error", description: "Failed to add account.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={show} onOpenChange={setShow}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Account</Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
          <DialogDescription>
            Connect a new email marketing platform.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Newsletter" />
          </div>
          <div className="grid gap-2">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="activecampaign">ActiveCampaign</SelectItem>
                    <SelectItem value="benchmark">Benchmark Email</SelectItem>
                    <SelectItem value="omnisend">Omnisend</SelectItem>
                    <SelectItem value="buttondown">Buttondown</SelectItem>
                    <SelectItem value="brevo">Brevo (Sendinblue)</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>API Key</Label>
            {/* CHANGED TO TYPE TEXT FOR VISIBILITY */}
            <Input 
                value={apiKey} 
                onChange={e => setApiKey(e.target.value)} 
                type="text" 
                placeholder="Paste your API Key here" 
                autoComplete="off"
            />
          </div>
          
          {provider === 'activecampaign' && (
              <div className="grid gap-2">
                <Label>API URL</Label>
                <Input value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder="https://account.api-us1.com" />
              </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save Account"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}