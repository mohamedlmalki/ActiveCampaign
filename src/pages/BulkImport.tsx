import { useEffect } from "react";
import { useAccount } from "@/contexts/AccountContext";
import ACBulkImport from "./activecampaign/BulkImport";
import BMBulkImport from "./benchmark/BulkImport";
import OmnisendBulkImport from "./omnisend/BulkImport"; // <--- NEW IMPORT

const BulkImport = () => {
  const { activeAccount } = useAccount();

  useEffect(() => {
    console.log("Current Active Account:", activeAccount);
  }, [activeAccount]);

  if (!activeAccount) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
        <p>Please select an account from the sidebar to get started.</p>
      </div>
    );
  }

  // --- TRAFFIC COP LOGIC ---
  
  if (activeAccount.provider === 'activecampaign') {
    return <ACBulkImport />;
  } 
  
  if (activeAccount.provider === 'benchmark') {
     return <BMBulkImport />;
  }
  
  if (activeAccount.provider === 'omnisend') {
     return <OmnisendBulkImport />; // <--- NEW RENDER
  }

  return <div>Unknown account provider: {activeAccount.provider}</div>;
};

export default BulkImport;