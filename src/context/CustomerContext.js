import React, { createContext, useContext, useMemo, useState } from 'react';

const CustomerContext = createContext(null);

const parseAmount = (raw) => {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[^0-9.,]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

export function CustomerProvider({ children }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [total, setTotal] = useState('');
  const [deposit, setDeposit] = useState('');

  const value = useMemo(() => {
    const totalNum = parseAmount(total);
    const depositNum = parseAmount(deposit);
    const remaining = Math.max(totalNum - depositNum, 0);
    return {
      fullName, setFullName,
      phone, setPhone,
      total, setTotal,
      deposit, setDeposit,
      totalNum, depositNum, remaining,
      reset: () => {
        setFullName('');
        setPhone('');
        setTotal('');
        setDeposit('');
      },
      // ADIM 3 unified schema:
      snapshot: () => ({
        fullName: fullName.trim(),
        phone: phone.trim(),
        totalAmount: totalNum,
        deposit: depositNum,
        remainingAmount: remaining,
      }),
    };
  }, [fullName, phone, total, deposit]);

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export function useCustomer() {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomer must be used inside CustomerProvider');
  return ctx;
}
