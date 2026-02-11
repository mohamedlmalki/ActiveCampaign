import * as React from "react"
import { 
  Users, 
  Upload, 
  Settings2, 
  Activity, 
  BarChart3, 
  Mail,
  Workflow,
  Send,
  Plus,
  ChevronsUpDown,
  Check,
  LogOut
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarRail,
} from "@/components/ui/sidebar"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAccount, Account } from "@/contexts/AccountContext"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { accounts, activeAccount, setActiveAccount, addAccount, updateAccount, deleteAccount } = useAccount()
  const location = useLocation()
  
  // State for Dialogs
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [editingAccount, setEditingAccount] = React.useState<Account | null>(null)

  // --- PLATFORM SWITCHING LOGIC ---
  const handlePlatformClick = (provider: 'activecampaign' | 'benchmark' | 'omnisend', targetUrl: string) => {
    // 1. Check if we are already on this provider
    if (activeAccount?.provider === provider) {
      return;
    }

    // 2. Find the first account of this type
    const targetAccount = accounts.find(acc => acc.provider === provider);

    if (targetAccount) {
      // Switch context
      setActiveAccount(targetAccount);
      toast({ title: "Switched Account", description: `Active context: ${targetAccount.name}` });
    } else {
      // No account found
      toast({ title: "No Account Found", description: `Please add an ${provider} account first.`, variant: "destructive" });
      setIsAddOpen(true); 
    }
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2 font-bold text-lg text-sidebar-foreground">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-primary text-primary-foreground">
            FM
          </div>
          <span className="truncate">Fusion Manager</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        
        {/* --- ACTIVECAMPAIGN GROUP --- */}
        <SidebarGroup>
          <SidebarGroupLabel>ActiveCampaign</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarItem 
                title="Bulk Import" 
                url="/" 
                icon={Upload} 
                isActive={location.pathname === "/" && activeAccount?.provider === 'activecampaign'}
                onClick={() => handlePlatformClick('activecampaign', '/')}
              />
              <SidebarItem 
                title="User Management" 
                url="/users" 
                icon={Users} 
                isActive={location.pathname === "/users" && activeAccount?.provider === 'activecampaign'}
                onClick={() => handlePlatformClick('activecampaign', '/users')}
              />
              <SidebarItem 
                title="Automations" 
                url="/automation" 
                icon={Workflow} 
                isActive={location.pathname === "/automation" && activeAccount?.provider === 'activecampaign'}
                onClick={() => handlePlatformClick('activecampaign', '/automation')}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="px-4 py-2"><div className="h-[1px] bg-sidebar-border" /></div>

        {/* --- BENCHMARK GROUP --- */}
        <SidebarGroup>
          <SidebarGroupLabel>Benchmark Email</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarItem 
                title="Bulk Import" 
                url="/" 
                icon={Upload} 
                isActive={location.pathname === "/" && activeAccount?.provider === 'benchmark'}
                onClick={() => handlePlatformClick('benchmark', '/')}
              />
              <SidebarItem 
                title="User Management" 
                url="/users" 
                icon={Users} 
                isActive={location.pathname === "/users" && activeAccount?.provider === 'benchmark'}
                onClick={() => handlePlatformClick('benchmark', '/users')}
              />
              <SidebarItem 
                title="Automations" 
                url="/automation" 
                icon={Workflow} 
                isActive={location.pathname === "/automation" && activeAccount?.provider === 'benchmark'}
                onClick={() => handlePlatformClick('benchmark', '/automation')}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="px-4 py-2"><div className="h-[1px] bg-sidebar-border" /></div>

        {/* --- OMNISEND GROUP --- */}
        <SidebarGroup>
          <SidebarGroupLabel>Omnisend</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
               <SidebarItem 
                title="Bulk Import" 
                url="/" 
                icon={Upload} 
                isActive={location.pathname === "/" && activeAccount?.provider === 'omnisend'}
                onClick={() => handlePlatformClick('omnisend', '/')}
              />
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

      {/* --- DIALOGS --- */}
      <AddAccountDialog 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen} 
        onAdd={addAccount}
      />

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

// --- HELPER COMPONENTS ---

function SidebarItem({ title, url, icon: Icon, isActive, onClick }: any) {
    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive} onClick={onClick}>
                <Link to={url}>
                    <Icon />
                    <span>{title}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    )
}

function AccountSwitcher({ accounts, activeAccount, setActiveAccount, onAdd, onEdit }: any) {
    const getIcon = (provider?: string) => {
        if (provider === 'benchmark') return <BarChart3 className="size-4" />;
        if (provider === 'omnisend') return <Send className="size-4" />;
        return <Activity className="size-4" />;
    }

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
                    {getIcon(activeAccount?.provider)}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {activeAccount ? activeAccount.name : "Select Account"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                       {activeAccount ? "Active Session" : "No Active Session"}
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
                 <DropdownMenuLabel className="text-xs font-bold text-muted-foreground">Switch Account</DropdownMenuLabel>
                 <div className="max-h-[300px] overflow-y-auto">
                    {accounts.length === 0 ? (
                         <div className="p-2 text-sm text-muted-foreground">No accounts found.</div>
                    ) : (
                        accounts.map((acc: Account) => (
                             <DropdownMenuItem 
                                key={acc.id} 
                                onClick={() => setActiveAccount(acc)}
                                className="flex items-center justify-between gap-2 cursor-pointer"
                             >
                                <div className="flex items-center gap-2 overflow-hidden">
                                     {getIcon(acc.provider)}
                                     <span className="truncate">{acc.name}</span>
                                </div>
                                {activeAccount?.id === acc.id && <Check className="h-4 w-4 opacity-50" />}
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5 ml-auto"
                                    onClick={(e) => { e.stopPropagation(); onEdit(acc); }}
                                >
                                    <Settings2 className="h-3 w-3" />
                                </Button>
                             </DropdownMenuItem>
                        ))
                    )}
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
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Account Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Store" required />
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