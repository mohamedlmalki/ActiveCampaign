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
import UserManagement from "./pages/UserManagement";
import Automation from "./pages/Automation";
import Emails from "./pages/Emails";       // <--- NEW IMPORT
import SendEmail from "./pages/SendEmail"; // <--- NEW IMPORT
import NotFound from "./pages/NotFound";


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
                <Route path="users" element={<UserManagement />} />
                <Route path="automation" element={<Automation />} />
                <Route path="emails" element={<Emails />} />       {/* <--- NEW ROUTE */}
                <Route path="send" element={<SendEmail />} />     {/* <--- NEW ROUTE */}

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