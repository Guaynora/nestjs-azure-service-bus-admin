import { CreateSubscriptionOptions } from "@azure/service-bus";

/**
 * Types to be used on the @initServiceBusResources function
 */

export type ResourcesConfig = {
    connectionString: string
    queueName: string;
    topicName: string;
    subscriptionName: string;
    subscriptionOptions: CreateSubscriptionOptions;

}