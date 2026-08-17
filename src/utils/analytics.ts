import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ANALYTICS_CONFIG } from '../constants/analyticsConfig';

interface QueuedEvent {
  event: string;
  distinct_id: string;
  properties: Record<string, any>;
  timestamp: string;
}

interface AcademicTraits {
  college?: string;
  collegeShort?: string;
  programme?: string;
  branch?: string;
  semester?: number;
  targetAttendance?: number;
}

const STORAGE_KEYS = {
  DISTINCT_ID: '@attendly_distinct_id',
  OFFLINE_QUEUE: '@attendly_analytics_queue',
  USER_TRAITS: '@attendly_analytics_traits',
};

class TelemetryEngine {
  private distinctId: string | null = null;
  private userTraits: Record<string, any> = {};
  private eventQueue: QueuedEvent[] = [];
  private isInitialized = false;
  private isFlushing = false;
  private flushTimer: any = null;

  /**
   * Initializes anonymous client identity and flushes queued offline events.
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 1. Retrieve or generate anonymous client UUID
      let storedId = await AsyncStorage.getItem(STORAGE_KEYS.DISTINCT_ID);
      if (!storedId) {
        storedId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await AsyncStorage.setItem(STORAGE_KEYS.DISTINCT_ID, storedId);
      }
      this.distinctId = storedId;

      // 2. Load stored academic traits
      const storedTraits = await AsyncStorage.getItem(STORAGE_KEYS.USER_TRAITS);
      if (storedTraits) {
        try {
          this.userTraits = JSON.parse(storedTraits);
        } catch {
          this.userTraits = {};
        }
      }

      // 3. Load offline event queue
      const storedQueue = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      if (storedQueue) {
        try {
          this.eventQueue = JSON.parse(storedQueue);
        } catch {
          this.eventQueue = [];
        }
      }

      this.isInitialized = true;

      if (ANALYTICS_CONFIG.ENABLE_DEBUG_LOGGING) {
        console.log(`🚀 [Analytics] Initialized (ID: ${this.distinctId}, Queued: ${this.eventQueue.length})`);
      }

      // 4. Start periodic flush timer
      this.startFlushTimer();

      // 5. Initial flush
      if (this.eventQueue.length > 0) {
        this.flush();
      }
    } catch (err) {
      console.warn('Analytics init error (non-fatal):', err);
    }
  }

  /**
   * Identifies user with anonymous academic traits (College, Branch, Semester, Target).
   * Note: No PII (names, roll numbers, personal notes) is ever recorded.
   */
  async identify(traits: AcademicTraits): Promise<void> {
    try {
      this.userTraits = {
        ...this.userTraits,
        ...traits,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.USER_TRAITS, JSON.stringify(this.userTraits));

      await this.track('$set', {
        $set: this.userTraits,
      });
    } catch (err) {
      console.warn('Analytics identify error (non-fatal):', err);
    }
  }

  /**
   * Tracks a screen view event.
   */
  async screen(screenName: string, properties: Record<string, any> = {}): Promise<void> {
    await this.track('$pageview', {
      $screen_name: screenName,
      ...properties,
    });
  }

  /**
   * Tracks a custom action or lifecycle event.
   */
  async track(event: string, properties: Record<string, any> = {}): Promise<void> {
    try {
      if (!this.distinctId) {
        await this.init();
      }

      const clientDistinctId = this.distinctId || `anon_${Date.now()}`;

      const payloadProperties = {
        token: ANALYTICS_CONFIG.POSTHOG_API_KEY,
        distinct_id: clientDistinctId,
        $lib: 'attendly-mobile',
        $os: Platform.OS,
        $os_version: Platform.Version,
        ...this.userTraits,
        ...properties,
      };

      const queuedEvent: QueuedEvent = {
        event,
        distinct_id: clientDistinctId,
        properties: payloadProperties,
        timestamp: new Date().toISOString(),
      };

      // Add to in-memory queue
      this.eventQueue.push(queuedEvent);

      // Keep queue within size limit
      if (this.eventQueue.length > ANALYTICS_CONFIG.MAX_OFFLINE_QUEUE_SIZE) {
        this.eventQueue = this.eventQueue.slice(-ANALYTICS_CONFIG.MAX_OFFLINE_QUEUE_SIZE);
      }

      // Persist offline queue
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(this.eventQueue));

      if (ANALYTICS_CONFIG.ENABLE_DEBUG_LOGGING) {
        console.log(`📊 [Analytics Track] "${event}"`, properties);
      }

      // If online and API key exists, dispatch
      if (ANALYTICS_CONFIG.POSTHOG_API_KEY) {
        this.flush();
      }
    } catch (err) {
      console.warn('Analytics track error (non-fatal):', err);
    }
  }

  /**
   * Flushes queued events to PostHog ingestion endpoint.
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.eventQueue.length === 0) return;
    if (!ANALYTICS_CONFIG.POSTHOG_API_KEY) return;

    this.isFlushing = true;
    const batchToSend = [...this.eventQueue];

    try {
      const formattedBatch = batchToSend.map(item => ({
        event: item.event,
        distinct_id: item.distinct_id,
        properties: {
          token: ANALYTICS_CONFIG.POSTHOG_API_KEY,
          distinct_id: item.distinct_id,
          ...item.properties,
        },
        timestamp: item.timestamp,
      }));

      const endpoint = `${ANALYTICS_CONFIG.POSTHOG_HOST}/batch/`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: ANALYTICS_CONFIG.POSTHOG_API_KEY,
          batch: formattedBatch,
        }),
      });

      if (response.ok) {
        // Remove sent events from queue
        this.eventQueue = this.eventQueue.filter(
          item => !batchToSend.some(sent => sent.timestamp === item.timestamp && sent.event === item.event)
        );
        await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(this.eventQueue));

        if (ANALYTICS_CONFIG.ENABLE_DEBUG_LOGGING) {
          console.log(`✅ [Analytics Flush] Dispatched ${batchToSend.length} events to PostHog`);
        }
      } else {
        const errorText = await response.text();
        console.warn(`⚠️ [Analytics Flush Error] HTTP ${response.status}:`, errorText);
      }
    } catch (err) {
      // Network drop or offline: events remain safely queued for next reconnect
      if (ANALYTICS_CONFIG.ENABLE_DEBUG_LOGGING) {
        console.log(`⏳ [Analytics Queue] Kept ${this.eventQueue.length} events in local buffer`);
      }
    } finally {
      this.isFlushing = false;
    }
  }

  private startFlushTimer() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => {
      this.flush();
    }, ANALYTICS_CONFIG.FLUSH_INTERVAL_MS);
  }
}

export const Analytics = new TelemetryEngine();
