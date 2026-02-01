import { Injectable } from '@angular/core';
import { Analytics, logEvent, setUserId, setUserProperties } from '@angular/fire/analytics';
import { environment } from '../../../environments/environment';

export interface AnalyticsEvent {
  name: string;
  params?: { [key: string]: any };
}

/**
 * Analytics Service
 * 
 * Wraps Firebase Analytics with type-safe event tracking
 * Automatically disabled in development when debug mode is off
 */
@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private enabled: boolean;

  constructor(private analytics: Analytics) {
    this.enabled = environment.analytics.enabled;
  }

  /**
   * Track page view
   */
  trackPageView(pageName: string, params?: { [key: string]: any }) {
    if (!this.enabled) return;

    logEvent(this.analytics, 'page_view', {
      page_name: pageName,
      page_location: window.location.href,
      ...params
    });
  }

  /**
   * Track user action/event
   */
  trackEvent(eventName: string, params?: { [key: string]: any }) {
    if (!this.enabled) return;

    logEvent(this.analytics, eventName, params);
  }

  /**
   * Track search
   */
  trackSearch(searchTerm: string, resultCount?: number) {
    if (!this.enabled) return;

    logEvent(this.analytics, 'search', {
      search_term: searchTerm,
      result_count: resultCount
    });
  }

  /**
   * Track custom report request
   */
  trackCustomReportRequest(ticker: string, assetType: string) {
    if (!this.enabled) return;

    logEvent(this.analytics, 'custom_report_request', {
      ticker,
      asset_type: assetType
    });
  }

  /**
   * Track bookmark action
   */
  trackBookmark(action: 'add' | 'remove', postId: string, ticker: string) {
    if (!this.enabled) return;

    logEvent(this.analytics, 'bookmark_action', {
      action,
      post_id: postId,
      ticker
    });
  }

  /**
   * Track watchlist action
   */
  trackWatchlist(action: 'add' | 'remove', ticker: string) {
    if (!this.enabled) return;

    logEvent(this.analytics, 'watchlist_action', {
      action,
      ticker
    });
  }

  /**
   * Track share action
   */
  trackShare(method: string, postId: string, ticker: string) {
    if (!this.enabled) return;

    logEvent(this.analytics, 'share', {
      method,
      content_type: 'analysis_post',
      content_id: postId,
      ticker
    });
  }

  /**
   * Track price alert creation
   */
  trackPriceAlert(ticker: string, alertType: string, targetPrice: number) {
    if (!this.enabled) return;

    logEvent(this.analytics, 'price_alert_created', {
      ticker,
      alert_type: alertType,
      target_price: targetPrice
    });
  }

  /**
   * Track analysis view
   */
  trackAnalysisView(postId: string, ticker: string, recommendation: string) {
    if (!this.enabled) return;

    logEvent(this.analytics, 'view_item', {
      item_id: postId,
      item_name: ticker,
      item_category: 'analysis_post',
      recommendation
    });
  }

  /**
   * Track filter usage
   */
  trackFilter(filterType: string, filterValue: string) {
    if (!this.enabled) return;

    logEvent(this.analytics, 'filter_applied', {
      filter_type: filterType,
      filter_value: filterValue
    });
  }

  /**
   * Track authentication events
   */
  trackAuth(action: 'login' | 'signup' | 'logout', method?: string) {
    if (!this.enabled) return;

    logEvent(this.analytics, action, {
      method: method || 'email'
    });
  }

  /**
   * Track errors
   */
  trackError(error: string, fatal: boolean = false) {
    if (!this.enabled) return;

    logEvent(this.analytics, 'exception', {
      description: error,
      fatal
    });
  }

  /**
   * Set user ID for tracking
   */
  setUser(userId: string) {
    if (!this.enabled) return;

    setUserId(this.analytics, userId);
  }

  /**
   * Set user properties
   */
  setUserProperty(properties: { [key: string]: any }) {
    if (!this.enabled) return;

    setUserProperties(this.analytics, properties);
  }

  /**
   * Track engagement time (automatic via Firebase)
   */
  trackEngagement(params?: { [key: string]: any }) {
    if (!this.enabled) return;

    logEvent(this.analytics, 'user_engagement', params);
  }

  /**
   * Track feature usage
   */
  trackFeature(featureName: string, action: string, params?: { [key: string]: any }) {
    if (!this.enabled) return;

    logEvent(this.analytics, 'feature_usage', {
      feature_name: featureName,
      action,
      ...params
    });
  }

  /**
   * Track tutorial/onboarding progress
   */
  trackTutorial(action: 'begin' | 'complete' | 'skip', step?: string) {
    if (!this.enabled) return;

    const eventName = action === 'begin' ? 'tutorial_begin' : 'tutorial_complete';
    logEvent(this.analytics, eventName, {
      step
    });
  }

  /**
   * Track app update/version
   */
  trackAppVersion(version: string) {
    if (!this.enabled) return;

    this.setUserProperty({
      app_version: version
    });
  }
}
