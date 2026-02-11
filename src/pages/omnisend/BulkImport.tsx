import React, { useState, useRef } from "react";
import { useAccount } from "@/contexts/AccountContext";
import { useJobs } from "@/contexts/JobContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, Play, AlertCircle, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const OmnisendBulkImport = () => {
  const { activeAccount } = useAccount();
  const { startJob } = useJobs();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [delay, setDelay] = useState<number>(1);
  const [isReading, setIsReading] = useState(false);

  // File Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setIsReading(true);

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setPreview(text);
        setIsReading(false);
        toast({ title: "File loaded", description: `Loaded ${selectedFile.name}` });
      };
      reader.onerror = () => {
        toast({ title: "Error", description: "Failed to read file", variant: "destructive" });
        setIsReading(false);
      };
      reader.readAsText(selectedFile);
    }
  };

  // Start Job Handler
  const handleStartImport = () => {
    if (!activeAccount) return;
    if (!preview) {
      toast({ title: "No data", description: "Please upload a CSV file first.", variant: "destructive" });
      return;
    }

    // Omnisend doesn't strictly use List IDs for creation, so we pass a generic ID.
    // The name of the list helps you identify the job in the dashboard.
    const jobListId = "omnisend-import-generic"; 
    const jobListName = `Omnisend Import - ${file?.name || 'Raw Data'}`;

    // Calls the Unified Job Engine in Fusion Manager
    startJob(activeAccount.id, jobListId, jobListName, preview, delay);
    
    toast({ 
      title: "Job Started", 
      description: `Importing contacts to ${activeAccount.name}...` 
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Omnisend Bulk Import</h1>
        <p className="text-muted-foreground">
          Upload a CSV file to import contacts directly into your Omnisend store.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* LEFT COLUMN: Configuration */}
        <div className="space-y-6">
          
          {/* File Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle>1. Select Source File</CardTitle>
              <CardDescription>Supported format: CSV (email, firstName, lastName)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="csv-file">Contacts File</Label>
                <div className="flex gap-2">
                    <Input 
                        id="csv-file" 
                        type="file" 
                        accept=".csv,.txt" 
                        onChange={handleFileChange} 
                        className="cursor-pointer"
                    />
                </div>
              </div>

              {file && (
                <Alert className="bg-blue-50 text-blue-900 border-blue-200">
                  <FileText className="h-4 w-4" />
                  <AlertTitle>File Selected</AlertTitle>
                  <AlertDescription>
                    {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle>2. Configure Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>Import Delay (seconds)</Label>
                  <span className="text-sm font-medium text-muted-foreground">{delay}s</span>
                </div>
                <Slider
                  value={[delay]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(vals) => setDelay(vals[0])}
                />
                <p className="text-xs text-muted-foreground">
                   Higher delay helps avoid Omnisend API rate limits (recommended: 1-2s).
                </p>
              </div>

              <Button 
                onClick={handleStartImport} 
                disabled={!file || isReading} 
                className="w-full"
                size="lg"
              >
                <Play className="mr-2 h-4 w-4" />
                Start Import Process
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Preview */}
        <div className="space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Data Preview</CardTitle>
              <CardDescription>
                 Review the raw data before starting. Ensure "Email" is the first column.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              {preview ? (
                <Textarea 
                  value={preview} 
                  readOnly 
                  className="h-full font-mono text-xs resize-none bg-muted/50" 
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                  <Upload className="h-10 w-10 mb-2 opacity-20" />
                  <p>No file content loaded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OmnisendBulkImport;