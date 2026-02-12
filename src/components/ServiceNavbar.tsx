import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAccount } from "@/contexts/AccountContext";
import { CampaignStatusSelect } from "./CampaignStatusSelect";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button"; 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; 
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Loader2, HelpCircle } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";

export function ServiceNavbar() {
  const { activeAccount, checkAccountStatus } = useAccount(); 
  const location = useLocation();
  const { toast } = useToast();
  
  // Local state for the spinner while manual checking
  const [isChecking, setIsChecking] = useState(false);

  // --- MANUAL STATUS CHECK HANDLER ---
  const handleStatusCheck = async () => {
    if (!activeAccount) return;
    
    setIsChecking(true);
    try {
        const result = await checkAccountStatus(activeAccount);
        
        if (result.status === 'connected') {
            toast({ 
                title: "Connection Successful", 
                description: `Successfully connected to ${activeAccount.name}`,
                className: "bg-green-50 border-green-200 text-green-900" 
            });
        } else {
            // Extract error message safely
            const errorMsg = result.lastCheckResponse?.error || 
                             result.lastCheckResponse?.message || 
                             "Unknown API Error";
                             
            toast({ 
                title: "Connection Failed", 
                description: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg),
                variant: "destructive" 
            });
        }
    } catch (error) {
        toast({ title: "Error", description: "Network request failed", variant: "destructive" });
    } finally {
        setIsChecking(false);
    }
  };

  if (!activeAccount) {
    return (
        <div className="flex items-center h-14 px-4 border-b bg-background sticky top-0 z-20">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <div className="flex-1 text-sm text-muted-foreground">Select an account from the sidebar...</div>
            <CampaignStatusSelect />
        </div>
    );
  }

  // --- DETERMINE ICON & COLOR ---
  let StatusIcon = HelpCircle;
  let statusColor = "text-muted-foreground";
  let statusText = "Unknown Status";

  if (isChecking) {
      StatusIcon = Loader2;
      statusColor = "text-blue-500 animate-spin";
      statusText = "Checking connection...";
  } else if (activeAccount.status === 'connected') {
      StatusIcon = CheckCircle;
      statusColor = "text-green-500";
      statusText = "Connected";
  } else if (activeAccount.status === 'failed') {
      StatusIcon = XCircle;
      statusColor = "text-red-500";
      statusText = "Connection Failed (Click to retry)";
  }

  // --- DEFINE MENU ITEMS ---
  let navItems: { title: string; href: string }[] = [];

  switch (activeAccount.provider) {
    case 'activecampaign':
      navItems = [
        { title: "Bulk Import", href: "/" },
        { title: "User Management", href: "/users" },
        { title: "Automations", href: "/automation" },
      ];
      break;
    case 'benchmark':
      navItems = [
        { title: "Bulk Import", href: "/" },
        { title: "User Management", href: "/users" },
        { title: "Automations", href: "/automation" },
        { title: "Emails", href: "/emails" },
      ];
      break;
    case 'buttondown':
      navItems = [
        { title: "Bulk Import", href: "/" },
        { title: "Subscribers", href: "/users" },
        { title: "Emails", href: "/emails" },         // <--- ADDED: Emails List Page
        { title: "Analytics", href: "/analytics" },   // <--- ADDED: Analytics Page
        { title: "Send Email", href: "/send" },
      ];
      break;
    case 'omnisend':
      navItems = [
        { title: "Bulk Import", href: "/" },
      ];
      break;
  }

  return (
    <div className="flex items-center h-14 px-4 border-b bg-background sticky top-0 z-20">
      <SidebarTrigger className="mr-2" />
      <Separator orientation="vertical" className="mx-2 h-6" />
      
      {/* --- ACCOUNT NAME + STATUS ICON --- */}
      <div className="flex items-center mr-6 min-w-fit gap-2">
        <span className="font-semibold text-sm">{activeAccount.name}</span>
        
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 p-0 hover:bg-transparent"
                        onClick={handleStatusCheck}
                        disabled={isChecking}
                    >
                        <StatusIcon className={cn("w-4 h-4", statusColor)} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p>{statusText} - Click to verify</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>

      {/* Navigation Links */}
      <nav className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap",
                isActive 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Progress Dropdown */}
      <div className="ml-auto pl-2 flex items-center gap-2">
        <CampaignStatusSelect />
      </div>
    </div>
  );
}