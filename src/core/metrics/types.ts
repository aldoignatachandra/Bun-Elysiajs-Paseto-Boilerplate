/**
 * Type definitions for Prometheus metrics collection
 */

/**
 * Metric types supported by Prometheus
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Metric definition metadata
 */
export interface MetricDefinition {
  /** Metric name following Prometheus naming conventions */
  name: string;
  /** Type of metric */
  type: MetricType;
  /** Help text describing the metric */
  help: string;
  /** Label names for dimensional data */
  labels?: string[];
}

/**
 * Label values for a metric
 */
export type LabelValues = Record<string, string>;

/**
 * Histogram bucket configuration
 */
export interface HistogramBucket {
  /** Upper bound of the bucket ("+Inf" for infinity) */
  le: string;
  /** Cumulative count of observations in this bucket */
  value: number;
}

/**
 * Histogram observation data
 */
export interface HistogramData {
  /** Label values for this observation */
  labels: LabelValues;
  /** Sum of all observed values */
  sum: number;
  /** Count of all observations */
  count: number;
  /** Bucket counts */
  buckets: HistogramBucket[];
}

/**
 * Summary quantile data
 */
export interface SummaryQuantile {
  /** Quantile value (e.g., "0.95") */
  quantile: string;
  /** Value at this quantile */
  value: number;
}

/**
 * Summary observation data
 */
export interface SummaryData {
  /** Label values for this observation */
  labels: LabelValues;
  /** Sum of all observed values */
  sum: number;
  /** Count of all observations */
  count: number;
  /** Calculated quantiles */
  quantiles: SummaryQuantile[];
}

/**
 * HTTP request labels
 */
export interface HTTPRequestLabels {
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Route pattern (e.g., /api/v1/users/:id) */
  route: string;
  /** HTTP status code */
  status_code: string;
  /** Status code class (2xx, 3xx, 4xx, 5xx) */
  status_class: string;
}

/**
 * HTTP error labels
 */
export interface HTTPErrorLabels extends HTTPRequestLabels {
  /** Error type or code */
  error_type?: string;
}

/**
 * Histogram bucket boundaries for common latency metrics
 */
export const DEFAULT_LATENCY_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] as const;

/**
 * Summary quantiles for common latency metrics
 */
export const DEFAULT_QUANTILES = [0.5, 0.9, 0.95, 0.99] as const;
