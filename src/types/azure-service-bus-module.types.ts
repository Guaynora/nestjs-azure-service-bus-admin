/**
 * Options types for the module initialization
 */
export type AzureSBOptions =
  | { connectionString: string }
  | { fullyQualifiedNamespace: string };

/**
 * Types on Module forFeature and forFeatureAsync for options
 */
export type AzureSBSenderReceiverOptions = {
  senders?: string[];
  receivers?: string[];
};
