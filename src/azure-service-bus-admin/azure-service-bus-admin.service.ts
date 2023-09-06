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

/**
 * NestJS Service to be used on your application. 
 * This service provides functionalities in regards of managing Azure Service Bus resources, like Queues, Topics, and Subscriptions.
 * You can inject this service to your application module an manage those resources from there. 
 * Only param necessary is the connectionString
 */

@Injectable()
export class ServiceBusAdminService {
  private readonly serviceBusAdminClient: ServiceBusAdministrationClient;

  constructor(
    @Inject('AZURE_SERVICE_BUS_CONNECTION')
    private readonly options: AzureServiceBusAdminOptions,
  ) {
    this.serviceBusAdminClient = new ServiceBusAdministrationClient(
      options.connectionString,
    );
  }
  /**
   * Function that creates a Queue, otherwise it will get the current value
   * @param queueName 
   * @returns 
   */
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

  /**
   * Function that creates a Topic, otherwise it will get the current value
   * @param topicName 
   * @returns 
   */

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

  /**
   * Function that creates a Subscription, otherwise it will get the current value
   * @param topicName 
   * @param subscriptionName 
   * @param options 
   * @returns 
   */

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
