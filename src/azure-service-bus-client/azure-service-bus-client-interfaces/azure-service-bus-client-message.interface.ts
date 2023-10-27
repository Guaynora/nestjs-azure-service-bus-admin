import type { PartialDeep } from 'type-fest';
import {
  NotificacionAudienceCreate,
  NotificacionAudienceDelete
} from "./azure-service-bus-client-notificationhub.interface";

/**
 * Host properties need by MassTransit Host
 */
export type MassTransitHost = {
  machineName: string;
  processName: string;
  processId: number;
  assembly: string;
  assemblyVersion: string;
  frameworkVersion: string;
  massTransitVersion: string;
  operatingSystemVersion: string;
};

/**
 * Bus message properties
 */

export type MessageBus = {
  messageId: string;
  conversationId: string;
  sourceAddress: string;
  destinationAddress: string;
  messageType: string[];
  message: NotificacionAudienceCreate | NotificacionAudienceDelete; // Here should be added more types as they will be supported
  sentTime: Date;
  host: MassTransitHost;
};

/**
 * Input data for sending @generateMassTransitSchema
 */
export interface IMassTransitMessage {
  connString: string,
  queueOrTopic: string,
  messages: MessageBus['message'],
  messageType: string
  hostMessageValues?: PartialDeep<MassTransitHost>
}
