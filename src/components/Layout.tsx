import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

// CHANGE: Added 'default' keyword here
export default function Layout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 bg-background">
            <div className="p-4 border-b flex items-center gap-4">
                 <SidebarTrigger />
                 <h1 className="text-sm font-medium text-muted-foreground">Fusion Manager</h1>
            </div>
            <div className="flex-1 overflow-auto">
                <Outlet />
            </div>
        </main>
      </div>
      <Toaster />
      <Sonner />
    </SidebarProvider>
  );
}