import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { CampaignStatusSelect } from "@/components/CampaignStatusSelect"; // <--- Import the dropdown

export default function Layout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 bg-background">
            {/* GLOBAL HEADER */}
            <div className="p-4 border-b flex items-center justify-between gap-4 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                 <div className="flex items-center gap-4">
                     <SidebarTrigger />
                     <h1 className="text-sm font-medium text-muted-foreground hidden md:block">Fusion Manager</h1>
                 </div>
                 
                 {/* GLOBAL JOB STATUS DROPDOWN */}
                 <div className="flex items-center gap-2">
                    <CampaignStatusSelect />
                 </div>
            </div>

            <div className="flex-1 overflow-auto p-4"> {/* Added padding here for content */}
                <Outlet />
            </div>
        </main>
      </div>
      <Toaster />
      <Sonner />
    </SidebarProvider>
  );
}