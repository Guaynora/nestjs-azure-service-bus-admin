/**
 * Options types for the module initialization
 */
export type AzureSBOptions =
  | { connectionString: string }
  | { fullyQualifiedNamespace: string };

export interface RetryConfiguration {
  maxRetries: number;
  delayIntervals: number[];
}

export interface ReceiverConfig {
  name: string;
  deadLetter?: boolean;
  retry?: RetryConfiguration;
  sessionId?: string;
}

/**
 * Types on Module forFeature and forFeatureAsync for options
 */
export type AzureSBSenderReceiverOptions = {
  senders?: string[];
  receivers?: ReceiverConfig[];
};

export interface RetryMetadata {
  originalMessageId: string;
  attemptCount: number;
  firstAttemptTime: Date;
  lastAttemptTime: Date;
  maxRetries: number;
  delayIntervals: number[];
}
