import type { PartialDeep } from 'type-fest';
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
  message: Record<any, any>;
  sentTime: Date;
  host: MassTransitHost;
};

/**
 * Input data for sending @generateMassTransitSchema
 */
export interface IMassTransitMessage {
  connString: string;
  queueOrTopic: string;
  messages: MessageBus['message'];
  messageType: string;
  hostMessageValues?: PartialDeep<MassTransitHost>;
}
