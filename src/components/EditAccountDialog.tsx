import React, { useState, useEffect } from "react";
import { LogOut, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export function EditAccountDialog({ open, onOpenChange, account, onUpdate, onDelete }: any) {
    const [name, setName] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [apiUrl, setApiUrl] = useState("");
    const [loading, setLoading] = useState(false);

    // FIX: Update form state when the account prop changes
    useEffect(() => {
        if (account) {
            setName(account.name || "");
            setApiKey(account.apiKey || "");
            setApiUrl(account.apiUrl || "");
        }
    }, [account]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onUpdate(account.id, { 
                name, 
                apiKey, 
                apiUrl, 
                provider: account.provider 
            });
            toast({ title: "Success", description: "Account updated." });
            onOpenChange(false);
        } catch (error) {
            toast({ title: "Error", description: "Failed to update account.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    const handleDelete = async () => {
        if(confirm("Are you sure you want to delete this account? This cannot be undone.")) {
            setLoading(true);
            try {
                await onDelete(account.id);
                toast({ title: "Deleted", description: "Account removed." });
                onOpenChange(false);
            } catch (error) {
                toast({ title: "Error", description: "Failed to delete account.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Account</DialogTitle>
                    <DialogDescription>Update credentials for {account?.name}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Account Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                        <Label>API Key</Label>
                        {/* VISIBLE API KEY */}
                        <Input value={apiKey} onChange={e => setApiKey(e.target.value)} type="text" required />
                    </div>
                    {account?.provider === 'activecampaign' && (
                        <div className="grid gap-2">
                            <Label>API URL</Label>
                            <Input value={apiUrl} onChange={e => setApiUrl(e.target.value)} required />
                        </div>
                    )}
                    
                    <DialogFooter className="flex justify-between sm:justify-between items-center w-full">
                         <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                            <LogOut className="w-4 h-4 mr-2" /> Delete
                         </Button>
                         <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading}>
                                <Save className="w-4 h-4 mr-2" /> Save
                            </Button>
                         </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}