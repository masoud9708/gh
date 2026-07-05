'use client'

import { useState } from 'react';
import { useFreightEscrow } from '../../../lib/hooks/useFreightEscrow';
import { useAccount } from 'wagmi';

export default function DriverDashboard() {
  const { address } = useAccount();
  const { acceptJob } = useFreightEscrow();
  const [loading, setLoading] = useState(false);
  const [freightId, setFreightId] = useState('');

  const handleAcceptJob = async () => {
    if (!address) return alert("Connect wallet first");
    if (!freightId) return alert("Enter freight ID");

    setLoading(true);
    try {
      const collateral = 1000000000000000000n; // 1 USDT/MATIC mock collateral
      const tx = await acceptJob(freightId, collateral);
      alert(`Job Accepted! Tx: ${tx}`);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">پنل راننده (Driver)</h1>

      <div className="bg-white shadow p-6 rounded-lg border mb-8 text-black">
        <h2 className="text-xl font-semibold mb-4">پذیرش بار</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="شناسه بار (مثال: FR-123)"
            value={freightId}
            onChange={(e) => setFreightId(e.target.value)}
            className="border p-2 rounded flex-1 text-black"
          />
          <button
            onClick={handleAcceptJob}
            disabled={loading || !address || !freightId}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {loading ? 'در حال ارسال...' : 'پذیرش شغل و واریز وثیقه'}
          </button>
        </div>
      </div>

      <div className="bg-white shadow p-6 rounded-lg border text-black">
        <h2 className="text-xl font-semibold mb-4">بارهای در حال حمل</h2>
        <p className="text-gray-500">لیست بارها از بک‌اند فراخوانی می‌شود...</p>
      </div>
    </main>
  );
}
