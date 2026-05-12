import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Booth, ProductCategory } from '../types';
import { productCategoryLabels } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface ShopCardProps {
  booth: Booth;
  symbol: string;
}

const categoryKeys = Object.keys(productCategoryLabels) as ProductCategory[];

const RELAY_HTTP = 'https://capturism-relay.onrender.com';

export default function ShopCard({ booth, symbol }: ShopCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const navigate = useNavigate();
  const { token } = useAuth();

  const handleExportSubscribers = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (exporting || !token) return;
    setExporting(true);
    try {
      const url = `${RELAY_HTTP}/api/admin/subscriptions.xlsx?boothId=${encodeURIComponent(booth.boothId)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const date = new Date().toISOString().slice(0, 10);
      const filename = `capturism-subscribers-${booth.boothId}-${date}.xlsx`;
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch (err) {
      alert((err as Error).message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' ' + symbol;

  return (
    <div
      onClick={() => navigate(`/reports/${booth.boothId}`)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col cursor-pointer hover:shadow-md hover:border-gray-200 transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-900">{booth.displayName}</h3>
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${booth.online ? 'bg-green-500 animate-pulse-dot' : 'bg-red-500'}`} />
          <span className={`text-xs font-medium ${booth.online ? 'text-green-600' : 'text-red-500'}`}>
            {booth.online ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total revenue</span>
          <span className="font-semibold text-gray-900">{fmt(booth.stats.totalRevenue)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Monthly revenue</span>
          <span className="font-medium text-gray-700">{fmt(booth.stats.monthlyRevenue)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Weekly revenue</span>
          <span className="font-medium text-gray-700">{fmt(booth.stats.weeklyRevenue)}</span>
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer mb-2"
      >
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Detailed statistics
      </button>

      {expanded && (
        <div className="space-y-1.5 pl-5 border-l-2 border-gray-100">
          {categoryKeys.map(key => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-gray-400">{productCategoryLabels[key]}</span>
              <span className="text-gray-600">{fmt(booth.stats.detailed[key])}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleExportSubscribers}
        disabled={exporting}
        className="mt-3 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-wait rounded-lg border border-gray-200 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        {exporting ? 'Preparing…' : 'Export subscribers (XLSX)'}
      </button>

      <p className="text-xs text-gray-300 mt-3 text-center">Click to view full report</p>
    </div>
  );
}
