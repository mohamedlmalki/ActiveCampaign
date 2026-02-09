import { useEffect } from "react";
import { useAccount } from "@/contexts/AccountContext";
import ACBulkImport from "./activecampaign/BulkImport";
import BMBulkImport from "./benchmark/BulkImport"; // <--- IMPORT ENABLED

const BulkImport = () => {
  const { activeAccount } = useAccount();

  // Debug Log to see what is happening
  useEffect(() => {
    console.log("Current Active Account:", activeAccount);
  }, [activeAccount]);

  // If no account is selected, show a message
  if (!activeAccount) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
        <p>Please select an account from the sidebar to get started.</p>
      </div>
    );
  }

  // --- TRAFFIC COP LOGIC ---
  
  // 1. If ActiveCampaign, show the AC Page
  if (activeAccount.provider === 'activecampaign') {
    return <ACBulkImport />;
  } 
  
  // 2. If Benchmark, show the Benchmark Page
  if (activeAccount.provider === 'benchmark') {
     console.log("Rendering Benchmark Import Page...");
     return <BMBulkImport />; // <--- COMPONENT ENABLED
  }

  return <div>Unknown account provider: {activeAccount.provider}</div>;
};

export default BulkImport;