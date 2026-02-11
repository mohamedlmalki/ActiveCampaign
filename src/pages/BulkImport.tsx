import { useEffect } from "react";
import { useAccount } from "@/contexts/AccountContext";
import ACBulkImport from "./activecampaign/BulkImport";
import BMBulkImport from "./benchmark/BulkImport";
import OmnisendBulkImport from "./omnisend/BulkImport"; 

const BulkImport = () => {
  const { activeAccount } = useAccount();

  useEffect(() => {
    if (activeAccount) {
      console.log(`[BulkImport] Switching to: ${activeAccount.name} (${activeAccount.provider})`);
    }
  }, [activeAccount]);

  if (!activeAccount) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
        <p>Please select an account from the sidebar to get started.</p>
      </div>
    );
  }

  // --- TRAFFIC COP LOGIC ---
  // Normalize the provider to handle case sensitivity or accidental whitespace
  const provider = (activeAccount.provider || "").toLowerCase().trim();

  if (provider === 'activecampaign') {
    return <ACBulkImport />;
  } 
  
  if (provider === 'benchmark') {
     return <BMBulkImport />;
  }
  
  if (provider === 'omnisend') {
     return <OmnisendBulkImport />;
  }

  return (
    <div className="flex flex-col items-center justify-center h-[50vh] text-red-500 gap-2">
      <h3 className="text-lg font-bold">Configuration Error</h3>
      <p>Unknown account provider: <code>"{activeAccount.provider}"</code></p>
      <p className="text-sm text-muted-foreground">Expected: activecampaign, benchmark, or omnisend</p>
    </div>
  );
};

export default BulkImport;