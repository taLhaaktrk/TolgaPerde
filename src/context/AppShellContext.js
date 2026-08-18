import React, { createContext, useContext, useMemo, useState } from 'react';

export const MODULE_HOME = 'home';
export const MODULE_CUSTOMERS = 'customers';
export const MODULE_REPORTS = 'reports';
export const MODULE_DESIGN = 'design';
export const MODULE_PHOTO = 'photo';
export const MODULE_SETTINGS = 'settings';

const AppShellContext = createContext(null);

export function AppShellProvider({ children }) {
  const [activeModule, setActiveModule] = useState(MODULE_HOME);
  const [activeCustomer, setActiveCustomer] = useState(null);

  const value = useMemo(
    () => ({
      activeModule,
      setActiveModule,
      activeCustomer,
      setActiveCustomer,
      clearActiveCustomer: () => setActiveCustomer(null),
      // Müşteriyi aktif yap + ilgili modüle geç
      selectCustomerAndGoTo: (customer, module) => {
        setActiveCustomer(customer);
        if (module) setActiveModule(module);
      },
    }),
    [activeModule, activeCustomer]
  );

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error('useAppShell must be inside AppShellProvider');
  return ctx;
}
