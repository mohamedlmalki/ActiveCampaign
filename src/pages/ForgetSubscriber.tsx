import { useAccount } from "@/contexts/AccountContext";
import ACForgetSubscriber from "./activecampaign/ForgetSubscriber";

const ForgetSubscriber = () => {
  const { activeAccount } = useAccount();

  if (!activeAccount) return <div>Please select an account.</div>;

  if (activeAccount.provider === 'activecampaign') {
    return <ACForgetSubscriber />;
  } 
  
  if (activeAccount.provider === 'benchmark') {
     return <div className="p-10">This feature is not yet implemented for Benchmark Email.</div>;
  }

  return <div>Unknown account provider</div>;
};

export default ForgetSubscriber;