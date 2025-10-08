'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAdminAccess } from '@/lib/useAdminAccess';

interface SubscriptionPreferences {
  id: string;
  email: string;
  user_id: string | null;
  topics: string[];
  difficulties: string[];
  question_types: string[];
  practice_modes: string[];
  question_count: number;
  delivery_frequency: 'Daily' | 'Weekly' | 'Bi-weekly';
  include_answers: boolean;
  custom_message: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_sent_at: string | null;
}

interface EmailDeliveryLog {
  id: string;
  subscription_id: string;
  email: string;
  questions_sent: unknown[];
  sent_at: string;
  status: 'sent' | 'failed' | 'bounced';
  error_message: string | null;
}

export default function EmailManagementPage() {
  const { isAdmin, sessionReady } = useAdminAccess();
  const [subscriptions, setSubscriptions] = useState<SubscriptionPreferences[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailDeliveryLog[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (isAdmin && sessionReady) {
      loadSubscriptions();
      loadEmailLogs();
    }
  }, [isAdmin, sessionReady]);

  const loadSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_preferences')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const loadEmailLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('email_delivery_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setEmailLogs(data || []);
    } catch (error) {
      console.error('Error loading email logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSendEmails = async () => {
    setSendingEmails(true);
    setMessage('');

    try {
      const response = await fetch('/api/send-emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_EMAIL_SERVICE_TOKEN || 'test-token'}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Email delivery completed. Sent: ${data.sent}, Failed: ${data.failed}`);
        // Reload data to show updated information
        loadSubscriptions();
        loadEmailLogs();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingEmails(false);
    }
  };

  const handleToggleSubscription = async (subscriptionId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('subscription_preferences')
        .update({ is_active: !isActive })
        .eq('id', subscriptionId);

      if (error) throw error;
      
      // Update local state
      setSubscriptions(prev => 
        prev.map(sub => 
          sub.id === subscriptionId 
            ? { ...sub, is_active: !isActive }
            : sub
        )
      );
    } catch (error) {
      console.error('Error toggling subscription:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return '#28a745';
      case 'failed': return '#dc3545';
      case 'bounced': return '#ffc107';
      default: return '#6c757d';
    }
  };

  if (!sessionReady) {
    return <div>Loading...</div>;
  }

  // Temporarily allow anyone to access email management
  // if (!isAdmin) {
  //   return <AdminAccessShell>{() => null}</AdminAccessShell>;
  // }

  return (
    <div className="grid">
      <div className="card">
        <h1>Email Management</h1>
        
        {message && (
          <div style={{ 
            padding: '10px', 
            marginBottom: '20px', 
            backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda',
            color: message.includes('Error') ? '#721c24' : '#155724',
            borderRadius: '4px'
          }}>
            {message}
          </div>
        )}

        <div style={{ marginBottom: '30px' }}>
          <button
            onClick={handleSendEmails}
            disabled={sendingEmails}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: sendingEmails ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {sendingEmails ? 'Sending Emails...' : 'Send Emails Now'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          <div className="card">
            <h3>Subscription Statistics</h3>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#007bff' }}>
              {subscriptions.length} Total Subscriptions
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
              Active: {subscriptions.filter(s => s.is_active).length} | 
              Inactive: {subscriptions.filter(s => !s.is_active).length}
            </div>
          </div>

          <div className="card">
            <h3>Recent Email Activity</h3>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
              {emailLogs.filter(log => log.status === 'sent').length} Sent Today
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
              Failed: {emailLogs.filter(log => log.status === 'failed').length}
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Active Subscriptions</h3>
          {loadingSubscriptions ? (
            <p>Loading subscriptions...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Email</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Frequency</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Questions</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Topics</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Last Sent</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map(subscription => (
                    <tr key={subscription.id}>
                      <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                        {subscription.email}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                        {subscription.delivery_frequency}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                        {subscription.question_count}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                        {subscription.topics.slice(0, 2).join(', ')}
                        {subscription.topics.length > 2 && '...'}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                        {formatDate(subscription.last_sent_at)}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                        <span style={{ 
                          color: subscription.is_active ? '#28a745' : '#dc3545',
                          fontWeight: 'bold'
                        }}>
                          {subscription.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                        <button
                          onClick={() => handleToggleSubscription(subscription.id, subscription.is_active)}
                          style={{
                            backgroundColor: subscription.is_active ? '#dc3545' : '#28a745',
                            color: 'white',
                            padding: '5px 10px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          {subscription.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Recent Email Delivery Logs</h3>
          {loadingLogs ? (
            <p>Loading email logs...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Email</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Sent At</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Questions</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {emailLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                        {log.email}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                        {formatDate(log.sent_at)}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                        <span style={{ 
                          color: getStatusColor(log.status),
                          fontWeight: 'bold'
                        }}>
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                        {log.questions_sent.length}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                        {log.error_message || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
