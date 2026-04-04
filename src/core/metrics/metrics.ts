/**
 * Prometheus metrics registry implementation
 *
 * Provides a pure TypeScript implementation of Prometheus metrics
 * collection with support for Counter, Gauge, Histogram, and Summary types.
 */

import type { MetricDefinition, LabelValues, HistogramBucket, HistogramData, SummaryData, SummaryQuantile } from './types';

/**
 * MetricsRegistry manages all metrics and produces Prometheus exposition format
 */
export class MetricsRegistry {
  private counters: Map<string, Map<string, number>> = new Map();
  private gauges: Map<string, Map<string, number>> = new Map();
  private histograms: Map<string, Map<string, HistogramData>> = new Map();
  private summaries: Map<string, Map<string, SummaryData>> = new Map();
  private metricDefinitions: Map<string, MetricDefinition> = new Map();
  private histogramBuckets: Map<string, number[]> = new Map();
  private summaryQuantiles: Map<string, number[]> = new Map();

  /**
   * Register a counter metric
   *
   * @param name - Metric name
   * @param help - Help text describing the metric
   * @param labels - Optional label names
   */
  registerCounter(name: string, help: string, labels?: string[]): void {
    const definition: MetricDefinition = { name, type: 'counter', help, labels };
    this.metricDefinitions.set(name, definition);
    this.counters.set(name, new Map());
  }

  /**
   * Register a gauge metric
   *
   * @param name - Metric name
   * @param help - Help text describing the metric
   * @param labels - Optional label names
   */
  registerGauge(name: string, help: string, labels?: string[]): void {
    const definition: MetricDefinition = { name, type: 'gauge', help, labels };
    this.metricDefinitions.set(name, definition);
    this.gauges.set(name, new Map());
  }

  /**
   * Register a histogram metric
   *
   * @param name - Metric name
   * @param help - Help text describing the metric
   * @param buckets - Bucket boundaries in seconds
   * @param labels - Optional label names
   */
  registerHistogram(name: string, help: string, buckets: number[], labels?: string[]): void {
    const definition: MetricDefinition = { name, type: 'histogram', help, labels };
    this.metricDefinitions.set(name, definition);
    this.histograms.set(name, new Map());
    this.histogramBuckets.set(name, [...buckets]);
  }

  /**
   * Register a summary metric
   *
   * @param name - Metric name
   * @param help - Help text describing the metric
   * @param quantiles - Quantiles to calculate (e.g., [0.5, 0.9, 0.95, 0.99])
   * @param labels - Optional label names
   */
  registerSummary(name: string, help: string, quantiles: number[], labels?: string[]): void {
    const definition: MetricDefinition = { name, type: 'summary', help, labels };
    this.metricDefinitions.set(name, definition);
    this.summaries.set(name, new Map());
    this.summaryQuantiles.set(name, [...quantiles]);
  }

  /**
   * Increment a counter metric
   *
   * @param name - Metric name
   * @param value - Value to add (default: 1)
   * @param labels - Label values
   */
  incrementCounter(name: string, value: number = 1, labels?: LabelValues): void {
    const counterMap = this.counters.get(name);
    if (!counterMap) {
      throw new Error(`Counter '${name}' not registered`);
    }

    const labelKey = this.getLabelKey(labels);
    const currentValue = counterMap.get(labelKey) ?? 0;
    counterMap.set(labelKey, currentValue + value);
  }

  /**
   * Set a gauge metric value
   *
   * @param name - Metric name
   * @param value - Value to set
   * @param labels - Label values
   */
  setGauge(name: string, value: number, labels?: LabelValues): void {
    const gaugeMap = this.gauges.get(name);
    if (!gaugeMap) {
      throw new Error(`Gauge '${name}' not registered`);
    }

    const labelKey = this.getLabelKey(labels);
    gaugeMap.set(labelKey, value);
  }

  /**
   * Increment a gauge metric value
   *
   * @param name - Metric name
   * @param value - Value to add (can be negative)
   * @param labels - Label values
   */
  incrementGauge(name: string, value: number, labels?: LabelValues): void {
    const gaugeMap = this.gauges.get(name);
    if (!gaugeMap) {
      throw new Error(`Gauge '${name}' not registered`);
    }

    const labelKey = this.getLabelKey(labels);
    const currentValue = gaugeMap.get(labelKey) ?? 0;
    gaugeMap.set(labelKey, currentValue + value);
  }

