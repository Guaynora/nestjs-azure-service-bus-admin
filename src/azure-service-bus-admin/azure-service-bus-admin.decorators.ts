import { Inject } from '@nestjs/common';

/**
 * Decorators to be used on your App Service in order to recieve and send messages
 * @param queue
 * @returns
 */
export const Sender = (queue: string) =>
  Inject(`AZURE_SB_SENDER_${queue.toUpperCase()}`);

export const Receiver = (queue: string) =>
  Inject(`AZURE_SB_RECEIVER_${queue.toUpperCase()}`);
