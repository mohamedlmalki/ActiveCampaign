import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Edit, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input"; // Ensure you have these UI components
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api"; // Assuming your API client is here
import type { Email } from "@/types"; // Assuming types exist
import { useToast } from "@/hooks/use-toast";
import { useAccount } from "@/contexts/AccountContext";

export default function EmailsList() {
  const { activeAccount } = useAccount(); // Get active account from context
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Emails
  const { data: emails = [], isLoading, error } = useQuery({
    queryKey: ['/api/emails', activeAccount?.id],
    queryFn: () => {
        if (!activeAccount) return [];
        // Pass apiKey explicitly if your api client needs it, or handled globally
        return api.getEmails(activeAccount); 
    },
    enabled: !!activeAccount
  });

  // Update Mutation
  const updateEmailMutation = useMutation({
    mutationFn: (data: { emailId: string; subject?: string; body?: string }) =>
      api.updateEmail(data.emailId, { subject: data.subject, body: data.body }, activeAccount),
    onSuccess: () => {
      toast({ title: "Success", description: "Email updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/emails', activeAccount?.id] });
      setIsEditModalOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update email", variant: "destructive" });
    },
  });

  const handleViewEmail = (email: Email) => {
    setSelectedEmail(email);
    setIsViewModalOpen(true);
  };

  const handleEditEmail = (email: Email) => {
    setSelectedEmail(email);
    setIsEditModalOpen(true);
  };

  const handleUpdateEmail = (data: { subject?: string; body?: string }) => {
    if (selectedEmail) {
      updateEmailMutation.mutate({ emailId: selectedEmail.id, ...data });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent': return <Badge className="bg-green-100 text-green-800 border-green-200">Sent</Badge>;
      case 'draft': return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Draft</Badge>;
      case 'scheduled': return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Scheduled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) return <Card><CardContent className="py-8 text-center text-muted-foreground">Loading emails...</CardContent></Card>;
  if (error) return <Card><CardContent className="py-8 text-center text-destructive">Error loading emails</CardContent></Card>;

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Email List</CardTitle>
          <CardDescription>View all your sent and draft emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No emails found.</div>
          ) : (
            emails.map((email: any) => (
              <div key={email.id} className="border border-border rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">{email.subject}</h3>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                      {getStatusBadge(email.status)}
                      <span>Created: {new Date(email.creation_date).toLocaleString()}</span>
                    </div>
                    {email.tags && email.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {email.tags.map((tag: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <Button variant="ghost" size="sm" onClick={() => handleViewEmail(email)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditEmail(email)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>

        {/* VIEW MODAL */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{selectedEmail?.subject}</DialogTitle>
              <DialogDescription className="flex items-center space-x-4 text-sm">
                {selectedEmail && getStatusBadge(selectedEmail.status)}
                <span>Created: {selectedEmail ? new Date(selectedEmail.creation_date).toLocaleString() : ''}</span>
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] w-full">
              <div className="space-y-4 p-1">
                <div>
                  <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Email Content</h4>
                  <div className="prose prose-sm max-w-none bg-muted/50 p-4 rounded-lg border" dangerouslySetInnerHTML={{ __html: selectedEmail?.body || '' }} />
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* EDIT MODAL (Inline Component) */}
        <EmailEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          email={selectedEmail}
          onUpdate={handleUpdateEmail}
          isUpdating={updateEmailMutation.isPending}
        />
      </Card>
    </div>
  );
}

// --- INLINE EDIT MODAL COMPONENT ---
function EmailEditModal({ isOpen, onClose, email, onUpdate, isUpdating }: any) {
    const [subject, setSubject] = useState(email?.subject || "");
    const [body, setBody] = useState(email?.body || "");

    // Sync state when email changes
    if (email && email.subject !== subject && !isOpen) setSubject(email.subject);
    if (email && email.body !== body && !isOpen) setBody(email.body);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdate({ subject, body });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Edit Email</DialogTitle>
                    <DialogDescription>Update the subject or content of your email.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input id="subject" value={subject} onChange={e => setSubject(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="body">Body (HTML)</Label>
                        <Textarea id="body" value={body} onChange={e => setBody(e.target.value)} rows={10} className="font-mono text-sm" required />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isUpdating}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}