import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';

// Unified Account Interface
export interface Account {
  id: string;
  name: string;
  provider: 'activecampaign' | 'benchmark' | 'omnisend'; // <--- UPDATED UNION TYPE
  apiKey: string;
  apiUrl?: string; // Optional (Required for AC)
  status?: "unknown" | "checking" | "connected" | "failed";
  lastCheckResponse?: any;
}

type AccountData = Omit<Account, 'id' | 'status' | 'lastCheckResponse'>;

interface AccountContextType {
  accounts: Account[];
  activeAccount: Account | null;
  setActiveAccount: (account: Account | null) => void;
  fetchAccounts: () => Promise<void>;
  addAccount: (accountData: AccountData) => Promise<void>;
  updateAccount: (id: string, data: AccountData) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  checkAccountStatus: (account: Account) => Promise<Account>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider = ({ children }: { children: ReactNode }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccountState] = useState<Account | null>(null);

  const setActiveAccount = (account: Account | null) => {
    setActiveAccountState(account);
  }

  // --- SMART STATUS CHECK ---
  const checkAccountStatus = useCallback(async (account: Account): Promise<Account> => {
    try {
        let endpoint = '';
        let body = {};

        // Determine Endpoint based on Provider
        if (account.provider === 'benchmark') {
            endpoint = '/api/benchmark/check-status';
            body = { apiKey: account.apiKey };
        } else if (account.provider === 'omnisend') {
            endpoint = '/api/omnisend/check-status'; // <--- NEW CASE
            body = { apiKey: account.apiKey };
        } else {
            // Default to ActiveCampaign
            endpoint = '/api/activecampaign/check-status';
            body = { apiKey: account.apiKey, apiUrl: account.apiUrl };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const result = await response.json();
        const status: Account['status'] = response.ok ? 'connected' : 'failed';
        return { ...account, status: status, lastCheckResponse: result.response || result };

    } catch (error) {
        return { ...account, status: 'failed', lastCheckResponse: { error: 'Network error' } };
    }
  }, []);
  
  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch("/api/accounts");
      const data: any[] = await response.json();
      
      // Ensure every account has a provider
      const validAccounts: Account[] = data.map(acc => ({
          ...acc,
          provider: acc.provider || 'activecampaign',
          status: 'unknown'
      }));
      
      const accountsWithStatus = await Promise.all(validAccounts.map(acc => checkAccountStatus(acc)));
      setAccounts(accountsWithStatus);

      // Restore active account selection
      if (activeAccount) {
         const found = accountsWithStatus.find(a => a.id === activeAccount.id);
         if (found) setActiveAccountState(found);
      } else if (accountsWithStatus.length > 0) {
         setActiveAccountState(accountsWithStatus[0]);
      }

    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    }
  }, [activeAccount, checkAccountStatus]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const addAccount = async (accountData: AccountData) => {
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(accountData),
    });
    await fetchAccounts();
  };

  const updateAccount = async (id: string, data: AccountData) => {
    await fetch(`/api/accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await fetchAccounts();
  };
  
  const deleteAccount = async (id: string) => {
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    if(activeAccount?.id === id) {
        setActiveAccountState(null);
    }
    await fetchAccounts();
  };
  
  const manualCheckAccountStatus = async (account: Account) => {
    setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, status: 'checking' } : a));
    const updatedAccount = await checkAccountStatus(account);
    setAccounts(prev => prev.map(a => a.id === account.id ? updatedAccount : a));
    if (activeAccount?.id === account.id) {
        setActiveAccount(updatedAccount);
    }
    return updatedAccount;
  }
  
  return (
    <AccountContext.Provider value={{ accounts, activeAccount, setActiveAccount, fetchAccounts, addAccount, updateAccount, deleteAccount, checkAccountStatus: manualCheckAccountStatus }}>
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};