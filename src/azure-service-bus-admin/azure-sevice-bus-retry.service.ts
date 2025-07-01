import {
  ServiceBusClient,
  ServiceBusMessage,
  ServiceBusReceivedMessage,
  ServiceBusReceiver,
  ServiceBusSender,
} from '@azure/service-bus';
import { RetryConfiguration, RetryMetadata } from '../types';
import {
  RETRY_ATTEMPT,
  RETRY_DELAY_INTERVALS,
  RETRY_FIRST_ATTEMPT,
  RETRY_LAST_ATTEMPT,
  RETRY_MAX_ATTEMPTS,
  RETRY_ORIGINAL_ID,
} from './consts';
import { Logger } from '@nestjs/common';

/**
 * Service to handle custom retry logic for Azure Service Bus messages.
 * Allows wrapping message processors with retry logic, scheduling retries with delays,
 * and sending messages to the Dead Letter Queue (DLQ) when retries are exhausted.
 */
export class AzureServiceBusRetryService {
  private readonly logger = new Logger(AzureServiceBusRetryService.name);
  private readonly senders = new Map<string, ServiceBusSender>();
  constructor(private readonly serviceBusClient: ServiceBusClient) {}

  /**
   * Registers a sender for a specific queue if it does not already exist.
   * @param queueName Name of the queue.
   */
  registerSender(queueName: string): void {
    if (!this.senders.has(queueName)) {
      const sender = this.serviceBusClient.createSender(queueName);
      this.senders.set(queueName, sender);
    }
  }

  /**
   * Wraps a message processor function with custom retry logic.
   * If the processor fails, handles retrying according to the provided configuration.
   *
   * @param originalProcessor The original function that processes the message.
   * @param queueName Name of the queue.
   * @param retryConfig Retry configuration (max retries, delays, etc).
   * @param receiver Service Bus receiver to complete or dead-letter messages.
   * @returns A processor function with retry logic.
   */
  wrapProcessorWithRetry(
    originalProcessor: (message: ServiceBusReceivedMessage) => Promise<void>,
    queueName: string,
    retryConfig: RetryConfiguration,
    receiver: ServiceBusReceiver,
  ) {
    return async (message: ServiceBusReceivedMessage) => {
      try {
        await originalProcessor(message);
      } catch (error) {
        await this.handleMessageFailure(
          message,
          queueName,
          retryConfig,
          error,
          receiver,
        );
      }
    };
  }

  /**
   * Handles a message processing failure.
   * Decides whether to retry, schedule the message, or send it to the DLQ.
   *
   * @param message The received message.
   * @param queueName Name of the queue.
   * @param retryConfig Retry configuration.
   * @param error The original processing error.
   * @param receiver Service Bus receiver.
   */
  private async handleMessageFailure(
    message: ServiceBusReceivedMessage,
    queueName: string,
    retryConfig: RetryConfiguration,
    error: unknown,
    receiver: ServiceBusReceiver,
  ): Promise<void> {
    const retryMetadata = this.extractRetryMetadata(message, retryConfig);
    const currentAttempt = retryMetadata.attemptCount + 1;

    this.logger.warn(
      `Message ${message.messageId} failed on attempt ${currentAttempt}/${retryConfig.maxRetries}`,
    );

    if (currentAttempt > retryConfig.maxRetries) {
      this.logger.error(
        `Message ${message.messageId} exhausted all retry attempts. Will be moved to DLQ.`,
      );

      await this.sendDlqMessage(message, receiver, error);
      return;
    }

    const delayIndex = Math.min(
      currentAttempt - 1,
      retryConfig.delayIntervals.length - 1,
    );
    const delay = retryConfig.delayIntervals[delayIndex];

    await receiver.completeMessage(message);
    await this.scheduleRetry(
      message,
      queueName,
      retryMetadata,
      currentAttempt,
      delay,
    );
  }

