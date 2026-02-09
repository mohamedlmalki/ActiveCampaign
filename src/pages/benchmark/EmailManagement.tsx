import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccount } from "@/contexts/AccountContext";
import { Mail, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: string; // e.g., "Sent", "Draft"
  modifiedDate: string;
}

const EmailManagement = () => {
  const { activeAccount } = useAccount();

  const { data: emails, isLoading } = useQuery({
    queryKey: ["benchmark-emails", activeAccount?.id],
    queryFn: async () => {
      if (!activeAccount) return [];
      // Calls the Benchmark-specific route we added in Step 2
      const res = await fetch("/api/benchmark/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: activeAccount.apiKey }),
      });
      if (!res.ok) throw new Error("Failed to fetch emails");
      const data = await res.json();
      return data.emails as EmailCampaign[];
    },
    enabled: !!activeAccount && activeAccount.provider === 'benchmark',
  });

  if (isLoading) {
    return <div className="p-8 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Email Campaigns</h2>
        <p className="text-muted-foreground">Manage your Benchmark Email campaigns.</p>
      </div>

      <div className="grid gap-4">
        {emails?.map((email) => (
          <Card key={email.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{email.name}</CardTitle>
                    <CardDescription>{email.subject}</CardDescription>
                  </div>
                  <Badge variant={email.status === 'Sent' ? "secondary" : "outline"}>
                    {email.status}
                  </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    {email.modifiedDate ? format(new Date(email.modifiedDate), 'PPP') : 'N/A'}
                </div>
                <div className="flex items-center">
                    <Mail className="mr-2 h-4 w-4" />
                    ID: {email.id}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EmailManagement;