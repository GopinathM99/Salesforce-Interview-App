'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');
  const [message, setMessage] = useState<string>('');
  const [email, setEmail] = useState<string>('');

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

  const handleEmailUnsubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to unsubscribe');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

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
            <p style={{ textAlign: 'center', marginBottom: '30px' }}>
              Enter your email address to unsubscribe from our notifications.
            </p>
            
            <form onSubmit={handleEmailUnsubscribe} style={{ maxWidth: '400px', margin: '0 auto' }}>
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                  placeholder="your-email@example.com"
                />
              </div>
              
              <button
                type="submit"
                style={{
                  width: '100%',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  padding: '12px',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Unsubscribe
              </button>
            </form>
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