  /**
   * Observe a value for a histogram metric
   *
   * @param name - Metric name
   * @param value - Observed value
   * @param labels - Label values
   */
  observeHistogram(name: string, value: number, labels?: LabelValues): void {
    const histogramMap = this.histograms.get(name);
    if (!histogramMap) {
      throw new Error(`Histogram '${name}' not registered`);
    }

    const labelKey = this.getLabelKey(labels);
    const currentData = histogramMap.get(labelKey);

    if (currentData) {
      // Update existing histogram
      currentData.sum += value;
      currentData.count += 1;

      // Update buckets
      for (const bucket of currentData.buckets) {
        const le = bucket.le === '+Inf' ? Infinity : parseFloat(bucket.le);
        if (value <= le) {
          bucket.value += 1;
        }
      }
    } else {
      // Create new histogram data
      const buckets = this.getInitialBuckets(name);
      for (const bucket of buckets) {
        const le = bucket.le === '+Inf' ? Infinity : parseFloat(bucket.le);
        if (value <= le) {
          bucket.value += 1;
        }
      }

      histogramMap.set(labelKey, {
        labels: labels ?? {},
        sum: value,
        count: 1,
        buckets,
      });
    }
  }

  /**
   * Observe a value for a summary metric
   *
   * @param name - Metric name
   * @param value - Observed value
   * @param labels - Label values
   */
  observeSummary(name: string, value: number, labels?: LabelValues): void {
    const summaryMap = this.summaries.get(name);
    if (!summaryMap) {
      throw new Error(`Summary '${name}' not registered`);
    }

    const labelKey = this.getLabelKey(labels);
    const currentData = summaryMap.get(labelKey);

    if (currentData) {
      // Update existing summary - simplified approach
      // For production, use a proper streaming quantile algorithm
      currentData.sum += value;
      currentData.count += 1;
      this.updateQuantiles(name, value, currentData);
    } else {
      // Create new summary
      summaryMap.set(labelKey, {
        labels: labels ?? {},
        sum: value,
        count: 1,
        quantiles: this.getInitialQuantiles(name, value),
      });
    }
  }

  /**
   * Check if a metric is registered
   *
   * @param name - Metric name
   */
  hasMetric(name: string): boolean {
    return this.metricDefinitions.has(name);
  }

  /**
   * Get all metrics in Prometheus exposition format
   *
   * @returns Prometheus formatted metrics string
   */
  getMetrics(): string {
    const lines: string[] = [];

    // Export counters
    for (const [name, counterMap] of this.counters.entries()) {
      const definition = this.metricDefinitions.get(name);
      if (definition) {
        lines.push(`# HELP ${name} ${this.escapeHelpText(definition.help)}`);
        lines.push(`# TYPE ${name} ${definition.type}`);
      }

      // Only export if there are values
      if (counterMap.size > 0) {
        for (const [labelKey, value] of counterMap.entries()) {
          const labels = this.parseLabelKey(labelKey);
          const labelStr = this.formatLabels(labels);
          lines.push(`${name}${labelStr} ${value}`);
        }
        lines.push(''); // Empty line between metrics
      }
    }

    // Export gauges
    for (const [name, gaugeMap] of this.gauges.entries()) {
      const definition = this.metricDefinitions.get(name);
      if (definition) {
        lines.push(`# HELP ${name} ${this.escapeHelpText(definition.help)}`);
        lines.push(`# TYPE ${name} ${definition.type}`);
      }

      // Only export if there are values
      if (gaugeMap.size > 0) {
        for (const [labelKey, value] of gaugeMap.entries()) {
          const labels = this.parseLabelKey(labelKey);
          const labelStr = this.formatLabels(labels);
          lines.push(`${name}${labelStr} ${value}`);
        }
        lines.push(''); // Empty line between metrics
      }
    }

    // Export histograms
    for (const [name, histogramMap] of this.histograms.entries()) {
      const definition = this.metricDefinitions.get(name);
      if (definition) {
        lines.push(`# HELP ${name} ${this.escapeHelpText(definition.help)}`);
        lines.push(`# TYPE ${name} ${definition.type}`);
      }

      // Only export if there are values
      if (histogramMap.size > 0) {
        for (const [labelKey, data] of histogramMap.entries()) {
          const labels = this.parseLabelKey(labelKey);
          const labelPairs = Object.entries(labels).map(([k, v]) => `${k}="${v}"`);

          // Export buckets - proper format with all labels including le
          for (const bucket of data.buckets) {
            const allLabels = [...labelPairs, `le="${bucket.le}"`].join(',');
            if (allLabels) {
              lines.push(`${name}_bucket{${allLabels}} ${bucket.value}`);
            } else {
              lines.push(`${name}_bucket{le="${bucket.le}"} ${bucket.value}`);
            }
          }

          // Export sum and count
          const labelStr = this.formatLabels(labels);
          lines.push(`${name}_sum${labelStr} ${data.sum}`);
          lines.push(`${name}_count${labelStr} ${data.count}`);
        }
        lines.push(''); // Empty line between metrics
      }
    }

    // Export summaries
    for (const [name, summaryMap] of this.summaries.entries()) {
      const definition = this.metricDefinitions.get(name);
      if (definition) {
        lines.push(`# HELP ${name} ${this.escapeHelpText(definition.help)}`);
        lines.push(`# TYPE ${name} ${definition.type}`);
      }

      // Only export if there are values
      if (summaryMap.size > 0) {
        for (const [labelKey, data] of summaryMap.entries()) {
          const labels = this.parseLabelKey(labelKey);
          const labelPairs = Object.entries(labels).map(([k, v]) => `${k}="${v}"`);

          // Export quantiles - proper format with all labels including quantile
          for (const q of data.quantiles) {
            const allLabels = [...labelPairs, `quantile="${q.quantile}"`].join(',');
            if (allLabels) {
              lines.push(`${name}{${allLabels}} ${q.value}`);
            } else {
              lines.push(`${name}{quantile="${q.quantile}"} ${q.value}`);
            }
          }

          // Export sum and count
          const labelStr = this.formatLabels(labels);
          lines.push(`${name}_sum${labelStr} ${data.sum}`);
          lines.push(`${name}_count${labelStr} ${data.count}`);
        }
        lines.push(''); // Empty line between metrics
      }
    }

    return lines.join('\n').trim();
  }

