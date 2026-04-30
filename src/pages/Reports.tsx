import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWS } from '../contexts/WebSocketContext';
import Sidebar from '../components/Sidebar';
import type { ProductCategory, Transaction } from '../types';
import {
  regionCurrency, currencySymbols,
  productCategoryLabels, bankCommissionRates, TAX_RATE,
} from '../types';

type Period = 'daily' | 'monthly';
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function fmt(n: number, symbol: string) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + symbol;
}

function pct(n: number) {
  return n.toFixed(1) + '%';
}

// ── Summary Row ──────────────────────────────────────────────────────
function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between py-2">
      <span className={`text-sm ${bold ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-bold text-gray-900 text-lg' : 'font-medium text-gray-700'}`}>{value}</span>
    </div>
  );
}

// ── Bar Chart (pure CSS) ─────────────────────────────────────────────
function BarChart({ data, labels, symbol, highlight }: {
  data: number[]; labels: string[]; symbol: string; highlight?: number;
}) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-40">
      {data.map((val, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] text-gray-400">
            {val > 0 ? fmt(val, symbol) : ''}
          </span>
          <div
            className={`w-full rounded-t transition-all ${
              highlight === i ? 'bg-blue-500' : val > 0 ? 'bg-gray-300' : 'bg-gray-100'
            }`}
            style={{ height: `${Math.max((val / max) * 100, 2)}%`, minHeight: '2px' }}
          />
          <span className="text-[10px] text-gray-500">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ── Client Ratio Bar ─────────────────────────────────────────────────
function ClientBar({ newPct, returnPct }: { newPct: number; returnPct: number }) {
  return (
    <div className="flex gap-2 h-24 items-end">
      <div className="flex-1 flex flex-col items-center gap-1">
        <span className="text-sm font-semibold text-blue-500">{pct(newPct)}</span>
        <div className="w-full bg-blue-400 rounded-t" style={{ height: `${Math.max(newPct, 5)}%` }} />
        <span className="text-xs text-gray-500">New</span>
      </div>
      <div className="flex-1 flex flex-col items-center gap-1">
        <span className="text-sm font-semibold text-gray-400">{pct(returnPct)}</span>
        <div className="w-full bg-gray-300 rounded-t" style={{ height: `${Math.max(returnPct, 5)}%` }} />
        <span className="text-xs text-gray-500">Returning</span>
      </div>
    </div>
  );
}

// ── Main Report ──────────────────────────────────────────────────────
export default function Reports() {
  const { boothId } = useParams<{ boothId: string }>();
  const navigate = useNavigate();
  const { transactions, booths } = useWS();
  const [period, setPeriod] = useState<Period>('daily');

  const booth = booths.find(b => b.boothId === boothId);

  if (!booth) {
    return (
      <div className="flex min-h-screen bg-[#F9FAFB]">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 text-lg">Location not found</p>
            <button onClick={() => navigate('/')} className="mt-4 text-sm text-blue-500 hover:underline cursor-pointer">
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  const currency = regionCurrency[booth.region];
  const symbol = currencySymbols[currency];

  return <ReportContent booth={booth} symbol={symbol} period={period} setPeriod={setPeriod} transactions={transactions} navigate={navigate} />;
}

function ReportContent({ booth, symbol, period, setPeriod, transactions, navigate }: {
  booth: { boothId: string; displayName: string; region: string; online: boolean };
  symbol: string;
  period: Period;
  setPeriod: (p: Period) => void;
  transactions: Transaction[];
  navigate: (path: string) => void;
}) {
  // Filter transactions for this booth & period
  const filtered = useMemo(() => {
    const now = new Date();
    return transactions.filter(tx => {
      if (tx.boothId !== booth.boothId) return false;
      const txDate = new Date(tx.timestamp);
      if (period === 'daily') {
        return txDate.toDateString() === now.toDateString();
      } else {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      }
    });
  }, [transactions, booth.boothId, period]);

  // Compute report
  const report = useMemo(() => {
    const grossSales = filtered.reduce((s, tx) => s + tx.amount, 0);
    const tax = grossSales * TAX_RATE;
    const netSales = grossSales - tax;

    const feesByType = { eu_debit: 0, eu_commercial: 0, non_eu: 0 };
    filtered.forEach(tx => {
      const rate = bankCommissionRates[tx.cardType];
      feesByType[tx.cardType] += rate.fixedFee + (tx.amount * rate.rate);
    });
    const totalFees = Object.values(feesByType).reduce((s, f) => s + f, 0);
    const totalCollected = grossSales - totalFees;

    // Sales by category
    const byCategory: Record<string, { count: number; revenue: number }> = {};
    const allCatKeys = Object.keys(productCategoryLabels) as ProductCategory[];
    allCatKeys.forEach(k => { byCategory[k] = { count: 0, revenue: 0 }; });
    filtered.forEach(tx => {
      if (byCategory[tx.category]) {
        byCategory[tx.category].count++;
        byCategory[tx.category].revenue += tx.amount;
      }
    });

    let topCategory = allCatKeys[0];
    let topCategoryRevenue = 0;
    allCatKeys.forEach(k => {
      if (byCategory[k].revenue > topCategoryRevenue) {
        topCategory = k;
        topCategoryRevenue = byCategory[k].revenue;
      }
    });

    // Sales by hour (0-23)
    const byHour = new Array(24).fill(0);
    filtered.forEach(tx => { byHour[new Date(tx.timestamp).getHours()] += tx.amount; });

    // Sales by day of week (0=Mon, 6=Sun)
    const byDow = new Array(7).fill(0);
    filtered.forEach(tx => {
      const d = new Date(tx.timestamp).getDay();
      byDow[d === 0 ? 6 : d - 1] += tx.amount;
    });

    // Client stats
    const periodsCards = new Set(filtered.map(tx => tx.cardHash).filter(Boolean));
    const allBoothTx = transactions.filter(tx => tx.boothId === booth.boothId);
    let returningCount = 0;
    periodsCards.forEach(card => {
      const appearedBefore = allBoothTx.some(tx =>
        tx.cardHash === card && !filtered.some(f => f.id === tx.id)
      );
      if (appearedBefore) returningCount++;
    });
    const totalClients = periodsCards.size;
    const newClients = totalClients - returningCount;

    return {
      grossSales, tax, netSales, totalFees, totalCollected,
      totalSessions: filtered.length,
      byCategory, topCategory, topCategoryRevenue,
      byHour, byDow,
      totalClients, newClients, returningClients: returningCount,
      feesByType,
    };
  }, [filtered, transactions, booth.boothId]);

  const now = new Date();
  const currentDow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const currentHour = now.getHours();

  const dateLabel = period === 'daily'
    ? now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar />

      <main className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{booth.displayName}</h2>
              <p className="text-sm text-gray-400">{dateLabel}</p>
            </div>
            <span className={`w-2.5 h-2.5 rounded-full ${booth.online ? 'bg-green-500 animate-pulse-dot' : 'bg-red-500'}`} />
          </div>

          {/* Period toggle */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-100">
            {(['daily', 'monthly'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer capitalize ${
                  period === p
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Summary</h3>
            <div className="divide-y divide-gray-50">
              <SummaryRow label="Gross Sales" value={fmt(report.grossSales, symbol)} bold />
              <SummaryRow label={`Tax (${(TAX_RATE * 100).toFixed(1)}%)`} value={fmt(report.tax, symbol)} />
              <SummaryRow label="Net Sales" value={fmt(report.netSales, symbol)} bold />
              <div className="pt-2 mt-2">
                <SummaryRow label="Bank Fees" value={fmt(report.totalFees, symbol)} />
                <div className="pl-4 space-y-1">
                  {Object.entries(report.feesByType).map(([type, amount]) => (
                    <div key={type} className="flex justify-between text-xs text-gray-400">
                      <span>{bankCommissionRates[type as keyof typeof bankCommissionRates].label} ({(bankCommissionRates[type as keyof typeof bankCommissionRates].rate * 100).toFixed(1)}%)</span>
                      <span>{fmt(amount, symbol)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <SummaryRow label="Total Collected" value={fmt(report.totalCollected, symbol)} bold />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sales by Category</h3>
            <div className="flex items-center gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{report.totalSessions}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(report.grossSales, symbol)}</p>
              </div>
            </div>
            {report.totalSessions > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Top Category</p>
                <p className="text-base font-semibold text-gray-900">{productCategoryLabels[report.topCategory]}</p>
                <p className="text-sm text-gray-500">{fmt(report.topCategoryRevenue, symbol)}</p>
              </div>
            )}
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {(Object.keys(productCategoryLabels) as ProductCategory[]).map(key => {
                const cat = report.byCategory[key];
                if (!cat) return null;
                return (
                  <div key={key} className="flex justify-between text-sm py-1">
                    <span className="text-gray-500">
                      {productCategoryLabels[key]}
                      {cat.count > 0 && <span className="text-gray-300 ml-1">x{cat.count}</span>}
                    </span>
                    <span className="font-medium text-gray-700">{fmt(cat.revenue, symbol)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Sales by Hour</h3>
            <BarChart
              data={report.byHour}
              labels={Array.from({ length: 24 }, (_, i) => i.toString())}
              symbol={symbol}
              highlight={period === 'daily' ? currentHour : undefined}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
              {period === 'daily' ? 'Today vs Last 7 Days' : 'Sales by Day of Week'}
            </h3>
            <BarChart
              data={report.byDow}
              labels={dayLabels}
              symbol={symbol}
              highlight={period === 'daily' ? currentDow : undefined}
            />
          </div>
        </div>

        {/* Clients */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Clients</h3>
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Clients Served</p>
              <p className="text-3xl font-bold text-gray-900">{report.totalClients}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">New Clients</p>
              <p className="text-3xl font-bold text-gray-900">{report.newClients}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Returning Clients</p>
              <p className="text-3xl font-bold text-gray-900">{report.returningClients}</p>
            </div>
          </div>
          {report.totalClients > 0 && (
            <ClientBar
              newPct={(report.newClients / report.totalClients) * 100}
              returnPct={(report.returningClients / report.totalClients) * 100}
            />
          )}
        </div>
      </main>
    </div>
  );
}
