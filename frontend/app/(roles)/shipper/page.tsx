'use client'

import { useState } from 'react';
import { useFreightEscrow } from '../../../lib/hooks/useFreightEscrow';
import { useAccount } from 'wagmi';
import { keccak256, toUtf8Bytes } from 'ethers';

export default function ShipperDashboard() {
  const { address } = useAccount();
  const { createFreight, fund } = useFreightEscrow();
  const [loading, setLoading] = useState(false);

  const handleCreateFreight = async () => {
    if (!address) return alert("Connect wallet first");

    setLoading(true);
    try {
      const id = `FR-${Date.now()}`;
      const pickupCode = "1234";
      const deliveryCode = "5678";

      const pickupHash = keccak256(toUtf8Bytes(pickupCode)) as `0x${string}`;
      const deliveryHash = keccak256(toUtf8Bytes(deliveryCode)) as `0x${string}`;
      const value = 1000000000000000000n; // 1 MATIC mock value

      const tx = await createFreight(id, pickupHash, deliveryHash, value);
      alert(`Freight Created! Tx: ${tx}`);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">پنل فرستنده (Shipper)</h1>

      <div className="bg-white shadow p-6 rounded-lg border mb-8 text-black">
        <h2 className="text-xl font-semibold mb-4 text-black">ایجاد بارنامه جدید</h2>
        <p className="text-gray-600 mb-4">برای ثبت یک محموله جدید در سیستم قرارداد هوشمند، کلیک کنید.</p>
        <button
          onClick={handleCreateFreight}
          disabled={loading || !address}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'در حال ثبت...' : 'ثبت بارنامه جدید (Meta-Tx)'}
        </button>
      </div>

      <div className="bg-white shadow p-6 rounded-lg border text-black">
        <h2 className="text-xl font-semibold mb-4">لیست بارهای من</h2>
        <p className="text-gray-500">لیست بارها از بک‌اند فراخوانی می‌شود...</p>
      </div>
    </main>
  );
}
