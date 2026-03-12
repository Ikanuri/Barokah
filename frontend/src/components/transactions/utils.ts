import React from 'react';
import { Transaction, DateGroup } from './types';

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateOnly = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const groupTransactionsByDate = (transactions: Transaction[]): DateGroup[] => {
  const grouped: Record<string, Transaction[]> = {};

  transactions.forEach((transaction) => {
    const date = new Date(transaction.date).toISOString().split('T')[0];
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(transaction);
  });

  return Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({
      date,
      dateFormatted: formatDateOnly(date),
      transactions: grouped[date],
      totalAmount: grouped[date].reduce((sum, t) => sum + t.total, 0),
      count: grouped[date].length,
    }));
};

export const getPaymentMethodBadge = (method: string) => {
  const badges: Record<string, { bg: string; darkBg: string; text: string; darkText: string; label: string }> = {
    cash: { bg: 'bg-green-100', darkBg: 'dark:bg-green-900/30', text: 'text-green-800', darkText: 'dark:text-green-400', label: 'TUNAI' },
    card: { bg: 'bg-blue-100', darkBg: 'dark:bg-blue-900/30', text: 'text-blue-800', darkText: 'dark:text-blue-400', label: 'KARTU' },
    transfer: { bg: 'bg-purple-100', darkBg: 'dark:bg-purple-900/30', text: 'text-purple-800', darkText: 'dark:text-purple-400', label: 'TRANSFER' },
    qris: { bg: 'bg-orange-100', darkBg: 'dark:bg-orange-900/30', text: 'text-orange-800', darkText: 'dark:text-orange-400', label: 'QRIS' },
  };
  const badge = badges[method] || badges.cash;
  return React.createElement('span', {
    className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.darkBg} ${badge.text} ${badge.darkText}`
  }, badge.label);
};
