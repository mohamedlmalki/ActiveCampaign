import * as React from "react"
import { useNavigate } from "react-router-dom"
import { 
  Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarGroup, SidebarGroupContent, SidebarRail, SidebarFooter
} from "@/components/ui/sidebar"
import { 
  Plus, Settings2, ChevronsUpDown, Check, 
  Activity, BarChart3, Send, Newspaper, Command, MessageSquare 
} from "lucide-react"
import { useAccount, Account } from "@/contexts/AccountContext"
import { Button } from "@/components/ui/button"
import { AddAccountDialog } from "./AddAccountDialog" 
import { EditAccountDialog } from "./EditAccountDialog"
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { toast } from "@/hooks/use-toast"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { accounts, activeAccount, setActiveAccount, addAccount, updateAccount, deleteAccount } = useAccount()
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [editingAccount, setEditingAccount] = React.useState<Account | null>(null)
  
  const navigate = useNavigate()

  const services = [
      { id: 'activecampaign', name: 'ActiveCampaign', icon: Activity },
      { id: 'benchmark', name: 'Benchmark Email', icon: BarChart3 },
      { id: 'buttondown', name: 'Buttondown', icon: Newspaper },
      { id: 'omnisend', name: 'Omnisend', icon: Send },
      { id: 'brevo', name: 'Brevo', icon: MessageSquare },
  ];

  const handleServiceClick = (provider: string) => {
      const targetAccount = accounts.find(a => a.provider === provider);

      if (targetAccount) {
          setActiveAccount(targetAccount);
          if (provider === 'brevo') {
              navigate('/brevo/import');
          } else {
              navigate('/');
          }
      } else {
          toast({ title: "No Account", description: `Please add a ${provider} account first.` });
          setIsAddOpen(true);
      }
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2 font-bold text-lg text-sidebar-foreground">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-primary text-primary-foreground">
            <Command className="w-4 h-4" />
          </div>
          <span className="truncate">Fusion Manager</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
            <SidebarGroupContent>
                <SidebarMenu>
                    {services.map(service => {
                        const isActive = activeAccount?.provider === service.id;
                        const hasAccount = accounts.some(a => a.provider === service.id);
                        return (
                            <SidebarMenuItem key={service.id}>
                                <SidebarMenuButton 
                                    isActive={isActive}
                                    onClick={() => handleServiceClick(service.id)}
                                    className={!hasAccount && !isActive ? "opacity-60" : ""}
                                >
                                    <service.icon />
                                    <span>{service.name}</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <AccountSwitcher 
            accounts={accounts} activeAccount={activeAccount} setActiveAccount={setActiveAccount}
            onAdd={() => setIsAddOpen(true)} onEdit={setEditingAccount}
        />
      </SidebarFooter>
      <SidebarRail />
      
      <AddAccountDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
      
      {/* Ensure EditDialog renders only when editingAccount is set */}
      {editingAccount && (
        <EditAccountDialog 
            open={!!editingAccount} 
            onOpenChange={(open: boolean) => !open && setEditingAccount(null)}
            account={editingAccount} 
            onUpdate={updateAccount} 
            onDelete={deleteAccount}
        />
      )}
    </Sidebar>
  )
}

function AccountSwitcher({ accounts, activeAccount, setActiveAccount, onAdd, onEdit }: any) {
    const getIcon = (provider?: string) => {
        if (provider === 'benchmark') return <BarChart3 className="size-4" />;
        if (provider === 'omnisend') return <Send className="size-4" />;
        if (provider === 'buttondown') return <Newspaper className="size-4" />;
        if (provider === 'brevo') return <MessageSquare className="size-4" />;
        return <Activity className="size-4" />;
    }

    const displayedAccounts = React.useMemo(() => {
        if (!activeAccount) return [];
        return accounts.filter((acc: Account) => acc.provider === activeAccount.provider);
    }, [accounts, activeAccount]);

    if (!activeAccount) return (
        <div className="p-2"><Button variant="outline" className="w-full justify-start" onClick={onAdd}><Plus className="mr-2 h-4 w-4"/> Add Account</Button></div>
    );

    return (
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent border-t rounded-none pt-4 pb-4 h-auto">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">{getIcon(activeAccount.provider)}</div>
                  <div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-semibold">{activeAccount.name}</span><span className="truncate text-xs text-muted-foreground capitalize">{activeAccount.provider}</span></div>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-56 rounded-lg" align="start" side="bottom" sideOffset={4}>
                 <DropdownMenuLabel className="text-xs font-bold text-muted-foreground">Switch {activeAccount.provider} Account</DropdownMenuLabel>
                 <div className="max-h-[300px] overflow-y-auto">
                    {displayedAccounts.map((acc: Account) => (
                         <DropdownMenuItem key={acc.id} onClick={() => setActiveAccount(acc)} className="flex items-center justify-between gap-2 cursor-pointer">
                            <div className="flex items-center gap-2 overflow-hidden">{getIcon(acc.provider)}<span className="truncate">{acc.name}</span></div>
                            {activeAccount.id === acc.id && <Check className="h-4 w-4 opacity-50" />}
                            <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={(e) => { e.stopPropagation(); onEdit(acc); }}><Settings2 className="h-3 w-3" /></Button>
                         </DropdownMenuItem>
                    ))}
                 </div>
                 <DropdownMenuSeparator />
                 <DropdownMenuItem onClick={onAdd} className="gap-2 p-2 cursor-pointer text-blue-600 focus:text-blue-600"><Plus className="size-4" /><div className="font-medium">Add New Account</div></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
    )
}