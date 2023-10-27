import { Injectable } from '@nestjs/common';
import { IMassTransitMessage, MessageBus } from './azure-service-bus-client-interfaces';
import { generateMassTransitSchema } from './functions';


@Injectable()
/**
 * Service for interacting with Azure Service Bus using client functionalities
 */
export class ServiceBusClientService {

  /**
   * Function that generates a MassTransit message
   * @param data The data to be included in the message
   * @returns A MassTransit message object
   */
  generateMassTransitMessage(data: IMassTransitMessage): MessageBus {
    return generateMassTransitSchema(data);
  }
}
