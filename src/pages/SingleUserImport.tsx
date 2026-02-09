import { useEffect } from "react";
import { useAccount } from "@/contexts/AccountContext";
import ACSingleImport from "./activecampaign/SingleUserImport";
import BMSingleImport from "./benchmark/SingleUserImport"; // <--- IMPORT

const SingleUserImport = () => {
  const { activeAccount } = useAccount();

  if (!activeAccount) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
        <p>Please select an account from the sidebar to get started.</p>
      </div>
    );
  }

  // 1. ActiveCampaign
  if (activeAccount.provider === 'activecampaign') {
    return <ACSingleImport />;
  } 
  
  // 2. Benchmark (NEW)
  if (activeAccount.provider === 'benchmark') {
     return <BMSingleImport />;
  }

  return <div>Unknown account provider: {activeAccount.provider}</div>;
};

export default SingleUserImport;