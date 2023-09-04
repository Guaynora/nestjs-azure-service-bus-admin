import { Injectable, Inject } from '@nestjs/common';
import { AzureServiceBusAdminOptions } from './azure-service-bus-admin-options.interface';
import {
  CreateSubscriptionOptions,
  QueueProperties,
  ServiceBusAdministrationClient,
  SubscriptionProperties,
  TopicProperties,
  WithResponse,
} from '@azure/service-bus';

@Injectable()
export class AzureServiceBusAdminService {
  private readonly serviceBusAdminClient: ServiceBusAdministrationClient;

  constructor(
    @Inject('SERVICE_BUS_ADMIN_OPTIONS')
    private readonly options: AzureServiceBusAdminOptions,
  ) {
    this.serviceBusAdminClient = new ServiceBusAdministrationClient(
      options.connectionString,
    );
  }

  async createQueue(queueName: string): Promise<WithResponse<QueueProperties>> {
    const isQueueExist = await this.serviceBusAdminClient.queueExists(
      queueName,
    );
    if (isQueueExist) {
      return this.serviceBusAdminClient.getQueue(queueName);
    } else {
      return this.serviceBusAdminClient.createQueue(queueName);
    }
  }

  async createTopic(topicName: string): Promise<WithResponse<TopicProperties>> {
    const isTopicExist = await this.serviceBusAdminClient.topicExists(
      topicName,
    );
    if (isTopicExist) {
      return this.serviceBusAdminClient.getTopic(topicName);
    } else {
      return this.serviceBusAdminClient.createTopic(topicName);
    }
  }

  async createSubscription(
    topicName: string,
    subscriptionName: string,
    options?: CreateSubscriptionOptions,
  ): Promise<WithResponse<SubscriptionProperties>> {
    const isSubcriptionExist =
      await this.serviceBusAdminClient.subscriptionExists(
        topicName,
        subscriptionName,
      );
    if (isSubcriptionExist) {
      return this.serviceBusAdminClient.getSubscription(
        topicName,
        subscriptionName,
      );
    } else {
      return this.serviceBusAdminClient.createSubscription(
        topicName,
        subscriptionName,
        options,
      );
    }
  }
}
