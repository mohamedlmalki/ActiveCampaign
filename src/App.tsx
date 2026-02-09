import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AccountProvider } from "./contexts/AccountContext";
import { JobProvider } from "./contexts/JobContext";
import Layout from "./components/Layout";

// --- Page Imports ---
import BulkImport from "./pages/BulkImport";
import SingleUserImport from "./pages/SingleUserImport";
import UserManagement from "./pages/UserManagement";
import Automation from "./pages/Automation";
import CampaignStats from "./pages/CampaignStats"; // Now uses our new Wrapper
import ForgetSubscriber from "./pages/ForgetSubscriber"; // Now uses our new Wrapper
import NotFound from "./pages/NotFound";

// Benchmark Specific Pages (Direct Import)
import EmailManagement from "./pages/benchmark/EmailManagement"; 

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AccountProvider>
        <JobProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                {/* Shared Routes (Wrappers) */}
                <Route index element={<BulkImport />} />
                <Route path="single-import" element={<SingleUserImport />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="automation" element={<Automation />} />
                
                {/* Provider Specific Routes */}
                <Route path="campaign-stats" element={<CampaignStats />} />
                <Route path="forget" element={<ForgetSubscriber />} />
                
                {/* Benchmark Specific Route */}
                <Route path="emails" element={<EmailManagement />} />

                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </JobProvider>
      </AccountProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;