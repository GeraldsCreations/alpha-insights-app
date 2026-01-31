// DATA_MODELS.ts - TypeScript Interfaces for Alpha Insights

/**
 * User Model
 */
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  watchlist: string[];  // Array of ticker symbols
  notificationPreferences: NotificationPreferences;
  fcmToken?: string;
  
  // Freemium quota system
  plan: 'free' | 'premium';
  customReportsRemaining: number;
  customReportsResetDate: Date;
  totalCustomReports: number;  // lifetime counter
}

export interface NotificationPreferences {
  watchlistUpdates: boolean;
  highConfidence: boolean;  // 8+ confidence alerts
  priceAlerts: boolean;
}

/**
 * Analysis Post Model
 */
export interface AnalysisPost {
  id: string;
  title: string;
  heroImage: string;  // Firebase Storage URL
  description: string;
  timestamp: Date;
  assetType: AssetType;
  ticker: string;
  
  // Full analysis content
  content: AnalysisContent;
  
  // Trading recommendation
  recommendation: RecommendationType;
  entry: number;
  stop: number;
  target: number;
  riskRewardRatio: number;
  confidenceLevel: number;  // 1-10
  
  // Metadata
  authorId: string;
  views: number;
  bookmarks: number;
  
  // Indexing fields
  searchTerms: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalysisContent {
  charts: string[];  // Array of chart image URLs
  technicalAnalysis: string;  // Rich text (HTML/Markdown)
  newsSummary: string;
  detailedAnalysis: string;
  verdicts?: string;  // Analysis verdicts/conclusion
  priceAnalysis?: string;  // Price analysis section
}

export type AssetType = 'crypto' | 'stock';
export type RecommendationType = 'LONG' | 'SHORT' | 'NO_TRADE';

/**
 * Price Alert Model
 */
export interface PriceAlert {
  id: string;
  userId: string;
  ticker: string;
  alertType: AlertType;
  targetPrice: number;
  currentPrice: number;
  postId: string;  // Reference to analysis post
  triggered: boolean;
  createdAt: Date;
}

export type AlertType = 'ENTRY' | 'STOP' | 'TARGET';

export interface PriceAlertInput {
  ticker: string;
  alertType: AlertType;
  targetPrice: number;
  postId: string;
}

/**
 * Performance Tracking Model
 */
export interface PerformanceRecord {
  id: string;
  postId: string;
  ticker: string;
  recommendation: 'LONG' | 'SHORT';
  entry: number;
  stop: number;
  target: number;
  
  // Outcome tracking
  status: TradeStatus;
  actualReturn?: number;
  closedAt?: Date;
  
  createdAt: Date;
}

export type TradeStatus = 'OPEN' | 'HIT_TARGET' | 'HIT_STOP' | 'EXPIRED';

export interface PerformanceStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  openTrades: number;
  winRate: number;  // Percentage
  averageRR: number;  // Average risk/reward ratio
  totalReturns: number;  // Percentage
  bestTrade: number;  // Percentage
  worstTrade: number;  // Percentage
}

/**
 * Feed Filter Options
 */
export interface FeedFilters {
  assetType?: AssetType;
  recommendation?: RecommendationType;
  ticker?: string;
  minConfidence?: number;
  startAfter?: Date;
  limit?: number;
}

/**
 * Search Result Model
 */
export interface SearchResult {
  posts: AnalysisPost[];
  total: number;
  hasMore: boolean;
}

/**
 * Bookmark Model
 */
export interface Bookmark {
  userId: string;
  postId: string;
  createdAt: Date;
}

/**
 * Custom Report Request Model
 */
export interface CustomReportRequest {
  id: string;
  userId: string;
  ticker: string;
  assetType: 'crypto' | 'stock';
  status: 'pending' | 'processing' | 'complete' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  reportId?: string;  // Reference to published AnalysisPost
  error?: string;
}

/**
 * FCM Notification Payload
 */
export interface NotificationPayload {
  title: string;
  body: string;
  data?: {
    postId?: string;
    ticker?: string;
    alertId?: string;
    type: 'NEW_POST' | 'WATCHLIST_UPDATE' | 'PRICE_ALERT' | 'HIGH_CONFIDENCE';
  };
}

/**
 * Share Options
 */
export interface ShareOptions {
  postId: string;
  format: 'PDF' | 'LINK';
  includeCharts: boolean;
}

/**
 * API Response Models
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Pagination Model
 */
export interface PaginationOptions {
  limit: number;
  startAfter?: any;
  orderBy: string;
  direction: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  lastVisible: any;
  hasMore: boolean;
  total?: number;
}

/**
 * Live Price Update Model
 */
export interface LivePrice {
  ticker: string;
  price: number;
  change: number;  // Percentage
  volume: number;
  timestamp: Date;
}

/**
 * Chart Data Model
 */
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  borderColor?: string;
  backgroundColor?: string;
  fill?: boolean;
}

/**
 * Theme Preference
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

export interface UserPreferences {
  theme: ThemeMode;
  notifications: NotificationPreferences;
  defaultAssetFilter?: AssetType;
}

/**
 * Form Models
 */
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

export interface ResetPasswordForm {
  email: string;
}

/**
 * Component State Models
 */
export interface HomePageState {
  posts: AnalysisPost[];
  loading: boolean;
  error: string | null;
  filters: FeedFilters;
  hasMore: boolean;
}

export interface AnalysisDetailState {
  post: AnalysisPost | null;
  loading: boolean;
  error: string | null;
  isBookmarked: boolean;
  isInWatchlist: boolean;
}

/**
 * Firebase Timestamp Converter
 */
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

/**
 * Utility Types
 */
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncData<T> = {
  data: Nullable<T>;
  loading: boolean;
  error: Nullable<string>;
};
