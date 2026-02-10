import { useState, useEffect, useRef, useCallback } from "react";
import { Mail, Pencil, Eye, Save, Bold, Italic, Underline, List, Heading1, Heading2, Quote, AlignLeft, AlignCenter, AlignRight, Code, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/contexts/AccountContext";
import { toast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PAGE_SIZE = 15;

// --- RICH TEXT EDITOR COMPONENT ---
function RichTextEditor({ initialContent, onChange, disabled }: { initialContent: string, onChange: (html: string) => void, disabled?: boolean }) {
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editorRef.current && initialContent && editorRef.current.innerHTML !== initialContent) {
            editorRef.current.innerHTML = initialContent;
        }
    }, [initialContent]);

    const handleInput = () => {
        if (editorRef.current) onChange(editorRef.current.innerHTML);
    };

    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        handleInput();
        editorRef.current?.focus();
    };

    if (disabled) {
        return (
            <div className="border rounded-md bg-muted/20 p-4 h-[300px] overflow-y-auto">
                <div dangerouslySetInnerHTML={{ __html: initialContent }} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full border rounded-md overflow-hidden bg-background">
            <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/20">
                <Button variant="ghost" size="icon" onClick={() => execCmd('bold')} title="Bold"><Bold className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => execCmd('italic')} title="Italic"><Italic className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => execCmd('underline')} title="Underline"><Underline className="h-4 w-4" /></Button>
                <div className="w-px h-6 bg-border mx-1 my-auto" />
                <Button variant="ghost" size="icon" onClick={() => execCmd('formatBlock', 'H1')} title="Heading 1"><Heading1 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => execCmd('formatBlock', 'H2')} title="Heading 2"><Heading2 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => execCmd('insertUnorderedList')} title="Bullet List"><List className="h-4 w-4" /></Button>
                <div className="w-px h-6 bg-border mx-1 my-auto" />
                <Button variant="ghost" size="icon" onClick={() => execCmd('justifyLeft')} title="Align Left"><AlignLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => execCmd('justifyCenter')} title="Align Center"><AlignCenter className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => execCmd('justifyRight')} title="Align Right"><AlignRight className="h-4 w-4" /></Button>
            </div>
            <div 
                ref={editorRef}
                className="flex-1 p-4 overflow-y-auto outline-none prose prose-sm max-w-none"
                contentEditable
                onInput={handleInput}
                style={{ minHeight: '300px' }}
            />
        </div>
    );
}

interface BenchmarkEmailListItem {
    id: string;
    name: string;
    subject: string;
    status: string;
    modifiedDate: string;
}

interface BenchmarkEmailDetails extends BenchmarkEmailListItem {
    TemplateContent?: string;
    EmailType?: string; // "DD" (Drag&Drop) or "Custom"
}

