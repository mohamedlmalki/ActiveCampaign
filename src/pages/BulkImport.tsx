import { useAccount } from "@/contexts/AccountContext";
import ActiveCampaignImport from "./activecampaign/BulkImport";
import BenchmarkImport from "./benchmark/BulkImport";
import OmnisendImport from "./omnisend/BulkImport";
import ButtondownImport from "./buttondown/BulkImport"; // <--- NEW IMPORT

export default function BulkImport() {
  const { activeAccount } = useAccount();

  if (!activeAccount) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Please select an account from the sidebar.
      </div>
    );
  }

  switch (activeAccount.provider) {
    case 'activecampaign':
      return <ActiveCampaignImport />;
    case 'benchmark':
      return <BenchmarkImport />;
    case 'omnisend':
      return <OmnisendImport />;
    case 'buttondown':
      return <ButtondownImport />; // <--- NEW CASE
    default:
      return <div>Unknown provider: {activeAccount.provider}</div>;
  }
}