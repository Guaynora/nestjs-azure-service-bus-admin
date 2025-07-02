import { DynamicModule, Module, Provider, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceBusClient } from '@azure/service-bus';
import { DefaultAzureCredential } from '@azure/identity';
import {
  AzureSBOptions,
  AzureSBSenderReceiverOptions,
  ReceiverConfig,
} from '../types';
import { ServiceBusAdminService } from './azure-service-bus-admin.service';
import { AzureServiceBusRetryService } from './azure-sevice-bus-retry.service';
import { createEnhancedServiceBusReceiver } from './functions';
import { createReceiverProviderToken } from './azure-service-bus-admin.decorators';

/**
 * NestJS module to be used on your application.
 * This module will provide your services and sub-apps with necessary configuration to get and send messages.
 */

@Global()
@Module({})
export class ServiceBusModule {
  /**
   * Method to be used on Module Initialization, to provide configuration in regards of your service bus
   * @param options
   * @returns
   */
  static forRoot(options: AzureSBOptions): DynamicModule {
    let clientProvider: Provider;

    if ('connectionString' in options) {
      clientProvider = {
        provide: 'AZURE_SERVICE_BUS_CONNECTION',
        useValue: new ServiceBusClient(options.connectionString),
      };
    } else {
      const credential = new DefaultAzureCredential();
      clientProvider = {
        provide: 'AZURE_SERVICE_BUS_CONNECTION',
        useValue: new ServiceBusClient(
          options.fullyQualifiedNamespace,
          credential,
        ),
      };
    }

    return {
      module: ServiceBusModule,
      providers: [clientProvider],
      exports: [clientProvider],
    };
  }

  /**
   * Same method as @forRoot just to handle Async Operations and return its value
   * @param options
   * @returns
   */
  static forRootAsync(options: {
    imports?: any[];
    useFactory: (
      configService: ConfigService,
    ) => Promise<AzureSBOptions> | AzureSBOptions;
    useAdminClient?: (service: ServiceBusAdminService) => Promise<void>;
    inject?: any[];
  }): DynamicModule {
    const clientProvider: Provider = {
      provide: 'AZURE_SERVICE_BUS_CONNECTION',
      useFactory: async (
        configService: ConfigService,
      ): Promise<ServiceBusClient> => {
        const clientOptions = await options.useFactory(configService);
        /**
         * When a @connectionString is sent, @useAdminClient would be available returning a @ServiceBusAdminService instance
         */
        if ('connectionString' in clientOptions) {
          if (options.useAdminClient) {
            const serviceClient = new ServiceBusAdminService({
              connectionString: clientOptions.connectionString,
            });
            await options.useAdminClient(serviceClient);
          }
          return new ServiceBusClient(clientOptions.connectionString);
        } else {
          const credential = new DefaultAzureCredential();
          return new ServiceBusClient(
            clientOptions.fullyQualifiedNamespace,
            credential,
          );
        }
      },
      inject: options.inject || [],
    };

    return {
      module: ServiceBusModule,
      imports: options.imports || [],
      providers: [clientProvider],
      exports: [clientProvider],
    };
  }

  /**
   * @forFeature Method will allow the initial configuration done on @forRoot or @forRootAsync to be visible on your sub-modules services.
   * @param options
   * @returns
   */
  static forFeature(options: AzureSBSenderReceiverOptions): DynamicModule {
    const senderProviders =
      options.senders?.map((senderConfig) => ({
        provide: `AZURE_SB_SENDER_${senderConfig.name.toUpperCase()}`,
        useFactory: (client: ServiceBusClient) =>
          client.createSender(senderConfig.name),
        inject: ['AZURE_SERVICE_BUS_CONNECTION'],
      })) || [];

    const { retryReceivers, dlqReceivers, normalReceivers } =
      this.classifyReceivers(options.receivers || []);

    const normalReceiverProviders = normalReceivers.map((receiverConfig) => ({
      provide: createReceiverProviderToken(receiverConfig),
      useFactory: (client: ServiceBusClient) =>
        client.createReceiver(receiverConfig.name),
      inject: ['AZURE_SERVICE_BUS_CONNECTION'],
    }));

    const retryReceiverProviders = retryReceivers.map((receiverConfig) => ({
      provide: createReceiverProviderToken(receiverConfig),
      useFactory: (client: ServiceBusClient) => {
        const baseReceiver = client.createReceiver(receiverConfig.name);
        const retryService = new AzureServiceBusRetryService(client);
        retryService.registerSender(receiverConfig.name);

        return createEnhancedServiceBusReceiver(
          baseReceiver,
          retryService,
          receiverConfig.name,
          receiverConfig.retry,
        );
      },
      inject: ['AZURE_SERVICE_BUS_CONNECTION'],
    }));

    const dlqReceiverProviders = dlqReceivers.map((receiverConfig) => ({
      provide: createReceiverProviderToken(receiverConfig),
      useFactory: (client: ServiceBusClient) => {
        return client.createReceiver(receiverConfig.name, {
          subQueueType: 'deadLetter',
        });
      },
      inject: ['AZURE_SERVICE_BUS_CONNECTION'],
    }));

    return {
      module: ServiceBusModule,
      providers: [
        ...senderProviders,
        ...normalReceiverProviders,
        ...retryReceiverProviders,
        ...dlqReceiverProviders,
      ],
      exports: [
        ...senderProviders,
        ...normalReceiverProviders,
        ...retryReceiverProviders,
        ...dlqReceiverProviders,
      ],
    };
  }

