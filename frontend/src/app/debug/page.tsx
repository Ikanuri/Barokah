'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function DebugPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState<string>('');

  const testEndpoint = async (name: string, endpoint: string) => {
    setLoading(name);
    try {
      console.log(`Testing ${name}:`, endpoint);
      const response = await api.get(endpoint);
      console.log(`${name} response:`, response);
      
      setResults((prev: any) => ({
        ...prev,
        [name]: {
          status: 'success',
          data: response.data,
          count: response.data.data?.length || 0
        }
      }));
      
      toast.success(`${name} OK: ${response.data.data?.length || 0} items`);
    } catch (error: any) {
      console.error(`${name} error:`, error);
      console.error('Error response:', error.response);
      
      setResults((prev: any) => ({
        ...prev,
        [name]: {
          status: 'error',
          error: error.message,
          response: error.response?.data
        }
      }));
      
      toast.error(`${name} FAILED: ${error.message}`);
    } finally {
      setLoading('');
    }
  };

  const testAll = async () => {
    await testEndpoint('Products', '/products');
    await testEndpoint('Categories', '/categories');
    await testEndpoint('Transactions', '/transactions');
    await testEndpoint('Users', '/users');
  };

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log('Token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
    console.log('User:', user);
    
    if (!token) {
      toast.error('No auth token found! Please login first.');
    } else {
      toast.success('Auth token found');
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold">🔍 API Debug Tool</h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-sm text-gray-700">
                <strong>API Base URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'https://localhost:8000/api'}
              </p>
              <p className="text-sm text-gray-700 mt-2">
                <strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={checkAuth}>Check Auth</Button>
              <Button onClick={() => testEndpoint('Products', '/products')} disabled={loading === 'Products'}>
                {loading === 'Products' ? 'Testing...' : 'Test Products'}
              </Button>
              <Button onClick={() => testEndpoint('Categories', '/categories')} disabled={loading === 'Categories'}>
                {loading === 'Categories' ? 'Testing...' : 'Test Categories'}
              </Button>
              <Button onClick={() => testEndpoint('Transactions', '/transactions')} disabled={loading === 'Transactions'}>
                {loading === 'Transactions' ? 'Testing...' : 'Test Transactions'}
              </Button>
              <Button onClick={() => testEndpoint('Users', '/users')} disabled={loading === 'Users'}>
                {loading === 'Users' ? 'Testing...' : 'Test Users'}
              </Button>
              <Button onClick={testAll} variant="primary">
                Test All
              </Button>
            </div>

            <div className="mt-6">
              <h3 className="font-bold text-lg mb-3">Results:</h3>
              <div className="space-y-3">
                {Object.keys(results).length === 0 ? (
                  <p className="text-gray-500 italic">No tests run yet. Click buttons above to test.</p>
                ) : (
                  Object.entries(results).map(([name, result]: [string, any]) => (
                    <Card key={name} className={result.status === 'success' ? 'border-green-300' : 'border-red-300'}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold">{name}</h4>
                          <span className={`px-2 py-1 rounded text-xs ${
                            result.status === 'success' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {result.status}
                          </span>
                        </div>
                        
                        {result.status === 'success' ? (
                          <div>
                            <p className="text-sm text-gray-600">Count: <strong>{result.count}</strong> items</p>
                            <details className="mt-2">
                              <summary className="cursor-pointer text-sm text-blue-600 hover:underline">
                                Show raw data
                              </summary>
                              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-60">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </details>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-red-600">Error: {result.error}</p>
                            {result.response && (
                              <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-auto max-h-40">
                                {JSON.stringify(result.response, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold">📋 Troubleshooting Checklist</h2>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>Backend server running on port 8000 (https-proxy.js)?</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>Frontend server running on port 3000?</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>Logged in with valid token?</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>CORS enabled in backend (config/cors.php)?</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>Database has data? (Run: php check_database.php)</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>SSL certificate valid? (Accept self-signed cert in browser)</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
