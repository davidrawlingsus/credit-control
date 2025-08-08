import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Credit Control Dashboard',
  description: 'Overdue invoices and chaser management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1rem' }}>
          <h1 style={{ margin: '0 0 1rem' }}>Credit Control Dashboard</h1>
          {children}
        </div>
      </body>
    </html>
  );
}


