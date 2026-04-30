interface RevenueCardProps {
  label: string;
  amount: number;
  symbol: string;
  icon: React.ReactNode;
}

export default function RevenueCard({ label, amount, symbol, icon }: RevenueCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500">
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {symbol}
      </p>
    </div>
  );
}
