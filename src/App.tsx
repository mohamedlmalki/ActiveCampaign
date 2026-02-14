import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AccountProvider } from "./contexts/AccountContext";
import { JobProvider } from "./contexts/JobContext";
import Layout from "./components/Layout";

// --- Existing Root Wrappers ---
import BulkImport from "./pages/BulkImport";
import UserManagement from "./pages/UserManagement";
import Automation from "./pages/Automation";
import Emails from "./pages/Emails";
import SendEmail from "./pages/SendEmail"; 
import Analytics from "./pages/buttondown/Analytics";
import NotFound from "./pages/NotFound";

// --- New Brevo Pages ---
import BrevoBulkImport from './pages/brevo/BulkImport';
import BrevoTransactional from './pages/brevo/BulkTransactionalSend';
import BrevoUserManagement from './pages/brevo/UserManagement';
import BrevoTemplates from './pages/brevo/EmailTemplates';
import BrevoStats from './pages/brevo/EmailStatistics';
import BrevoForget from './pages/brevo/ForgetSubscriber';

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
                
                {/* 1. ROOT WRAPPERS (For ActiveCampaign, Benchmark, Omnisend, Buttondown) */}
                <Route index element={<BulkImport />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="automation" element={<Automation />} />
                <Route path="emails" element={<Emails />} />
                <Route path="send" element={<SendEmail />} />
                <Route path="analytics" element={<Analytics />} />

                {/* 2. BREVO ROUTES (Specific) */}
                <Route path="brevo/import" element={<BrevoBulkImport />} />
                <Route path="brevo/transactional" element={<BrevoTransactional />} />
                <Route path="brevo/users" element={<BrevoUserManagement />} />
                <Route path="brevo/templates" element={<BrevoTemplates />} />
                <Route path="brevo/stats" element={<BrevoStats />} />
                <Route path="brevo/forget" element={<BrevoForget />} />

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