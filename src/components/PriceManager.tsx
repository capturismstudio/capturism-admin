import { useState } from 'react';
import { useWS } from '../contexts/WebSocketContext';
import type { Region } from '../types';
import { regionCurrency, currencySymbols } from '../types';

interface PriceManagerProps {
  activeRegion: Region;
}

interface PriceField {
  key: string;
  label: string;
  description: string;
  defaultValue: Record<Region, number>;
}

const priceFields: PriceField[] = [
  {
    key: 'basePrice',
    label: 'Base Price',
    description: 'Photos & ID Photos',
    defaultValue: { FR: 12, KR: 15000, US: 15, UEA: 25 },
  },
  {
    key: 'premiumPrice',
    label: 'Premium Price',
    description: 'Calendars & Postcards',
    defaultValue: { FR: 15, KR: 20000, US: 20, UEA: 35 },
  },
];

export default function PriceManager({ activeRegion }: PriceManagerProps) {
  const { sendCommand } = useWS();
  const [values, setValues] = useState<Record<string, Record<Region, string>>>({
    basePrice: { FR: '12', KR: '15000', US: '15', UEA: '25' },
    premiumPrice: { FR: '15', KR: '20000', US: '20', UEA: '35' },
  });
  const [flashing, setFlashing] = useState<Record<string, boolean>>({});

  const currency = regionCurrency[activeRegion];
  const symbol = currencySymbols[currency];

  const handleUpdate = (key: string) => {
    const numVal = parseFloat(values[key][activeRegion]);
    if (isNaN(numVal)) return;

    sendCommand('admin:update_price', { [key]: numVal, region: activeRegion });

    setFlashing(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setFlashing(prev => ({ ...prev, [key]: false }));
    }, 500);
  };

  const handleChange = (key: string, val: string) => {
    setValues(prev => ({
      ...prev,
      [key]: { ...prev[key], [activeRegion]: val },
    }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Price Management</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {priceFields.map(field => (
          <div key={field.key} className="flex flex-col gap-2">
            <div>
              <label className="text-sm font-medium text-gray-700">{field.label}</label>
              <p className="text-xs text-gray-400">{field.description}</p>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={values[field.key][activeRegion]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                  min="0"
                  step="0.5"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  {symbol}
                </span>
              </div>
              <button
                onClick={() => handleUpdate(field.key)}
                className={`px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-all cursor-pointer ${
                  flashing[field.key]
                    ? 'animate-flash-green bg-green-500'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {flashing[field.key] ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  'Update'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
