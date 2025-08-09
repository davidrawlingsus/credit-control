"use client";
import React from 'react';
import Modal from '@/components/Modal';
import useSWR from 'swr';

type OverdueInvoice = {
  id: number;
  stripe_invoice_id: string;
  customer_email: string;
  customer_name?: string;
  amount: number | string;
  currency: string;
  due_date: string;
  status: string;
  overdue_days: number;
  last_chase_date?: string | null;
  chase_count: number;
  chase_paused: boolean;
  next_chase_date?: string | null;
  days_until_next_chase?: number | null;
  links: { previous_chasers: string; next_chaser_preview: string };
};

type ChaseEmail = {
  id: number;
  subject: string;
  body: string;
  sent_at?: string | null;
  status: string;
  overdue_day?: number;
};

// Prefer public env var for client-side usage; fall back to Next.js env from next.config.js, then localhost
const backend =
  (process.env.NEXT_PUBLIC_BACKEND_URL as string | undefined) ||
  (process.env.BACKEND_URL as string | undefined) ||
  'http://localhost:3001';
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function HomePage() {
  const { data, isLoading, mutate } = useSWR<{ success: boolean; data: { invoices: OverdueInvoice[] } }>(
    `${backend}/api/invoices/overdue`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const [expanded, setExpanded] = React.useState<Record<number, boolean>>({});
  const [emailHistory, setEmailHistory] = React.useState<Record<number, ChaseEmail[]>>({});
  const [loadingHistory, setLoadingHistory] = React.useState<Record<number, boolean>>({});
  const [previewOpen, setPreviewOpen] = React.useState<boolean>(false);
  const [previewContent, setPreviewContent] = React.useState<{ subject: string; body: string } | null>(null);
  const [previewTitle, setPreviewTitle] = React.useState<string>('');

  async function togglePause(inv: OverdueInvoice) {
    await fetch(`${backend}/api/invoices/${inv.id}/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused: !inv.chase_paused }),
    });
    mutate();
  }

  async function expedite(inv: OverdueInvoice) {
    await fetch(`${backend}/api/invoices/${inv.id}/expedite`, { method: 'POST' });
    mutate();
  }

  async function previewNext(inv: OverdueInvoice) {
    const res = await fetch(`${backend}${inv.links.next_chaser_preview}`);
    const json = await res.json();
    const subj = json?.data?.subject || 'Next chaser';
    const body = json?.data?.body || '';
    setPreviewTitle(`Next Chaser — ${subj}`);
    setPreviewContent({ subject: subj, body });
    setPreviewOpen(true);
  }

  async function loadHistory(inv: OverdueInvoice) {
    setLoadingHistory((s) => ({ ...s, [inv.id]: true }));
    try {
      const res = await fetch(`${backend}${inv.links.previous_chasers}`);
      const json = await res.json();
      setEmailHistory((s) => ({ ...s, [inv.id]: json?.data?.chase_emails || [] }));
    } finally {
      setLoadingHistory((s) => ({ ...s, [inv.id]: false }));
    }
  }

  function toggleExpand(inv: OverdueInvoice) {
    const isOpen = !!expanded[inv.id];
    const next = { ...expanded, [inv.id]: !isOpen };
    setExpanded(next);
    if (!isOpen && !emailHistory[inv.id]) {
      loadHistory(inv);
    }
  }

  if (isLoading) return <div>Loading…</div>;
  const invoices = data?.data?.invoices || [];

  return (
    <>
    <div>
      <div className="row" style={{ marginBottom: '0.5rem' }}>
        <span className="badge">{invoices.length} overdue</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Customer</th>
            <th>Due date</th>
            <th>Days overdue</th>
            <th>Chases sent</th>
            <th>Next chase</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => {
            const open = !!expanded[inv.id];
            return (
              <React.Fragment key={inv.id}>
                <tr>
                  <td>
                    <div className="row">
                      <button className="btn" onClick={() => toggleExpand(inv)}>
                        {open ? 'Hide' : 'Email History'}
                      </button>
                      <span className="muted">{inv.stripe_invoice_id}</span>
                    </div>
                  </td>
                  <td>
                    <div>{inv.customer_name || inv.customer_email}</div>
                    {inv.customer_name && <div className="muted">{inv.customer_email}</div>}
                  </td>
                  <td>{inv.due_date}</td>
                  <td>{inv.overdue_days}</td>
                  <td>{inv.chase_count}</td>
                  <td>
                    {inv.next_chase_date ? (
                      <div>
                        <div>{new Date(inv.next_chase_date).toLocaleString()}</div>
                        <div className="muted">in ~{inv.days_until_next_chase} day(s)</div>
                      </div>
                    ) : (
                      <span className="muted">n/a</span>
                    )}
                  </td>
                  <td>
                    <div className="row">
                      <button className="btn" onClick={() => togglePause(inv)}>
                        {inv.chase_paused ? 'Resume' : 'Pause'}
                      </button>
                      <button className="btn btn-primary" onClick={() => expedite(inv)}>Expedite</button>
                      <button className="btn" onClick={() => previewNext(inv)}>Preview next</button>
                    </div>
                  </td>
                </tr>
                {open && (
                  <tr>
                    <td colSpan={7}>
                      <div className="expand">
                        <strong>Email History</strong>
                        <div className="space" />
                        {loadingHistory[inv.id] && <div>Loading…</div>}
                        {!loadingHistory[inv.id] && (emailHistory[inv.id]?.length ? (
                          <table>
                            <thead>
                              <tr>
                                <th>Sent at</th>
                                <th>Subject</th>
                                <th>Preview</th>
                              </tr>
                            </thead>
                            <tbody>
                              {emailHistory[inv.id]!.map((em) => (
                                <tr key={em.id}>
                                  <td>{em.sent_at ? new Date(em.sent_at).toLocaleString() : <span className="muted">pending</span>}</td>
                                  <td>{em.subject}</td>
                                  <td className="muted">{em.body.slice(0, 120)}{em.body.length > 120 ? '…' : ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="muted">No chase emails yet.</div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
    <Modal open={previewOpen} title={previewTitle} onClose={() => setPreviewOpen(false)}>
      {previewContent ? (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{previewContent.subject}</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{previewContent.body}</div>
        </div>
      ) : (
        <div className="muted">No preview available.</div>
      )}
    </Modal>
    </>
  );
}


