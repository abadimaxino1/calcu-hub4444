import React, { useEffect, useState } from 'react';

export default function TwoFactor() {
  const [loading, setLoading] = useState(false);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [base32, setBase32] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function startSetup() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/2fa/setup', { credentials: 'include' });
      const j = await res.json();
      if (!res.ok) {
        setMessage('Error: ' + (j && j.reason ? j.reason : res.statusText));
      } else {
        setOtpauthUrl(j.otpauth_url || null);
        setBase32(j.base32 || null);
      }
    } catch (err: any) {
      setMessage('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function verifyToken(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMessage('Invalid token or error: ' + (j && j.reason ? j.reason : res.statusText));
      } else {
        setMessage('Two-factor authentication enabled.');
        setOtpauthUrl(null);
        setBase32(null);
        setToken('');
      }
    } catch (err: any) {
      setMessage('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-2">Two-Factor Authentication (TOTP)</h2>
      <p className="text-sm mb-4">Enable app-based TOTP 2FA for your admin account.</p>

      {!otpauthUrl && (
        <div className="mb-4">
          <button
            className="px-3 py-2 bg-blue-600 text-white rounded"
            onClick={startSetup}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Set up 2FA'}
          </button>
        </div>
      )}

      {otpauthUrl && (
        <div className="mb-4">
          <p className="mb-2">Scan this QR code with your authenticator app, or enter the secret manually.</p>
          <div className="flex items-start gap-4">
            <img
              alt="2FA QR"
              src={`${encodeURI('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=')}${encodeURIComponent(otpauthUrl)}`}
              className="border p-1 bg-white"
            />
            <div>
              <div className="mb-2"><strong>Secret:</strong> <code>{base32}</code></div>
              <form onSubmit={verifyToken} className="flex gap-2 items-center">
                <input
                  aria-label="TOTP token"
                  className="border px-2 py-1"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="123456"
                />
                <button className="px-3 py-1 bg-green-600 text-white rounded" type="submit" disabled={loading}>Verify</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {message && <div className="mt-2 text-sm text-gray-700">{message}</div>}
    </div>
  );
}
