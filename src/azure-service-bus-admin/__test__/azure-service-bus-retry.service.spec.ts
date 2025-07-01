import { ServiceBusReceivedMessage } from '@azure/service-bus';
import { AzureServiceBusRetryService } from '../azure-sevice-bus-retry.service';
import { RetryConfiguration } from '../../types';

jest.mock('@nestjs/common', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

const mockSender = {
  scheduleMessages: jest.fn(),
};
const mockReceiver = {
  completeMessage: jest.fn(),
  deadLetterMessage: jest.fn(),
};
const mockServiceBusClient = {
  createSender: jest.fn(() => mockSender),
};

const retryConfig: RetryConfiguration = {
  maxRetries: 3,
  delayIntervals: [100, 200, 300],
};

const baseMessage: ServiceBusReceivedMessage = {
  body: { foo: 'bar' },
  messageId: 'test-id',
  contentType: 'application/json',
  applicationProperties: {},
} as any;

describe('AzureServiceBusRetryService', () => {
  let service: AzureServiceBusRetryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AzureServiceBusRetryService(mockServiceBusClient as any);
  });

  describe('registerSender', () => {
    it('should register a sender if not already present', () => {
      service.registerSender('queue1');
      expect(mockServiceBusClient.createSender).toHaveBeenCalledWith('queue1');
    });

    it('should not register a sender if already present', () => {
      service.registerSender('queue1');
      service.registerSender('queue1');
      expect(mockServiceBusClient.createSender).toHaveBeenCalledTimes(1);
    });
  });

  describe('wrapProcessorWithRetry', () => {
    it('should call original processor on success', async () => {
      const processor = jest.fn().mockResolvedValue(undefined);
      const wrapped = service.wrapProcessorWithRetry(
        processor,
        'queue1',
        retryConfig,
        mockReceiver as any,
      );
      await wrapped(baseMessage);
      expect(processor).toHaveBeenCalledWith(baseMessage);
    });

    it('should handle failure and retry', async () => {
      service.registerSender('queue1');
      const processor = jest.fn().mockRejectedValue(new Error('fail'));
      const wrapped = service.wrapProcessorWithRetry(
        processor,
        'queue1',
        retryConfig,
        mockReceiver as any,
      );

      await wrapped(baseMessage);

      expect(mockReceiver.completeMessage).toHaveBeenCalledWith(baseMessage);
      expect(mockSender.scheduleMessages).toHaveBeenCalled();
    });

    it('should send to DLQ after max retries', async () => {
      const retryProps = {
        'x-retry-original-id': 'orig-id',
        'x-retry-attempt': retryConfig.maxRetries,
        'x-retry-first-attempt': new Date().toISOString(),
        'x-retry-last-attempt': new Date().toISOString(),
        'x-retry-max-attempts': retryConfig.maxRetries,
        'x-retry-delay-intervals': JSON.stringify(retryConfig.delayIntervals),
      };
      const message = {
        ...baseMessage,
        applicationProperties: retryProps,
      } as any;

      const processor = jest.fn().mockRejectedValue(new Error('fail'));
      const wrapped = service.wrapProcessorWithRetry(
        processor,
        'queue1',
        retryConfig,
        mockReceiver as any,
      );

      await wrapped(message);

      expect(mockReceiver.deadLetterMessage).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          deadLetterReason: 'MaxCustomRetryAttemptsExceeded',
        }),
      );
    });
  });

  describe('extractRetryMetadata', () => {
    it('should extract metadata from message with retry properties', () => {
      const now = new Date();
      const props = {
        'x-retry-original-id': 'orig-id',
        'x-retry-attempt': 2,
        'x-retry-first-attempt': now.toISOString(),
        'x-retry-last-attempt': now.toISOString(),
        'x-retry-max-attempts': 5,
        'x-retry-delay-intervals': JSON.stringify([1, 2, 3]),
      };
      const message = { ...baseMessage, applicationProperties: props } as any;
      const meta = service['extractRetryMetadata'](message, retryConfig);
      expect(meta.originalMessageId).toBe('orig-id');
      expect(meta.attemptCount).toBe(2);
      expect(meta.maxRetries).toBe(5);
      expect(meta.delayIntervals).toEqual([1, 2, 3]);
    });

    it('should initialize metadata if no retry properties', () => {
      const message = { ...baseMessage, messageId: undefined, applicationProperties: undefined } as any;
      const meta = service['extractRetryMetadata'](message, retryConfig);
      expect(meta.originalMessageId).toBe(`msg-${Date.now()}`);
      expect(meta.attemptCount).toBe(0);
      expect(meta.maxRetries).toBe(retryConfig.maxRetries);
      expect(meta.delayIntervals).toEqual(retryConfig.delayIntervals);
    });

    it('should handle missing application properties', () => {
      const now = new Date();
      const props = {
        'x-retry-original-id': 'origin-id',
        'x-retry-first-attempt': now.toISOString(),
        'x-retry-last-attempt': now.toISOString(),
        'x-retry-delay-intervals': JSON.stringify([1, 2, 3]),
      }
      const message = { ...baseMessage, applicationProperties: props } as any;
      const meta = service['extractRetryMetadata'](message, retryConfig);
      expect(meta.attemptCount).toBe(0);
      expect(meta.maxRetries).toBe(retryConfig.maxRetries);
    });
  });

  describe('scheduleRetry', () => {
    it('should throw if sender not found', async () => {
      await expect(
        service['scheduleRetry'](
          baseMessage,
          'missing',
          {
            originalMessageId: 'id',
            attemptCount: 1,
            firstAttemptTime: new Date(),
            lastAttemptTime: new Date(),
            maxRetries: 3,
            delayIntervals: [1, 2, 3],
          },
          1,
          100,
        ),
      ).rejects.toThrow('No sender found for queue: missing');
    });

    it('should schedule a retry message', async () => {
      service.registerSender('queue1');
      const meta = {
        originalMessageId: 'id',
        attemptCount: 1,
        firstAttemptTime: new Date(),
        lastAttemptTime: new Date(),
        maxRetries: 3,
        delayIntervals: [1, 2, 3],
      };
      await service['scheduleRetry'](baseMessage, 'queue1', meta, 2, 100);
      expect(mockSender.scheduleMessages).toHaveBeenCalled();
    });
  });

  describe('sendDlqMessage', () => {
    it('should dead-letter the message', async () => {
      await service['sendDlqMessage'](
        baseMessage,
        mockReceiver as any,
        new Error('fail'),
      );
      expect(mockReceiver.deadLetterMessage).toHaveBeenCalledWith(
        baseMessage,
        expect.objectContaining({
          deadLetterReason: 'MaxCustomRetryAttemptsExceeded',
        }),
      );
    });

    it('should throw if dead-lettering fails', async () => {
      mockReceiver.deadLetterMessage.mockRejectedValueOnce(
        new Error('dlq fail'),
      );
      await expect(
        service['sendDlqMessage'](
          baseMessage,
          mockReceiver as any,
          new Error('fail'),
        ),
      ).rejects.toThrow('Failed to dead-letter message: dlq fail');
    });
  });
});
