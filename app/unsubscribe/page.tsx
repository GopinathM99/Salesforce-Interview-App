'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');
  const [message, setMessage] = useState<string>('');

  const handleTokenUnsubscribe = useCallback(async () => {
    if (!token) return;

    setStatus('loading');
    try {
      const response = await fetch(`/api/unsubscribe?token=${token}`);
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
        setEmail(data.email);
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to unsubscribe');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      handleTokenUnsubscribe();
    }
  }, [token, handleTokenUnsubscribe]);

  return (
    <div className="grid">
      <div className="card">
        <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>
          Unsubscribe from Email Notifications
        </h1>

        {status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Processing your request...</p>
          </div>
        )}

        {status === 'success' && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ 
              backgroundColor: '#d4edda', 
              color: '#155724', 
              padding: '15px', 
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 10px 0' }}>✓ Successfully Unsubscribed</h3>
              <p style={{ margin: '0' }}>{message}</p>
              {email && <p style={{ margin: '10px 0 0 0' }}>Email: {email}</p>}
            </div>
            <p>
              You will no longer receive email notifications from Salesforce Interview Prep.
              You can always resubscribe by visiting our{' '}
              <a href="/subscribe" style={{ color: '#007bff' }}>subscription page</a>.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ 
              backgroundColor: '#f8d7da', 
              color: '#721c24', 
              padding: '15px', 
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 10px 0' }}>✗ Unsubscribe Failed</h3>
              <p style={{ margin: '0' }}>{message}</p>
            </div>
            <p>
              If you continue to have issues, please contact support or try unsubscribing 
              using your email address below.
            </p>
          </div>
        )}

        {status === 'idle' && !token && (
          <div>
            <p style={{ textAlign: 'center', marginBottom: '20px' }}>
              Please use the unsubscribe link from one of our emails to complete your request.
            </p>
            <p style={{ textAlign: 'center' }}>
              If you no longer have the email, you can contact support or manage your preferences on the{' '}
              <a href="/subscribe" style={{ color: '#007bff' }}>subscription page</a>.
            </p>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
          <p style={{ color: '#666', fontSize: '14px' }}>
            <Link href="/" className="btn back-btn" style={{ marginRight: '8px' }}>
              ← Back to Home
            </Link>
            {' | '}
            <a href="/subscribe" style={{ color: '#007bff', textDecoration: 'none' }}>
              Manage Subscription
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}
