// ── Regions & Currencies ─────────────────────────────────────────────

export type Region = 'FR' | 'KR' | 'US' | 'UEA';
export type Currency = 'EUR' | 'KRW' | 'USD' | 'AED';

export const regionCurrency: Record<Region, Currency> = {
  FR: 'EUR',
  KR: 'KRW',
  US: 'USD',
  UEA: 'AED',
};

export const currencySymbols: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
  KRW: '₩',
  AED: 'AED',
};

export const regionOptions: { value: Region; label: string; flag: string; currency: Currency }[] = [
  { value: 'FR', label: 'France', flag: '🇫🇷', currency: 'EUR' },
  { value: 'KR', label: 'Korea', flag: '🇰🇷', currency: 'KRW' },
  { value: 'US', label: 'United States', flag: '🇺🇸', currency: 'USD' },
  { value: 'UEA', label: 'UAE', flag: '🇦🇪', currency: 'AED' },
];

// ── Booth Types ──────────────────────────────────────────────────────

export type ProductCategory =
  | 'photoColor' | 'photoImage' | 'photoCity'
  | 'calendarColor' | 'calendarImage' | 'calendarCity'
  | 'postcardColor' | 'postcardImage' | 'postcardCity'
  | 'idPhoto';

export const productCategoryLabels: Record<ProductCategory, string> = {
  photoColor: 'Photo Color',
  photoImage: 'Photo Image',
  photoCity: 'Photo City',
  calendarColor: 'Calendar Color',
  calendarImage: 'Calendar Image',
  calendarCity: 'Calendar City',
  postcardColor: 'Postcard Color',
  postcardImage: 'Postcard Image',
  postcardCity: 'Postcard City',
  idPhoto: 'ID Photo',
};

export type BoothDetailedStats = Record<ProductCategory, number>;

export interface BoothStats {
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  dailyRevenue: number;
  detailed: BoothDetailedStats;
}

export interface Booth {
  boothId: string;
  displayName: string;
  region: Region;
  online: boolean;
  lastSeen: string | null;
  stats: BoothStats;
}

// ── Transaction / Report Types ───────────────────────────────────────

export type CardType = 'eu_debit' | 'eu_commercial' | 'non_eu';

export type CompReason = 'admin_bypass' | 'loyalty_reward';

export const compReasonLabels: Record<CompReason, string> = {
  admin_bypass: 'Admin Bypass',
  loyalty_reward: 'Loyalty Reward',
};

export interface Transaction {
  id: string;
  timestamp: string;
  amount: number;
  category: ProductCategory;
  cardType: CardType;
  cardHash: string; // anonymized card fingerprint for new/returning detection
  boothId: string;
  // When set, the session was given for free (no money collected).
  // Convention: `amount` still holds the would-have-paid price, so we can later
  // report the monetary value of comps (e.g. "€120 given away as loyalty rewards")
  // without a data migration. Reports exclude these from Gross Sales / Bank Fees.
  compReason?: CompReason;
}

// LCL bank commission rates
export const bankCommissionRates: Record<CardType, { label: string; fixedFee: number; rate: number }> = {
  eu_debit: { label: 'EU Debit/Prepaid/Credit', fixedFee: 0, rate: 0.003 },
  eu_commercial: { label: 'EU Commercial', fixedFee: 0, rate: 0.02 },
  non_eu: { label: 'Non-EU', fixedFee: 0, rate: 0.005 },
};

export const TAX_RATE = 0.055; // 5.5% for artwork/photography

export interface DailyReport {
  date: string;
  grossSales: number;
  tax: number;
  netSales: number;
  bankFees: number;
  totalCollected: number;
  totalSessions: number;
  salesByCategory: BoothDetailedStats;
  salesByHour: number[]; // 24 entries (0-23h)
  salesByDayOfWeek: number[]; // 7 entries (Mon-Sun)
  newClients: number;
  returningClients: number;
  totalClients: number;
  transactions: Transaction[];
}

// ── WebSocket ────────────────────────────────────────────────────────

export interface RelayMessage {
  type: string;
  payload: any;
  timestamp: string;
  boothId?: string;
}
