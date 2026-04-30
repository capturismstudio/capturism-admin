import { useState } from 'react';
import { useWS } from '../contexts/WebSocketContext';
import Sidebar from '../components/Sidebar';
import RevenueCard from '../components/RevenueCard';
import PriceManager from '../components/PriceManager';
import ShopCard from '../components/ShopCard';
import type { Region } from '../types';
import { regionOptions, regionCurrency, currencySymbols } from '../types';

function TotalIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
  );
}

function MonthIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function WeekIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function DayIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

export default function Dashboard() {
  const { booths } = useWS();
  const [activeRegion, setActiveRegion] = useState<Region>('FR');

  const currency = regionCurrency[activeRegion];
  const symbol = currencySymbols[currency];
  const filteredBooths = booths.filter(b => b.region === activeRegion);

  const revenueData = {
    totalRevenue: filteredBooths.reduce((s, b) => s + b.stats.totalRevenue, 0),
    monthlyRevenue: filteredBooths.reduce((s, b) => s + b.stats.monthlyRevenue, 0),
    weeklyRevenue: filteredBooths.reduce((s, b) => s + b.stats.weeklyRevenue, 0),
    dailyRevenue: filteredBooths.reduce((s, b) => s + b.stats.dailyRevenue, 0),
  };

  const regionInfo = regionOptions.find(r => r.value === activeRegion)!;

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar />

      <main className="flex-1 p-8 overflow-auto">
        {/* Header with region bar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>

          <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-100">
            {regionOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setActiveRegion(opt.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer flex items-center gap-2 ${
                  activeRegion === opt.value
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{opt.flag}</span>
                <span>{opt.value}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <RevenueCard label="Total Revenue" amount={revenueData.totalRevenue} symbol={symbol} icon={<TotalIcon />} />
          <RevenueCard label="Monthly Revenue" amount={revenueData.monthlyRevenue} symbol={symbol} icon={<MonthIcon />} />
          <RevenueCard label="Weekly Revenue" amount={revenueData.weeklyRevenue} symbol={symbol} icon={<WeekIcon />} />
          <RevenueCard label="Daily Revenue" amount={revenueData.dailyRevenue} symbol={symbol} icon={<DayIcon />} />
        </div>

        {/* Price Management */}
        <div className="mb-6">
          <PriceManager activeRegion={activeRegion} />
        </div>

        {/* Shop Cards */}
        {filteredBooths.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredBooths.map(booth => (
              <ShopCard key={booth.boothId} booth={booth} symbol={symbol} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">No locations in {regionInfo.flag} {regionInfo.label} yet</p>
            <p className="text-gray-300 text-xs mt-1">Locations will appear here when a booth is registered for this region</p>
          </div>
        )}
      </main>
    </div>
  );
}