  /**
   * Sends a message to the Dead Letter Queue (DLQ) with error information.
   *
   * @param message The message to dead-letter.
   * @param receiver Service Bus receiver.
   * @param originalError The original error that caused the DLQ.
   */
  private async sendDlqMessage(
    message: ServiceBusReceivedMessage,
    receiver: ServiceBusReceiver,
    originalError: unknown,
  ) {
    try {
      const errorMsg =
        originalError instanceof Error
          ? originalError.message
          : JSON.stringify(originalError);

      await receiver.deadLetterMessage(message, {
        deadLetterReason: 'MaxCustomRetryAttemptsExceeded',
        deadLetterErrorDescription: `Custom retry exhausted. Original error: ${errorMsg}`,
      });
    } catch (dlqError) {
      this.logger.error('Failed to dead-letter message:', dlqError);
      throw new Error(
        `Failed to dead-letter message: ${dlqError.message}. Original error: ${
          (originalError as Error)?.message || originalError
        }`,
      );
    }
  }

  /**
   * Schedules a message to be resent to the queue after a delay.
   * Adds retry metadata to the message.
   *
   * @param originalMessage The original received message.
   * @param queueName Name of the queue.
   * @param metadata Retry metadata.
   * @param attemptCount Current attempt number.
   * @param delayMs Delay in milliseconds before retrying.
   */
  private async scheduleRetry(
    originalMessage: ServiceBusReceivedMessage,
    queueName: string,
    metadata: RetryMetadata,
    attemptCount: number,
    delayMs: number,
  ): Promise<void> {
    const sender = this.senders.get(queueName);
    if (!sender) {
      throw new Error(`No sender found for queue: ${queueName}`);
    }

    const scheduledEnqueueTime = new Date(Date.now() + delayMs);

    const retryMessage: ServiceBusMessage = {
      body: originalMessage.body,
      messageId: `${metadata.originalMessageId}-retry-${attemptCount}`,
      contentType: originalMessage.contentType,
      applicationProperties: {
        ...originalMessage.applicationProperties,
        [RETRY_ORIGINAL_ID]: metadata.originalMessageId,
        [RETRY_ATTEMPT]: attemptCount,
        [RETRY_FIRST_ATTEMPT]: metadata.firstAttemptTime.toISOString(),
        [RETRY_LAST_ATTEMPT]: new Date().toISOString(),
        [RETRY_MAX_ATTEMPTS]: metadata.maxRetries,
        [RETRY_DELAY_INTERVALS]: JSON.stringify(metadata.delayIntervals),
      },
    };

    await sender.scheduleMessages(retryMessage, scheduledEnqueueTime);
  }

  /**
   * Extracts retry metadata from a received message, or initializes it if this is the first attempt.
   *
   * @param message The received message.
   * @param retryConfig Retry configuration.
   * @returns Retry metadata.
   */
  private extractRetryMetadata(
    message: ServiceBusReceivedMessage,
    retryConfig: RetryConfiguration,
  ): RetryMetadata {
    const props = message.applicationProperties || {};

    if (props['x-retry-original-id']) {
      return {
        originalMessageId: String(props[RETRY_ORIGINAL_ID]),
        attemptCount: Number(props[RETRY_ATTEMPT]) || 0,
        firstAttemptTime: new Date(String(props[RETRY_FIRST_ATTEMPT])),
        lastAttemptTime: new Date(String(props[RETRY_LAST_ATTEMPT])),
        maxRetries: Number(props[RETRY_MAX_ATTEMPTS]) || retryConfig.maxRetries,
        delayIntervals: JSON.parse(String(props[RETRY_DELAY_INTERVALS])),
      };
    } else {
      return {
        originalMessageId:
          (message.messageId && message.messageId.toString()) ||
          `msg-${Date.now()}`,
        attemptCount: 0,
        firstAttemptTime: new Date(),
        lastAttemptTime: new Date(),
        maxRetries: retryConfig.maxRetries,
        delayIntervals: retryConfig.delayIntervals,
      };
    }
  }
}
