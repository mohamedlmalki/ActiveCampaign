import * as React from "react"
import { 
  Users, 
  Upload, 
  UserPlus, 
  Settings2, 
  Activity, 
  BarChart3, 
  ChevronsUpDown, 
  Plus, 
  Check, 
  Search,
  Workflow,
  Mail,
  UserX,
  PieChart,
  Trash2,
  Save
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { accounts, activeAccount, setActiveAccount, addAccount, updateAccount, deleteAccount } = useAccount()
  const location = useLocation()
  
  // State
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [editingAccount, setEditingAccount] = React.useState<Account | null>(null)

  // Filter Accounts
  const filteredAccounts = accounts.filter(acc => 
    acc.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const acAccounts = filteredAccounts.filter(a => a.provider === 'activecampaign')
  const bmAccounts = filteredAccounts.filter(a => a.provider === 'benchmark')

  // Navigation Logic
  const getNavItems = () => {
    const common = [
      { title: "Bulk Import", url: "/", icon: Upload },
      { title: "Single Import", url: "/single-import", icon: UserPlus },
      { title: "User Management", url: "/users", icon: Users },
      { title: "Automations", url: "/automation", icon: Workflow },
    ]

    if (activeAccount?.provider === 'activecampaign') {
      return [
        ...common,
        { title: "Campaign Stats", url: "/campaign-stats", icon: PieChart },
        { title: "Forget Subscriber", url: "/forget", icon: UserX },
      ]
    }

    if (activeAccount?.provider === 'benchmark') {
      return [
        ...common,
        { title: "Emails / Campaigns", url: "/emails", icon: Mail },
      ]
    }

    return common
  }

  const navItems = getNavItems()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    {activeAccount?.provider === 'benchmark' ? (
                        <BarChart3 className="size-4" />
                    ) : (
                        <Activity className="size-4" />
                    )}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {activeAccount ? activeAccount.name : "Select Account"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {activeAccount ? (activeAccount.provider === 'activecampaign' ? 'ActiveCampaign' : 'Benchmark') : "No Account"}
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
                {/* Search */}
                <div className="p-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Find account..." 
                            className="pl-8 h-9" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()} 
                        />
                    </div>
                </div>
                <DropdownMenuSeparator />
                
                <div className="max-h-[300px] overflow-y-auto">
                    {/* ActiveCampaign Group */}
                    {acAccounts.length > 0 && (
                        <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-xs font-bold text-muted-foreground">ActiveCampaign</DropdownMenuLabel>
                            {acAccounts.map((account) => (
                                <AccountItem 
                                    key={account.id} 
                                    account={account} 
                                    isActive={activeAccount?.id === account.id}
                                    onSelect={() => setActiveAccount(account)}
                                    onEdit={() => setEditingAccount(account)}
                                />
                            ))}
                        </DropdownMenuGroup>
                    )}

                    {acAccounts.length > 0 && bmAccounts.length > 0 && <DropdownMenuSeparator />}

                    {/* Benchmark Group */}
                    {bmAccounts.length > 0 && (
                        <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-xs font-bold text-muted-foreground">Benchmark Email</DropdownMenuLabel>
                            {bmAccounts.map((account) => (
                                <AccountItem 
                                    key={account.id} 
                                    account={account} 
                                    isActive={activeAccount?.id === account.id}
                                    onSelect={() => setActiveAccount(account)}
                                    onEdit={() => setEditingAccount(account)}
                                />
                            ))}
                        </DropdownMenuGroup>
                    )}
                    
                    {accounts.length === 0 && (
                         <div className="p-4 text-center text-sm text-muted-foreground">No accounts found.</div>
                    )}
                </div>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsAddOpen(true)} className="gap-2 p-2 cursor-pointer">
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                    <Plus className="size-4" />
                  </div>
                  <div className="font-medium text-muted-foreground">Add Account</div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url} tooltip={item.title}>
                    <Link to={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
         <div className="p-2">
            <div className={`flex items-center gap-2 text-xs p-2 rounded-md ${activeAccount?.status === 'connected' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-muted text-muted-foreground'}`}>
                <div className={`w-2 h-2 rounded-full ${activeAccount?.status === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span>{activeAccount ? (activeAccount.status === 'connected' ? 'System Online' : 'Check Connection') : 'Offline'}</span>
            </div>
         </div>
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
            onOpenChange={(open) => !open && setEditingAccount(null)}
            account={editingAccount}
            onUpdate={updateAccount}
            onDelete={deleteAccount}
        />
      )}
    </Sidebar>
  )
}

// --- SUB-COMPONENTS ---

function AccountItem({ account, isActive, onSelect, onEdit }: any) {
    return (
        <div className="flex items-center justify-between p-2 rounded-sm hover:bg-accent group">
             <div 
                className="flex items-center gap-2 flex-1 cursor-pointer overflow-hidden"
                onClick={onSelect}
             >
                <div className="flex size-6 items-center justify-center rounded-sm border bg-background">
                    {account.provider === 'benchmark' ? <BarChart3 className="size-4" /> : <Activity className="size-4" />}
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm font-medium">{account.name}</span>
                    {account.status === 'failed' && <span className="text-[10px] text-red-500 truncate">Failed</span>}
                </div>
             </div>
             
             <div className="flex items-center gap-1">
                 {isActive && <Check className="h-4 w-4 opacity-50 mr-1" />}
                 {/* Settings Button - Only visible on hover */}
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                 >
                    <Settings2 className="h-3 w-3" />
                 </Button>
             </div>
        </div>
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
                    <DialogDescription>Connect a new ActiveCampaign or Benchmark account.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select value={provider} onValueChange={setProvider}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="activecampaign">ActiveCampaign</SelectItem>
                                <SelectItem value="benchmark">Benchmark Email</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Account Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Agency" required />
                    </div>
                    <div className="space-y-2">
                        <Label>API Key / Token</Label>
                        {/* Changed type to text for visibility */}
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
                        {/* Visible text input */}
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
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                         </Button>
                         <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading}>
                                <Save className="w-4 h-4 mr-2" /> Save Changes
                            </Button>
                         </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}