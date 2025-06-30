import { Inject } from '@nestjs/common';
import { ReceiverConfig } from '../types';

// --- Provider Token Helpers ---
/**
 * Generates the provider token for a ServiceBusReceiver based on configuration.
 * @param config Receiver configuration.
 * @returns The provider token string.
 */
export function createReceiverProviderToken(config: ReceiverConfig): string {
  const baseName = config.name.toUpperCase();
  if (config.deadLetter) {
    return `AZURE_SB_RECEIVER_${baseName}_DLQ`;
  }

  if (config.sessionId) {
    return `AZURE_SB_RECEIVER_${baseName}_SESSION_${config.sessionId.toUpperCase()}`;
  }

  return `AZURE_SB_RECEIVER_${baseName}`;
}

// --- Decorators ---

/**
 * Decorator to inject a ServiceBusSender.
 * @param queue Name of the queue or topic.
 * @example
 * \@Sender('my-queue') private sender: ServiceBusSender;
 */

export const Sender = (queue: string) =>
  Inject(`AZURE_SB_SENDER_${queue.toUpperCase()}`);

/**
 * Decorator to inject a ServiceBusReceiver (normal or DLQ).
 * @param config Receiver configuration.
 * @example
 * // Normal receiver
 * \@Receiver({ name: 'my-queue' }) private receiver: ServiceBusReceiver;
 *
 * // DLQ receiver
 * \@Receiver({ name: 'my-queue', deadLetter: true }) private dlqReceiver: ServiceBusReceiver;
 */
export const Receiver = (queue: ReceiverConfig) => {
  const providerToken = createReceiverProviderToken(queue);
  return Inject(providerToken);
};
