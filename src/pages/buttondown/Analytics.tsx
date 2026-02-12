import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { BarChart2, CheckCircle2, XCircle, MousePointerClick, MailOpen, AlertTriangle, MessageSquareMore } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "@/contexts/AccountContext";

export default function EmailAnalytics() {
  const { activeAccount } = useAccount(); // <--- Connected to Context
  const [selectedEmailId, setSelectedEmailId] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<string>('');

  // 1. Fetch Emails
  const { data: emails = [], isLoading: loadingEmails, error: emailsError } = useQuery({
    queryKey: ['/api/emails', activeAccount?.id],
    queryFn: () => api.getEmails(activeAccount),
    enabled: !!activeAccount,
  });

  // 2. Fetch Analytics
  const { data: analyticsData, isLoading: loadingAnalytics, error: analyticsError } = useQuery({
    queryKey: ['/api/analytics/email', selectedEmailId, activeAccount?.id],
    queryFn: () => api.getEmailAnalytics(selectedEmailId, activeAccount),
    enabled: !!selectedEmailId && !!activeAccount,
  });

  // 3. Fetch Events
  const { data: eventsData, isLoading: loadingEvents, error: eventsError } = useQuery({
    queryKey: ['/api/analytics/events', selectedEmailId, selectedEventType, activeAccount?.id],
    queryFn: () => api.getEmailEvents(selectedEmailId, selectedEventType, activeAccount),
    enabled: !!selectedEmailId && !!selectedEventType && !!activeAccount,
  });

  const eventTypes = [
    { value: 'sent', label: 'Sent', icon: MailOpen },
    { value: 'delivered', label: 'Delivered', icon: CheckCircle2 },
    { value: 'opened', label: 'Opened', icon: MailOpen },
    { value: 'clicked', label: 'Clicked', icon: MousePointerClick },
    { value: 'bounced', label: 'Bounced', icon: XCircle },
    { value: 'unsubscribed', label: 'Unsubscribed', icon: AlertTriangle },
  ];

  const getMetricDisplay = (label: string, value: number | undefined, tooltipText: string, textColorClass?: string) => (
    <div className="flex flex-col items-center p-3 border rounded-lg bg-muted/20">
      <h4 className="text-sm font-semibold text-muted-foreground mb-1">{label}</h4>
      <p className={cn("text-xl font-bold", textColorClass)}>{value !== undefined ? value : '-'}</p>
      <span className="text-xs text-muted-foreground">{tooltipText}</span>
    </div>
  );

  return (
    <div className="p-6">
      <Card className="max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-2">
            <BarChart2 className="w-7 h-7" /> Email Analytics
          </CardTitle>
          <CardDescription>View performance metrics for your newsletters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* SELECTION ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Select Email</h3>
              <Select value={selectedEmailId} onValueChange={setSelectedEmailId} disabled={loadingEmails}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingEmails ? "Loading..." : "Select an email"} />
                </SelectTrigger>
                <SelectContent>
                  {emails.map((email: any) => (
                    <SelectItem key={email.id} value={email.id}>
                      {email.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEmailId && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Event Filter</h3>
                <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2"><t.icon className="w-4 h-4" /> {t.label}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* ANALYTICS GRID */}
          {selectedEmailId && (
            <div className="space-y-6 mt-6">
              <Separator />
              <h3 className="text-xl font-bold">Performance</h3>
              {loadingAnalytics ? <div className="text-center py-4">Loading stats...</div> : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {getMetricDisplay("Opens", analyticsData?.opens, "Total opens", "text-blue-600")}
                  {getMetricDisplay("Clicks", analyticsData?.clicks, "Total clicks", "text-purple-600")}
                  {getMetricDisplay("Unsubs", analyticsData?.unsubscriptions, "Unsubscribes", "text-red-600")}
                  {getMetricDisplay("Errors", analyticsData?.permanent_failures, "Failures", "text-destructive")}
                </div>
              )}

              {/* EVENTS LOG */}
              {selectedEventType && (
                <>
                  <Separator />
                  <h3 className="text-xl font-bold">Event Log: {selectedEventType}</h3>
                  <ScrollArea className="h-[300px] border rounded-lg p-4 bg-muted/10">
                    <div className="space-y-3">
                      {eventsData?.map((event: any, i: number) => (
                        <div key={i} className="p-3 border rounded-md bg-background/50 text-sm">
                          <p className="font-semibold">{event.subscriber_email || "Unknown Subscriber"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(event.creation_date).toLocaleString()}</p>
                        </div>
                      ))}
                      {(!eventsData || eventsData.length === 0) && !loadingEvents && (
                        <div className="text-center text-muted-foreground py-4">No events found.</div>
                      )}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}