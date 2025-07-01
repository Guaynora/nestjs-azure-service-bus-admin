# NestJS Azure Service Bus

[![npm version](https://img.shields.io/npm/v/nestjs-azure-service-bus.svg)](https://github.com/rbonillajr/nestjs-azure-service-bus-admin)
[![license](https://img.shields.io/npm/l/nestjs-azure-service-bus.svg)](https://github.com/engcfraposo/nestjs-azure-service-bus/blob/08d728f7e13b1efc51bd05c34e7d550b4cef23fb/LICENSE)
[![coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen.svg)](https://github.com/engcfraposo/nestjs-azure-service-bus/blob/8e7abef3ab8c7df28c9ad9a8483ae7f52a4233fb/README.md) | 100% (39/39) | 83.33% (10/12) | 100% (15/15) |

A dynamic module for NestJS that provides integration with Azure Service Bus and Azure Service Bus Admin Functionalities.

## Installation

```bash
npm install nestjs-azure-service-bus-admin
```

## Description

The NestJS Azure Service Bus package allows you to easily integrate Azure Service Bus into your NestJS applications. It provides decorators for injecting Azure Service Bus senders and receivers, as well as a dynamic module for configuring the Azure Service Bus client.
Also, you will be able to create Service Bus Resources from the `ServiceBusAdminService` Services, that could be used from outside or inside any NestJS Module

## Usage

### Importing the module

To use the Azure Service Bus module, import it into your NestJS application's root module:

```typescript
import { Module } from '@nestjs/common';
import { ServiceBusModule } from 'nestjs-azure-service-bus-admin';

@Module({
  imports: [
    ServiceBusModule.forRoot({
      connectionString: '<your-connection-string>',
    }),
  ],
})
export class AppModule {}
```

Replace `<your-connection-string>` with your Azure Service Bus connection string.

### Injecting Senders and Receivers

You can use the `Sender` and `Receiver` decorators provided by the module to inject Azure Service Bus senders and receivers into your classes:

```typescript
import { Injectable } from '@nestjs/common';
import { Sender, Receiver } from 'nestjs-azure-service-bus-admin';

@Injectable()
export class MyService {
  constructor(
    @Sender('my-queue') private readonly sender: ServiceBusSender,
    @Receiver({ name: 'my-queue' })
    private readonly receiver: ServiceBusReceiver,
  ) {}

  // Use the sender and receiver in your methods
}
```

Replace `'my-queue'` with the name of your Azure Service Bus queue.

### Configuration Options

The `forRoot` method of the `ServiceBusModule` accepts a configuration object with two possible options:

- `connectionString`: The connection string for your Azure Service Bus namespace.
- `fullyQualifiedNamespace`: The fully qualified namespace of your Azure Service Bus namespace.

You can provide either the `connectionString` or the `fullyQualifiedNamespace`, but not both.

### Dynamic Module Options

The `forFeature` method of the `ServiceBusModule` allows you to configure senders and receivers dynamically. It accepts an options object with two properties:

- `senders`: An array of sender names.
- `receivers`: An array of receiver configurations.

```typescript
import { Module } from '@nestjs/common';
import { ServiceBusModule } from 'nestjs-azure-service-bus-admin';

@Module({
  imports: [
    ServiceBusModule.forFeature({
      senders: ['queue-example'],
      receivers: [{ name: 'queue-example' }],
    }),
  ],
})
export class QueueModule {}
```

This will create senders and receivers for the specified queues.

```typescript
import { ServiceBusSender } from '@azure/service-bus';
import { Injectable } from '@nestjs/common';
import { Sender } from 'nestjs-azure-service-bus-admin';

@Injectable()
export class QueueSenderService {
  constructor(
    @Sender('test-queue') private readonly sender: ServiceBusSender,
  ) {}
  async sendMessage(body: string) {
    await this.sender.sendMessages({ body });
  }
}
```

```typescript
import { ServiceBusReceiver } from '@azure/service-bus';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Receiver } from 'nestjs-azure-service-bus-admin';

@Injectable()
export class QueueReceiverService implements OnModuleInit {
  constructor(
    @Receiver('test-queue') private readonly receiver: ServiceBusReceiver,
  ) {}
  onModuleInit() {
    this.receiver.subscribe({
      processMessage: async (message) => {
        console.log(`message.body: ${message.body}`);
      },
      processError: async (args) => {
        console.log(
          `Error occurred with ${args.entityPath} within ${args.fullyQualifiedNamespace}: `,
          args.error,
        );
      },
    });
  }
}
```

```typescript
import { Module } from '@nestjs/common';
import { QueueSenderService } from './queue-sender.service';
import { ServiceBusModule } from 'nestjs-azure-service-bus';
import { QueueReceiverService } from './queue-receiver.service';

@Module({
  imports: [
    ServiceBusModule.forFeature({
      receivers: [{ name: 'test-queue' }],
      senders: ['test-queue'],
    }),
  ],
  providers: [QueueSenderService, QueueReceiverService],
  exports: [QueueSenderService],
})
export class QueueModule {}
```

for another method the `ServiceBusReceiver` and `ServiceBusSender` see the [azure sdk](https://www.npmjs.com/package/@azure/service-bus)

### Retry and Dead Letter for Receivers

Starting from the latest version, you can configure receivers with custom retry logic and automatic dead-letter (DLQ) handling using the `AzureServiceBusRetryService`.

#### Configuring Receivers with Retry

You can define receivers with retry options using `ServiceBusModule.forFeature` or `forFeatureAsync`:

```typescript
@Module({
  imports: [
    ServiceBusModule.forFeature({
      senders: ['my-queue'],
      receivers: [
        {
          name: 'my-queue',
          retry: {
            maxRetries: 3, // Maximum number of retry attempts
            delayIntervals: [1000, 2000, 5000], // Milliseconds between retries
          },
        },
      ],
    }),
  ],
})
export class MyModule {}
```

With this configuration, failed messages will be automatically rescheduled for retry according to the defined policy. If the maximum number of retries is exceeded, the message will be sent to the Dead Letter Queue (DLQ) with the reason `MaxCustomRetryAttemptsExceeded`.

#### Configuring Receivers for Dead Letter Queue

You can also create a receiver that listens directly to the Dead Letter Queue:

```typescript
@Module({
  imports: [
    ServiceBusModule.forFeature({
      senders: ['my-queue'],
      receivers: [{ name: 'my-queue', deadLetter: true }],
    }),
  ],
})
export class MyModule {}
```

#### How does the retry service work?

The `AzureServiceBusRetryService` intercepts message processing and, in case of failure, schedules the message for retry based on your configuration. Retry metadata is stored in the message's application properties to track the number of attempts and delay intervals. When the maximum number of retries is reached, the message is automatically moved to the DLQ.

#### Example usage in a receiver

```typescript
@Injectable()
export class QueueReceiverService implements OnModuleInit {
  constructor(
    @Receiver({ name: 'my-queue', deadLetter: true })
    private readonly receiver: ServiceBusReceiver,
  ) {}
  onModuleInit() {
    this.receiver.subscribe({
      processMessage: async (message) => {
        // Your processing logic
      },
      processError: async (args) => {
        // Error handling logic
      },
    });
  }
}
```

### ServiceBusAdminService

This library provides a new functionality to manage Azure Service Bus resources wherever yoy need on your application

1. Use it directly from the class/service `ServiceBusAdminService` example:

```ts
const serviceClient = new ServiceBusAdminService({
  connectionString: `<your-connection-string>`,
});
const queue = await serviceClient.createQueue('my-queue');
const topic = await serviceClient.createTopic('my-topic');
const subscription = await serviceClient.createSubscription(
  'my-topic',
  'my-sub1',
  { ...options },
);
```

2. Use it in combination with the useAdminClient function, to make it async onModule Start process, example:
   **On your app's module**

```tsx
@Module({
  imports: [
    ServiceBusModule.forRootAsync({
      useFactory: () => ({
        connectionString: `<your-connection-string>`,
      }),
      useAdminClient: async (service: ServiceBusAdminService) => {
        const queue = await serviceClient.createQueue("my-queue");
        const topic = await serviceClient.createTopic('my-topic');
        const subscription = await serviceClient.createSubscription('my-topic', 'my-sub1', {...options});
      }
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
  ],
  })
```

### ServiceBusClientService

Service class for interacting with Azure Service Bus using client functionalities, for creating and formating messages.

#### Service Functions:

1. generateMassTransitMessage: Generates a MassTransit format message ready to be send to Azure Service Bus. Input type must be IMassTransitMessage

#### Usage:

1. Imports the Service to the module you will used:

```ts
import { Module } from '@nestjs/common';
import {
  ServiceBusModule,
  ServiceBusClientService,
} from 'nestjs-azure-service-bus-admin';
import { MyAppResolver } from './my-app.resolver';
import { MyAppService } from './my-app.service';

@Module({
  imports: [
    ServiceBusModule.forFeature({
      senders: ['my-queue'],
    }),
  ],
  providers: [MyAppResolver, MyAppService, ServiceBusClientService],
})
export class MyAppModule {}
```

2. Define the injected service in your local service:

```ts
import { Injectable } from '@nestjs/common';
import {
  Sender,
  ServiceBusClientService,
  IMassTransitMessage,
} from 'nestjs-azure-service-bus-admin';
import { ServiceBusSender } from '@azure/service-bus';

@Injectable()
export class MyAppService {
  constructor(
    @Sender('my-queue')
    private readonly senderCreate: ServiceBusSender,
    private readonly serviceBusClientService: ServiceBusClientService,
  ) {}
}
```

3. Use the injected service:

```ts
const message = this.serviceBusClientService.generateMassTransitMessage({
  connString: MY_CONNECTION_STR,
  queueOrTopic: AZ_SERVICES_BUS_TOPIC,
  messages: MY_MESSAGE,
  messageType: SERVICE_BUS_NOTIFIACTION_URN,
} as IMassTransitMessage);
```

## Support

- For issues or feature requests, please open an [issue](https://github.com/rbonillajr/nestjs-azure-service-bus-admin/issues).
- For contributions, please refer to the [contribution guide](https://github.com/rbonillajr/nestjs-azure-service-bus-admin/blob/main/CONTRIBUTING.md).

## License

This package is [MIT licensed](https://github.com/rbonillajr/nestjs-azure-service-bus-admin/blob/main/LICENSE).
