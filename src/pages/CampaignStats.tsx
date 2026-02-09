import { useAccount } from "@/contexts/AccountContext";
import ACCampaignStats from "./activecampaign/CampaignStats";

const CampaignStats = () => {
  const { activeAccount } = useAccount();

  if (!activeAccount) return <div>Please select an account.</div>;

  // This feature is ONLY for ActiveCampaign
  if (activeAccount.provider === 'activecampaign') {
    return <ACCampaignStats />;
  } 
  
  if (activeAccount.provider === 'benchmark') {
     return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
            <p>Campaign Stats are not available for Benchmark Email.</p>
            <p>Please use the "Emails" tab instead.</p>
        </div>
     );
  }

  return <div>Unknown account provider</div>;
};

export default CampaignStats;