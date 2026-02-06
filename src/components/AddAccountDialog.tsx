import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddAccountDialogProps {
  onAccountAdd: (account: { name: string; apiKey: string; apiUrl: string; }) => void;
  children: React.ReactNode;
}

export function AddAccountDialog({ onAccountAdd, children }: AddAccountDialogProps) {
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    onAccountAdd({ name, apiKey, apiUrl });
    // Reset fields and close dialog
    setName("");
    setApiKey("");
    setApiUrl("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add ActiveCampaign Account</DialogTitle>
          <DialogDescription>
            Enter the details for the new account. You can find your API Key and URL in your ActiveCampaign dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Account Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="e.g., Production"/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="apiKey" className="text-right">API Key</Label>
            <Input id="apiKey" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="col-span-3" placeholder="Your ActiveCampaign API Key"/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="apiUrl" className="text-right">API URL</Label>
            <Input id="apiUrl" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="col-span-3" placeholder="https://<your-account>.api-us1.com"/>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Save Account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}