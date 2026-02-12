import * as React from "react"
import { useNavigate } from "react-router-dom" // <--- 1. IMPORT NAVIGATE
import { 
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarRail,
  SidebarFooter
} from "@/components/ui/sidebar"
import { 
  Plus, 
  Settings2, 
  ChevronsUpDown, 
  Check, 
  LogOut, 
  Save, 
  Activity, 
  BarChart3, 
  Send, 
  Newspaper,
  Command 
} from "lucide-react"
import { useAccount, Account } from "@/contexts/AccountContext"
import { Button } from "@/components/ui/button"
import { AddAccountDialog } from "./AddAccountDialog" 
import { EditAccountDialog } from "./EditAccountDialog"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { accounts, activeAccount, setActiveAccount, addAccount, updateAccount, deleteAccount } = useAccount()
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [editingAccount, setEditingAccount] = React.useState<Account | null>(null)
  
  const navigate = useNavigate() // <--- 2. INITIALIZE HOOK

  // --- SERVICE LIST ---
  const services = [
      { id: 'activecampaign', name: 'ActiveCampaign', icon: Activity },
      { id: 'benchmark', name: 'Benchmark Email', icon: BarChart3 },
      { id: 'buttondown', name: 'Buttondown', icon: Newspaper },
      { id: 'omnisend', name: 'Omnisend', icon: Send },
  ];

  // --- SWITCH LOGIC ---
  const handleServiceClick = (provider: string) => {
      // Find the first account for this provider
      const targetAccount = accounts.find(a => a.provider === provider);

      if (targetAccount) {
          setActiveAccount(targetAccount);
          navigate('/'); // <--- 3. AUTO-NAVIGATE TO FIRST PAGE
      } else {
          toast({ 
              title: "No Account Found", 
              description: `Please add a ${provider} account first.`, 
              variant: "default" 
          });
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
                                    tooltip={service.name}
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
            accounts={accounts} 
            activeAccount={activeAccount} 
            setActiveAccount={setActiveAccount}
            onAdd={() => setIsAddOpen(true)}
            onEdit={setEditingAccount}
        />
      </SidebarFooter>
      
      <SidebarRail />

      <AddAccountDialog open={isAddOpen} onOpenChange={setIsAddOpen} onAdd={addAccount} />
      
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

// --- ACCOUNT SWITCHER ---
function AccountSwitcher({ accounts, activeAccount, setActiveAccount, onAdd, onEdit }: any) {
    const getIcon = (provider?: string) => {
        if (provider === 'benchmark') return <BarChart3 className="size-4" />;
        if (provider === 'omnisend') return <Send className="size-4" />;
        if (provider === 'buttondown') return <Newspaper className="size-4" />;
        return <Activity className="size-4" />;
    }

    const displayedAccounts = React.useMemo(() => {
        if (!activeAccount) return [];
        return accounts.filter((acc: Account) => acc.provider === activeAccount.provider);
    }, [accounts, activeAccount]);

    if (!activeAccount) return (
        <div className="p-2">
            <Button variant="outline" className="w-full justify-start" onClick={onAdd}>
                <Plus className="mr-2 h-4 w-4"/> Add Account
            </Button>
        </div>
    );

    return (
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground border-t rounded-none pt-4 pb-4 h-auto"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    {getIcon(activeAccount.provider)}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {activeAccount.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground capitalize">
                       {activeAccount.provider}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                 <DropdownMenuLabel className="text-xs font-bold text-muted-foreground">
                    Switch {activeAccount.provider} Account
                 </DropdownMenuLabel>
                 
                 <div className="max-h-[300px] overflow-y-auto">
                    {displayedAccounts.map((acc: Account) => (
                         <DropdownMenuItem 
                            key={acc.id} 
                            onClick={() => setActiveAccount(acc)}
                            className="flex items-center justify-between gap-2 cursor-pointer"
                         >
                            <div className="flex items-center gap-2 overflow-hidden">
                                 {getIcon(acc.provider)}
                                 <span className="truncate">{acc.name}</span>
                            </div>
                            {activeAccount.id === acc.id && <Check className="h-4 w-4 opacity-50" />}
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 ml-auto"
                                onClick={(e) => { e.stopPropagation(); onEdit(acc); }}
                            >
                                <Settings2 className="h-3 w-3" />
                            </Button>
                         </DropdownMenuItem>
                    ))}
                 </div>
                 
                 <DropdownMenuSeparator />
                 <DropdownMenuItem onClick={onAdd} className="gap-2 p-2 cursor-pointer text-blue-600 focus:text-blue-600">
                    <Plus className="size-4" />
                    <div className="font-medium">Add New Account</div>
                 </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
    )
}

// --- DIALOGS ---

function AddAccountDialog({ open, onOpenChange, onAdd }: any) {
    const [provider, setProvider] = React.useState('activecampaign')
    const [name, setName] = React.useState('')
    const [apiKey, setApiKey] = React.useState('')
    const [apiUrl, setApiUrl] = React.useState('')
    const [loading, setLoading] = React.useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        await onAdd({ name, provider, apiKey, apiUrl })
        setLoading(false)
        onOpenChange(false)
        setName(''); setApiKey(''); setApiUrl('');
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Account</DialogTitle>
                    <DialogDescription>Connect a new marketing platform account.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select value={provider} onValueChange={setProvider}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="activecampaign">ActiveCampaign</SelectItem>
                                <SelectItem value="benchmark">Benchmark Email</SelectItem>
                                <SelectItem value="omnisend">Omnisend</SelectItem>
                                <SelectItem value="buttondown">Buttondown</SelectItem> 
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Account Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Newsletter" required />
                    </div>
                    <div className="space-y-2">
                        <Label>API Key / Token</Label>
                        <Input value={apiKey} onChange={e => setApiKey(e.target.value)} type="text" placeholder="Paste key here..." required />
                    </div>
                    {provider === 'activecampaign' && (
                        <div className="space-y-2">
                            <Label>API URL</Label>
                            <Input value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder="https://..." required />
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Connect Account'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function EditAccountDialog({ open, onOpenChange, account, onUpdate, onDelete }: any) {
    const [name, setName] = React.useState(account.name)
    const [apiKey, setApiKey] = React.useState(account.apiKey)
    const [apiUrl, setApiUrl] = React.useState(account.apiUrl || '')
    const [loading, setLoading] = React.useState(false)

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        await onUpdate(account.id, { 
            name, 
            apiKey, 
            apiUrl, 
            provider: account.provider 
        })
        setLoading(false)
        onOpenChange(false)
    }

    const handleDelete = async () => {
        if(confirm("Are you sure you want to delete this account? This cannot be undone.")) {
            setLoading(true)
            await onDelete(account.id)
            setLoading(false)
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Account</DialogTitle>
                    <DialogDescription>Update credentials for {account.name}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Account Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label>API Key / Token</Label>
                        <Input value={apiKey} onChange={e => setApiKey(e.target.value)} type="text" required />
                    </div>
                    {account.provider === 'activecampaign' && (
                        <div className="space-y-2">
                            <Label>API URL</Label>
                            <Input value={apiUrl} onChange={e => setApiUrl(e.target.value)} required />
                        </div>
                    )}
                    
                    <DialogFooter className="flex justify-between sm:justify-between">
                         <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                            <LogOut className="w-4 h-4 mr-2" /> Delete
                         </Button>
                         <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading}>
                                <Save className="w-4 h-4 mr-2" /> Save
                            </Button>
                         </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}