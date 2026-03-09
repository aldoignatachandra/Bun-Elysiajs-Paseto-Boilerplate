/**
 * Metrics type definitions for Prometheus metrics collection
 */

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface Metric {
  name: string;
  type: MetricType;
  help: string;
  labels?: Record<string, string>;
  value?: number;
}

export interface CounterMetric extends Metric {
  type: 'counter';
  value: number;
}

export interface GaugeMetric extends Metric {
  type: 'gauge';
  value: number;
}

export interface HistogramMetric extends Metric {
  type: 'histogram';
  value: number;
  buckets?: number[];
}

export type MetricValue = number | string | boolean;

/**
 * Label set for metrics
 */
export type LabelSet = Record<string, string>;

/**
 * Histogram bucket configuration
 */
export interface HistogramBuckets {
  buckets: number[];
  counts: Record<string, number>;
  sum: number;
  count: number;
}

/**
 * Stored metric data
 */
export interface StoredMetric {
  name: string;
  type: MetricType;
  help: string;
  data: Map<string, MetricData>;
}

export interface MetricData {
  value?: number;
  histogram?: HistogramBuckets;
}

/**
 * HTTP request tracking data
 */
export interface HttpRequestMetric {
  method: string;
  path: string;
  status: number;
  duration: number;
}
