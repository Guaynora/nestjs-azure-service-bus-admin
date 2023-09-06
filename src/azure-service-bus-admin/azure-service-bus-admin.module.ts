import { DynamicModule, Module, Provider, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceBusClient } from '@azure/service-bus';
import { DefaultAzureCredential } from '@azure/identity';
import { AzureSBOptions, AzureSBSenderReceiverOptions } from '../types';
import { ServiceBusAdminService } from './azure-service-bus-admin.service';

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
    useAdminClient?: (service: ServiceBusAdminService) => Promise<void>,
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
      options.senders?.map((queue) => ({
        provide: `AZURE_SB_SENDER_${queue.toUpperCase()}`,
        useFactory: (client: ServiceBusClient) => client.createSender(queue),
        inject: ['AZURE_SERVICE_BUS_CONNECTION'],
      })) || [];

    const receiverProviders =
      options.receivers?.map((queue) => ({
        provide: `AZURE_SB_RECEIVER_${queue.toUpperCase()}`,
        useFactory: (client: ServiceBusClient) => client.createReceiver(queue),
        inject: ['AZURE_SERVICE_BUS_CONNECTION'],
      })) || [];

    return {
      module: ServiceBusModule,
      providers: [...senderProviders, ...receiverProviders],
      exports: [...senderProviders, ...receiverProviders],
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
      ) => options.senders?.map((queue) => client.createSender(queue)),
      inject: ['AZURE_SERVICE_BUS_CONNECTION', 'AZURE_SB_OPTIONS'],
    };

    const receiverProviders = {
      provide: 'AZURE_SB_RECEIVERS',
      useFactory: (
        client: ServiceBusClient,
        options: AzureSBSenderReceiverOptions,
      ) => options.receivers?.map((queue) => client.createReceiver(queue)),
      inject: ['AZURE_SERVICE_BUS_CONNECTION', 'AZURE_SB_OPTIONS'],
    };

    return {
      module: ServiceBusModule,
      imports: options.imports || [],
      providers: [optionsProvider, senderProviders, receiverProviders],
      exports: [senderProviders, receiverProviders],
    };
  }


}
