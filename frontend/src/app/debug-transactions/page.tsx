'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function DebugTransactions() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [transactions, setTransactions] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    setDebugInfo({
      hasToken: !!token,
      token: token ? token.substring(0, 20) + '...' : 'None',
      hasUser: !!user,
      user: user ? JSON.parse(user) : null,
      apiBaseURL: 'http://localhost:8080/api'
    });

    // Try to fetch transactions
    if (token) {
      fetchTransactions();
    }
  }, []);

  const fetchTransactions = async () => {
    try {
      console.log('Fetching transactions...');
      const response = await api.get('/transactions');
      console.log('Response:', response.data);
      setTransactions(response.data.data || []);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">🔍 Debug Transactions</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-bold mb-2">Auth Status:</h2>
        <pre className="text-sm">{JSON.stringify(debugInfo, null, 2)}</pre>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-bold mb-2">Transactions ({transactions.length}):</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500">No transactions loaded</p>
        ) : (
          <ul className="space-y-2">
            {transactions.map((trx: any) => (
              <li key={trx.id} className="border-b pb-2">
                <div><strong>{trx.invoice_number}</strong></div>
                <div className="text-sm text-gray-600">
                  {trx.cashier?.name} - Rp {trx.total?.toLocaleString('id-ID')}
                </div>
                <div className="text-xs text-gray-500">{trx.date}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <button 
          onClick={fetchTransactions}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry Fetch
        </button>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>💡 <strong>Tips:</strong></p>
        <ul className="list-disc ml-5 mt-2">
          <li>If "hasToken: false" → You need to login first</li>
          <li>If error 401 → Token invalid, login again</li>
          <li>If transactions.length = 0 but no error → Backend returns empty</li>
          <li>Check browser console (F12) for detailed logs</li>
        </ul>
      </div>
    </div>
  );
}
