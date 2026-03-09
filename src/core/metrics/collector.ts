/**
 * Prometheus Metrics Collector
 *
 * Collects and exports metrics in Prometheus text format.
 * Supports counters, gauges, and histograms with labels.
 */

import type { MetricType, LabelSet, StoredMetric, MetricData } from './types';

/**
 * Default histogram buckets for duration metrics (in seconds)
 */
const DEFAULT_HISTOGRAM_BUCKETS = [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

/**
 * Metrics collector class
 */
export class MetricsCollector {
  private metrics: Map<string, StoredMetric> = new Map();
  private activeConnections: number = 0;

  constructor() {
    this.initializeDefaultMetrics();
  }

  /**
   * Initialize default application metrics
   */
  private initializeDefaultMetrics(): void {
    this.registerMetric('http_requests_total', 'counter', 'Total number of HTTP requests');
    this.registerMetric(
      'http_request_duration_seconds',
      'histogram',
      'HTTP request duration in seconds'
    );
    this.registerMetric('active_connections', 'gauge', 'Number of active connections');
    this.registerMetric(
      'database_query_duration_seconds',
      'histogram',
      'Database query duration in seconds'
    );
    this.registerMetric('cache_hits_total', 'counter', 'Total number of cache hits');
    this.registerMetric('cache_misses_total', 'counter', 'Total number of cache misses');
  }

  /**
   * Register a new metric
   */
  private registerMetric(name: string, type: MetricType, help: string): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        type,
        help,
        data: new Map(),
      });
    }
  }

  /**
   * Get or create metric data for a specific label set
   */
  private getOrCreateMetric(
    metricName: string,
    type: MetricType,
    defaultHelp: string,
    labels?: LabelSet
  ): MetricData {
    let metric = this.metrics.get(metricName);
    if (!metric) {
      metric = {
        name: metricName,
        type,
        help: defaultHelp,
        data: new Map(),
      };
      this.metrics.set(metricName, metric);
    }

    const key = this.labelSetToString(labels);
    if (!metric.data.has(key)) {
      metric.data.set(key, {});
    }

    return metric.data.get(key)!;
  }

  /**
   * Get metric data (throws if not registered)
   */
  private getMetricData(metricName: string, labels?: LabelSet): MetricData {
    const metric = this.metrics.get(metricName);
    if (!metric) {
      throw new Error(`Metric ${metricName} not registered`);
    }

    const key = this.labelSetToString(labels);
    if (!metric.data.has(key)) {
      metric.data.set(key, {});
    }

    return metric.data.get(key)!;
  }

  /**
   * Convert label set to string key
   */
  private labelSetToString(labels?: LabelSet): string {
    if (!labels || Object.keys(labels).length === 0) {
      return '';
    }
    return JSON.stringify(labels);
  }

  /**
   * Format labels for Prometheus output
   */
  private formatLabels(labels?: LabelSet): string {
    if (!labels || Object.keys(labels).length === 0) {
      return '';
    }

    const formatted = Object.entries(labels)
      .map(([key, value]) => {
        const escapedValue = this.escapeLabelValue(value);
        return `${key}="${escapedValue}"`;
      })
      .join(',');

    return `{${formatted}}`;
  }

  /**
   * Escape label values according to Prometheus text format
   */
  private escapeLabelValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }

  /**
   * Increment a counter metric
   */
  counter(name: string, value: number, labels?: LabelSet): void {
    const data = this.getOrCreateMetric(name, 'counter', `Counter metric ${name}`, labels);
    data.value = (data.value || 0) + value;
  }

  /**
   * Set a gauge metric value
   */
  gauge(name: string, value: number, labels?: LabelSet): void {
    const data = this.getOrCreateMetric(name, 'gauge', `Gauge metric ${name}`, labels);
    data.value = value;
  }

  /**
   * Record a value in a histogram
   */
  histogram(name: string, value: number, labels?: LabelSet, buckets?: number[]): void {
    const data = this.getOrCreateMetric(name, 'histogram', `Histogram metric ${name}`, labels);
    const histogramBuckets = buckets || DEFAULT_HISTOGRAM_BUCKETS;

    if (!data.histogram) {
      data.histogram = {
        buckets: histogramBuckets,
        counts: {},
        sum: 0,
        count: 0,
      };
    }

    const hist = data.histogram;
    hist.sum += value;
    hist.count += 1;

    // Update bucket counts
    for (const bucket of histogramBuckets) {
      const bucketKey = bucket.toString();
      if (!hist.counts[bucketKey]) {
        hist.counts[bucketKey] = 0;
      }
      if (value <= bucket) {
        hist.counts[bucketKey]++;
      }
    }
  }

  /**
   * Record timing with default histogram buckets
   */
  timing(name: string, duration: number, labels?: LabelSet): void {
    this.histogram(name, duration, labels);
  }

  /**
   * Increment HTTP requests counter
   */
  incrementHttpRequests(method: string, path: string, status: number): void {
    this.counter('http_requests_total', 1, {
      method,
      path,
      status: status.toString(),
    });
  }

  /**
   * Record HTTP request duration
   */
  recordHttpDuration(method: string, path: string, duration: number): void {
    this.histogram('http_request_duration_seconds', duration, {
      method,
      path,
    });
  }

  /**
   * Record active connections count
   */
  recordActiveConnections(count: number): void {
    this.gauge('active_connections', count);
    this.activeConnections = count;
  }

  /**
   * Record database query duration
   */
  recordDatabaseQueryDuration(query: string, duration: number): void {
    // Truncate long queries to avoid label value length issues
    const truncatedQuery = query.length > 200 ? query.substring(0, 200) + '...' : query;
    this.histogram('database_query_duration_seconds', duration, {
      query: truncatedQuery,
    });
  }

  /**
   * Record cache hit or miss
   */
  recordCacheHit(cache: string, hit: boolean): void {
    if (hit) {
      this.counter('cache_hits_total', 1, { cache });
    } else {
      this.counter('cache_misses_total', 1, { cache });
    }
  }

  /**
   * Export all metrics in Prometheus text format
   */
  getMetrics(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      // Add HELP and TYPE comments
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      if (metric.type === 'histogram') {
        this.exportHistogram(metric, lines);
      } else {
        this.exportSimpleMetric(metric, lines);
      }

      // Empty line between metrics
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Export a simple metric (counter or gauge)
   */
  private exportSimpleMetric(metric: StoredMetric, lines: string[]): void {
    for (const [key, data] of metric.data.entries()) {
      const labels = this.labelSetFromString(key);
      const labelStr = this.formatLabels(labels);
      const value = data.value ?? 0;
      lines.push(`${metric.name}${labelStr} ${value}`);
    }
  }

  /**
   * Export a histogram metric
   */
  private exportHistogram(metric: StoredMetric, lines: string[]): void {
    // Get all unique buckets across all label sets
    const allBuckets = new Set<number>();
    for (const data of metric.data.values()) {
      if (data.histogram?.buckets) {
        for (const bucket of data.histogram.buckets) {
          allBuckets.add(bucket);
        }
      }
    }

    const sortedBuckets = Array.from(allBuckets).sort((a, b) => a - b);

    for (const [key, data] of metric.data.entries()) {
      const labels = this.labelSetFromString(key);
      const hist = data.histogram;

      if (!hist) {
        continue;
      }

      // Export bucket counts
      let cumulativeCount = 0;
      for (const bucket of sortedBuckets) {
        const bucketKey = bucket.toString();
        cumulativeCount += hist.counts[bucketKey] || 0;
        const bucketLabels = { ...labels, le: bucket.toString() };
        const labelStr = this.formatLabels(bucketLabels);
        lines.push(`${metric.name}_bucket${labelStr} ${cumulativeCount}`);
      }

      // Export +Inf bucket
      const infLabels = { ...labels, le: '+Inf' };
      const infLabelStr = this.formatLabels(infLabels);
      lines.push(`${metric.name}_bucket${infLabelStr} ${hist.count}`);

      // Export sum and count
      const labelStr = this.formatLabels(labels);
      lines.push(`${metric.name}_sum${labelStr} ${hist.sum}`);
      lines.push(`${metric.name}_count${labelStr} ${hist.count}`);
    }
  }

  /**
   * Parse label set from string key
   */
  private labelSetFromString(key: string): LabelSet {
    if (!key) {
      return {};
    }
    return JSON.parse(key) as LabelSet;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.metrics.clear();
    this.initializeDefaultMetrics();
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();
