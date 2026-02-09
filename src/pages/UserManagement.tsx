import { useAccount } from "@/contexts/AccountContext";
import ACUserManagement from "./activecampaign/UserManagement";
import BMUserManagement from "./benchmark/UserManagement"; // <--- IMPORT

const UserManagement = () => {
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
    return <ACUserManagement />;
  } 
  
  // 2. Benchmark (NEW)
  if (activeAccount.provider === 'benchmark') {
     return <BMUserManagement />;
  }

  return <div>Unknown account provider</div>;
};

export default UserManagement;