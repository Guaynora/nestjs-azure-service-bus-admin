import { ServiceBusReceiver } from '@azure/service-bus';
import { createEnhancedServiceBusReceiver } from '../receiver-enhancer';
import { AzureServiceBusRetryService } from '../../azure-sevice-bus-retry.service';
import { RetryConfiguration } from '../../../types';
import { ERROR_PROCESS_MESSAGE } from '../../consts';

describe('createEnhancedServiceBusReceiver', () => {
  let baseReceiver: jest.Mocked<ServiceBusReceiver>;
  let retryService: jest.Mocked<AzureServiceBusRetryService>;
  let queueName: string;
  let retryConfig: RetryConfiguration;

  beforeEach(() => {
    baseReceiver = {
      subscribe: jest.fn(),
      close: jest.fn(),
    } as any;

    retryService = {
      wrapProcessorWithRetry: jest.fn((fn) => fn),
    } as any;

    queueName = 'test-queue';
    retryConfig = {delayIntervals: [100, 200], maxRetries: 3};
  });

  it('should return a proxy with enhanced subscribe and close methods', () => {
    const enhanced = createEnhancedServiceBusReceiver(baseReceiver, retryService, queueName, retryConfig);
    expect(typeof enhanced.subscribe).toBe('function');
    expect(typeof enhanced.close).toBe('function');
  });

  it('should call validateHandlers and throw if processMessage is missing', () => {
    const enhanced = createEnhancedServiceBusReceiver(baseReceiver, retryService, queueName, retryConfig);
    expect(() =>
      enhanced.subscribe({ processError: jest.fn() } as any)
    ).toThrow(ERROR_PROCESS_MESSAGE);
  });

  it('should call retryService.wrapProcessorWithRetry and baseReceiver.subscribe', () => {
    const processMessage = jest.fn();
    const processError = jest.fn();
    const enhanced = createEnhancedServiceBusReceiver(baseReceiver, retryService, queueName, retryConfig);

    enhanced.subscribe({ processMessage, processError });

    expect(retryService.wrapProcessorWithRetry).toHaveBeenCalledWith(
      processMessage,
      queueName,
      retryConfig,
      baseReceiver
    );
    expect(baseReceiver.subscribe).toHaveBeenCalled();
    const subscribeArgs = (baseReceiver.subscribe as jest.Mock).mock.calls[0][0];
    expect(typeof subscribeArgs.processMessage).toBe('function');
    expect(typeof subscribeArgs.processError).toBe('function');
  });

  it('should call enhanced processError handler', async () => {
    const processMessage = jest.fn();
    const processError = jest.fn();
    const enhanced = createEnhancedServiceBusReceiver(baseReceiver, retryService, queueName, retryConfig);

    enhanced.subscribe({ processMessage, processError });

    // Simulate processError call
    const subscribeArgs = (baseReceiver.subscribe as jest.Mock).mock.calls[0][0];
    await subscribeArgs.processError('error-args');
    expect(processError).toHaveBeenCalledWith('error-args');
  });

  it('should call baseReceiver.close when enhanced.close is called', async () => {
    const enhanced = createEnhancedServiceBusReceiver(baseReceiver, retryService, queueName, retryConfig);
    await enhanced.close();
    expect(baseReceiver.close).toHaveBeenCalled();
  });

  it('should proxy other methods and properties to baseReceiver', () => {
    (baseReceiver as any).someMethod = jest.fn().mockReturnValue('foo');
    const enhanced = createEnhancedServiceBusReceiver(baseReceiver, retryService, queueName, retryConfig);
    expect((enhanced as any).someMethod()).toBe('foo');
    (baseReceiver as any).someProp = 42;
    expect((enhanced as any).someProp).toBe(42);
  });
});