  /**
   * Reset all metrics (useful for testing)
   * Note: This does not remove metric definitions, only clears values
   */
  reset(): void {
    // Clear all metric values but keep definitions
    for (const counterMap of this.counters.values()) {
      counterMap.clear();
    }
    for (const gaugeMap of this.gauges.values()) {
      gaugeMap.clear();
    }
    for (const histogramMap of this.histograms.values()) {
      histogramMap.clear();
    }
    for (const summaryMap of this.summaries.values()) {
      summaryMap.clear();
    }
  }

  /**
   * Get a stable key for label values
   */
  private getLabelKey(labels?: LabelValues): string {
    if (!labels || Object.keys(labels).length === 0) {
      return '';
    }
    const sortedKeys = Object.keys(labels).sort();
    return sortedKeys.map(k => `${k}="${labels[k]}"`).join(',');
  }

  /**
   * Parse a label key back into label values
   */
  private parseLabelKey(key: string): LabelValues {
    if (!key) return {};
    const labels: LabelValues = {};
    const pairs = key.split(',');
    for (const pair of pairs) {
      const match = pair.match(/^(\w+)="(.+)"$/);
      if (match) {
        const [, k, v] = match;
        labels[k] = v;
      }
    }
    return labels;
  }

  /**
   * Format label values for Prometheus output
   */
  private formatLabels(labels: LabelValues): string {
    if (Object.keys(labels).length === 0) {
      return '';
    }
    const pairs = Object.entries(labels).map(([k, v]) => {
      const escapedKey = this.formatMetricName(k);
      const escapedValue = this.escapeLabelValue(v);
      return `${escapedKey}="${escapedValue}"`;
    });
    return `{${pairs.join(',')}}`;
  }

  /**
   * Get initial histogram buckets
   */
  private getInitialBuckets(name: string): HistogramBucket[] {
    const buckets = this.histogramBuckets.get(name) ?? [];
    return [...buckets.map(b => ({ le: b.toString(), value: 0 })), { le: '+Inf', value: 0 }];
  }

  /**
   * Get initial summary quantiles
   */
  private getInitialQuantiles(name: string, value: number): SummaryQuantile[] {
    const quantiles = this.summaryQuantiles.get(name) ?? [];
    return quantiles.map(q => ({ quantile: q.toString(), value }));
  }

  /**
   * Update summary quantiles (simplified implementation)
   */
  private updateQuantiles(name: string, _value: number, currentData: SummaryData): void {
    // Simplified quantile calculation
    // In production, use a proper streaming quantile algorithm like t-digest
    const quantiles = this.summaryQuantiles.get(name) ?? [];
    currentData.quantiles = quantiles.map(q => ({
      quantile: q.toString(),
      value: (currentData.sum / currentData.count) * (1 + (q - 0.5)), // Approximation
    }));
  }

  /**
   * Escape label value according to Prometheus rules
   */
  private escapeLabelValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
  }

  /**
   * Escape help text according to Prometheus rules
   */
  private escapeHelpText(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
  }

  /**
   * Format metric name according to Prometheus conventions
   */
  private formatMetricName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }
}

// Singleton instance
let registryInstance: MetricsRegistry | null = null;

/**
 * Get the singleton MetricsRegistry instance
 */
export function getMetricsRegistry(): MetricsRegistry {
  if (!registryInstance) {
    registryInstance = new MetricsRegistry();
    initializeDefaultMetrics(registryInstance);
  }
  return registryInstance;
}

/**
 * Initialize default HTTP metrics
 */
function initializeDefaultMetrics(registry: MetricsRegistry): void {
  // HTTP request duration histogram
  registry.registerHistogram(
    'http_request_duration_seconds',
    'HTTP request latency in seconds',
    [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    ['method', 'route', 'status_code', 'status_class']
  );

  // HTTP requests total counter
  registry.registerCounter('http_requests_total', 'Total HTTP requests processed', ['method', 'route', 'status_code', 'status_class']);

  // HTTP active requests gauge
  registry.registerGauge('http_requests_in_flight', 'Current number of HTTP requests being processed');

  // HTTP errors total counter
  registry.registerCounter('http_errors_total', 'Total HTTP errors', ['method', 'route', 'status_code', 'error_type']);
}