export default function EmailManagement() {
  const { activeAccount } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [emails, setEmails] = useState<BenchmarkEmailListItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);

  const [isEditing, setIsEditing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<BenchmarkEmailDetails | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedHtmlBody, setEditedHtmlBody] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const totalPages = Math.ceil(totalEmails / PAGE_SIZE);
  
  // Check if current email is Drag & Drop
  const isDragAndDrop = selectedEmail?.EmailType === "DD";

  const fetchEmails = useCallback(async (page: number) => {
    if (!activeAccount) { setEmails([]); setTotalEmails(0); return; };
    setIsLoading(true);
    try {
        const response = await fetch('/api/benchmark/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: activeAccount.apiKey, page, perPage: PAGE_SIZE })
        });
        if (!response.ok) throw new Error("Failed to fetch emails");
        const data = await response.json();
        setEmails(data.emails || []);
        setTotalEmails(data.total || 0);
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setIsLoading(false); }
  }, [activeAccount]);

  useEffect(() => { fetchEmails(currentPage); }, [activeAccount, currentPage, fetchEmails]);

  const handleEditClick = async (emailItem: BenchmarkEmailListItem) => {
    if (!activeAccount) return;
    setIsEditModalOpen(true);
    setIsEditing(true);
    setSelectedEmail(emailItem);
    setEditedSubject(emailItem.subject || "");
    setEditedHtmlBody(""); 

    try {
        const response = await fetch(`/api/benchmark/emails/${emailItem.id}`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ apiKey: activeAccount.apiKey })
        });
        if (!response.ok) throw new Error("Failed to fetch details");
        
        const data: BenchmarkEmailDetails = await response.json();
        
        // Use TemplateContent as per API docs
        setEditedHtmlBody(data.TemplateContent || ""); 
        setSelectedEmail(data);
    } catch (error: any) {
         toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setIsEditing(false); }
  };

  const handleSaveChanges = async () => {
    if (!activeAccount || !selectedEmail) return;
    setIsEditing(true);

    const updateDataPayload = {
        Subject: editedSubject,
        TemplateContent: editedHtmlBody // Correct API field
    };

    try {
        const response = await fetch(`/api/benchmark/emails/${selectedEmail.id}`, {
             method: 'PATCH',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 apiKey: activeAccount.apiKey,
                 updateData: updateDataPayload
             })
        });
        if (!response.ok) throw new Error("Failed to save changes");
        
        toast({ title: "Success", description: "Email updated successfully." });
        setIsEditModalOpen(false);
        fetchEmails(currentPage);
    } catch (error: any) {
         toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally { setIsEditing(false); }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'draft' || s === 'unsent') return <Badge variant="secondary">{status}</Badge>;
    if (s === 'sent' || s === 'active') return <Badge className="bg-green-600">{status}</Badge>;
    return <Badge variant="outline">{status || 'Unknown'}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Email Management</h1>
          <p className="text-muted-foreground">View and edit your Benchmark Email campaigns.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Emails</CardTitle><CardDescription>Manage your campaigns.</CardDescription></CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Modified</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="text-center h-24"><Skeleton className="h-6 w-6 rounded-full mx-auto animate-spin" /></TableCell></TableRow>
                        ) : emails.map(email => (
                            <TableRow key={email.id}>
                                <TableCell className="font-medium">{email.name}</TableCell>
                                <TableCell>{email.subject}</TableCell>
                                <TableCell>{getStatusBadge(email.status)}</TableCell>
                                <TableCell>{email.modifiedDate}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(email)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && emails.length === 0 && <TableRow><TableCell colSpan={5} className="text-center h-24">No emails found.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
            {totalPages > 1 && (
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages}>Next</Button>
                </div>
            )}
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Edit Email: {selectedEmail?.name}</DialogTitle>
                <DialogDescription>Modify subject and content.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 p-1">
                {isDragAndDrop && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Read Only Mode</AlertTitle>
                        <AlertDescription>
                            This is a <b>Drag & Drop</b> email. API editing is restricted on the Free Plan. 
                            You can view the content, but changes to the body will likely be ignored by Benchmark.
                        </AlertDescription>
                    </Alert>
                )}

                <div>
                    <Label>Subject</Label>
                    <Input value={editedSubject} onChange={(e) => setEditedSubject(e.target.value)} />
                </div>

                <div className="flex-1 flex flex-col h-[500px]">
                    <Tabs defaultValue="write" className="flex-1 flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <Label>Body Content</Label>
                            <TabsList>
                                <TabsTrigger value="write" className="flex gap-2"><Pencil className="w-3 h-3"/> Write</TabsTrigger>
                                <TabsTrigger value="preview" className="flex gap-2"><Eye className="w-3 h-3"/> Preview</TabsTrigger>
                            </TabsList>
                        </div>
                        <TabsContent value="write" className="flex-1 mt-0">
                            <RichTextEditor 
                                initialContent={editedHtmlBody} 
                                onChange={setEditedHtmlBody} 
                                disabled={isDragAndDrop || isEditing}
                            />
                        </TabsContent>
                        <TabsContent value="preview" className="flex-1 mt-0 border rounded-md overflow-hidden bg-white">
                            <iframe title="preview" srcDoc={editedHtmlBody} className="w-full h-full border-0" sandbox="allow-same-origin" />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleSaveChanges} disabled={isEditing || isDragAndDrop}>
                    {isEditing ? <Skeleton className="h-4 w-4 rounded-full animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}