  /**
   * Same method as @forFeature just to handle Async Operations and return its value
   * @param options
   * @returns
   */

  static forFeatureAsync(options: {
    imports?: any[];
    useFactory: (
      configService: ConfigService,
    ) => Promise<AzureSBSenderReceiverOptions> | AzureSBSenderReceiverOptions;
    inject?: any[];
  }): DynamicModule {
    const optionsProvider: Provider = {
      provide: 'AZURE_SB_OPTIONS',
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const senderProviders = {
      provide: 'AZURE_SB_SENDERS',
      useFactory: (
        client: ServiceBusClient,
        options: AzureSBSenderReceiverOptions,
      ) =>
        options.senders?.map((senderConfig) =>
          client.createSender(senderConfig.name),
        ) || [],
      inject: ['AZURE_SERVICE_BUS_CONNECTION', 'AZURE_SB_OPTIONS'],
    };

    const receiverProviders = {
      provide: 'AZURE_SB_RECEIVERS',
      useFactory: (
        client: ServiceBusClient,
        options: AzureSBSenderReceiverOptions,
      ) => {
        const { retryReceivers, dlqReceivers, normalReceivers } =
          this.classifyReceivers(options.receivers || []);

        const receivers: any[] = [];

        // Normal receivers
        normalReceivers.forEach((receiverConfig) => {
          receivers.push(client.createReceiver(receiverConfig.name));
        });

        // Retry receivers
        retryReceivers.forEach((receiverConfig) => {
          const baseReceiver = client.createReceiver(receiverConfig.name);
          const retryService = new AzureServiceBusRetryService(client);
          retryService.registerSender(receiverConfig.name);

          receivers.push(
            createEnhancedServiceBusReceiver(
              baseReceiver,
              retryService,
              receiverConfig.name,
              receiverConfig.retry,
            ),
          );
        });

        // DLQ receivers
        dlqReceivers.forEach((receiverConfig) => {
          receivers.push(
            client.createReceiver(receiverConfig.name, {
              subQueueType: 'deadLetter',
            }),
          );
        });

        return receivers;
      },
      inject: ['AZURE_SERVICE_BUS_CONNECTION', 'AZURE_SB_OPTIONS'],
    };

    return {
      module: ServiceBusModule,
      imports: options.imports || [],
      providers: [optionsProvider, senderProviders, receiverProviders],
      exports: [senderProviders, receiverProviders],
    };
  }

  /**
   * Classifies an array of receiver configurations into three categories:
   * - retryReceivers: receivers with a retry configuration.
   * - dlqReceivers: receivers configured for the dead-letter subqueue.
   * - normalReceivers: all other receivers.
   *
   * @param receivers Array of receiver configuration objects to classify.
   * @returns An object containing arrays for retryReceivers, dlqReceivers, and normalReceivers.
   */
  private static classifyReceivers(receivers: ReceiverConfig[]) {
    const retryReceivers: ReceiverConfig[] = [];
    const dlqReceivers: ReceiverConfig[] = [];
    const normalReceivers: ReceiverConfig[] = [];

    for (const receiverConfig of receivers) {
      if (receiverConfig.deadLetter) {
        dlqReceivers.push(receiverConfig);
      } else if (receiverConfig.retry) {
        retryReceivers.push(receiverConfig);
      } else {
        normalReceivers.push(receiverConfig);
      }
    }

    return { retryReceivers, dlqReceivers, normalReceivers };
  }
}
