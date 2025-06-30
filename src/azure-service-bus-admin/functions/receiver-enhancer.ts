import {
  ServiceBusReceivedMessage,
  ServiceBusReceiver,
  SubscribeOptions,
} from '@azure/service-bus';
import { RetryConfiguration } from '../../types';
import { AzureServiceBusRetryService } from '../azure-sevice-bus-retry.service';
import { ERROR_PROCESS_MESSAGE } from '../consts';

/**
 * Receiver enhancement utilities for Azure Service Bus.
 * Enhances a ServiceBusReceiver with custom retry logic and improved error handling.
 *
 * @param baseReceiver The original ServiceBusReceiver instance.
 * @param retryService The retry service to wrap message processors.
 * @param queueName The name of the queue.
 * @param retryConfig Retry configuration.
 * @returns A proxied ServiceBusReceiver with enhanced subscribe and close methods.
 */
export const createEnhancedServiceBusReceiver = (
  baseReceiver: ServiceBusReceiver,
  retryService: AzureServiceBusRetryService,
  queueName: string,
  retryConfig: RetryConfiguration,
): ServiceBusReceiver => {
  /**
   * Validates the handlers object for required functions.
   * @param handlers The handlers object to validate.
   */
  function validateHandlers(handlers: {
    processMessage: (message: ServiceBusReceivedMessage) => Promise<void>;
    processError: (args: any) => Promise<void>;
  }): void {
    if (
      !handlers?.processMessage ||
      typeof handlers.processMessage !== 'function'
    ) {
      throw new Error(ERROR_PROCESS_MESSAGE);
    }
  }

  /**
   * Enhanced error handler that logs and delegates to the user-provided handler.
   * @param args Error arguments from the Service Bus.
   * @param userHandler Optional user-provided error handler.
   */
  async function enhancedErrorHandler(
    args: any,
    userHandler?: (args: any) => Promise<void>,
  ): Promise<void> {
    if (userHandler && typeof userHandler === 'function') {
      await userHandler(args);
    }
  }

  const enhancements = {
    /**
     * Subscribes to the Service Bus receiver with enhanced retry and error handling.
     * @param handlers Object containing processMessage and processError handlers.
     * @param options Optional subscribe options.
     */
    subscribe(
      handlers: {
        processMessage: (message: ServiceBusReceivedMessage) => Promise<void>;
        processError: (args: any) => Promise<void>;
      },
      options?: SubscribeOptions,
    ): void {
      validateHandlers(handlers);
      const enhancedProcessor = retryService.wrapProcessorWithRetry(
        handlers.processMessage,
        queueName,
        retryConfig,
        baseReceiver,
      );

      baseReceiver.subscribe(
        {
          processMessage: enhancedProcessor,
          processError: (args: any) =>
            enhancedErrorHandler(args, handlers.processError),
        },
        options,
      );
    },

    /**
     * Closes the underlying Service Bus receiver.
     */
    async close(): Promise<void> {
      return baseReceiver.close();
    },
  };

  return new Proxy(baseReceiver, {
    get(target, prop) {
      if (prop in enhancements) {
        return enhancements[prop as keyof typeof enhancements];
      }

      const originalValue = target[prop as keyof ServiceBusReceiver];

      if (typeof originalValue === 'function') {
        return originalValue.bind(target);
      }

      return originalValue;
    },
  }) as ServiceBusReceiver;
};
