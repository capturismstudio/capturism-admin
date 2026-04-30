import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Booth, ProductCategory } from '../types';
import { productCategoryLabels } from '../types';

interface ShopCardProps {
  booth: Booth;
  symbol: string;
}

const categoryKeys = Object.keys(productCategoryLabels) as ProductCategory[];

export default function ShopCard({ booth, symbol }: ShopCardProps) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

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

      <p className="text-xs text-gray-300 mt-3 text-center">Click to view full report</p>
    </div>
  );
}
