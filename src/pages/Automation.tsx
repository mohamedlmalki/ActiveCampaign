import { useAccount } from "@/contexts/AccountContext";

// --- USE THESE ABSOLUTE PATHS ---
import ACAutomations from "@/pages/activecampaign/Automations";
import BMAutomations from "@/pages/benchmark/Automations"; 

const Automations = () => {
  const { activeAccount } = useAccount();

  if (!activeAccount) {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
            <p>Please select an account from the sidebar.</p>
        </div>
    );
  }

  // 1. ActiveCampaign
  if (activeAccount.provider === 'activecampaign') {
    return <ACAutomations />;
  } 
  
  // 2. Benchmark
  if (activeAccount.provider === 'benchmark') {
     return <BMAutomations />;
  }

  return <div>Unknown account provider</div>;
};

export default Automations;