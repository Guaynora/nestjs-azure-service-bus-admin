import { hostname } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { IMassTransitMessage, MessageBus } from '../azure-service-bus-client-interfaces';
import { HOST_MESSAGE_VALUES } from '../consts';

/**
 * Generates the address for a Notification Hub connection string.
 * @param connString The connection string for the Notification Hub.
 * @returns The address for the Notification Hub.
 */
export const generateAdress = (connString: string) => {
    return `${connString.split(';')[0].split('=')[1]}`;
};


/**
 * Generates a MassTransit schema for a message to be sent to an Azure Service Bus queue or topic.
 * @param connString The connection string for the Azure Service Bus.
 * @param queueOrTopic The name of the queue or topic to send the message to.
 * @param messages The message to be sent.
 * @param messageType The type of the message.
 * @param hostMessageValues Optional values to be included in the host section of the schema.
 * @returns The MassTransit schema for the message.
 */
export const generateMassTransitSchema = (
    {
        connString,
        queueOrTopic,
        messages,
        messageType,
        hostMessageValues
    }: IMassTransitMessage
): MessageBus => {
    const messageId = uuidv4();
    const host = hostname();
    const address = generateAdress(connString);

    return {
        messageId,
        conversationId: messageId,
        sourceAddress: `${address}${host}?autodelete=300`,
        destinationAddress: `${address}${queueOrTopic}`,
        messageType: [messageType],
        message: messages,
        sentTime: new Date(),
        host: {
            machineName: hostMessageValues?.machineName ?? host,
            processName: hostMessageValues?.processName ?? HOST_MESSAGE_VALUES.PROCESS_NAME,
            processId: hostMessageValues?.processId ?? HOST_MESSAGE_VALUES.PROCCESS_ID,
            assembly: hostMessageValues?.assembly ?? HOST_MESSAGE_VALUES.ASSEMBLY,
            assemblyVersion: hostMessageValues?.assemblyVersion ?? HOST_MESSAGE_VALUES.ASSEMBLY_VERSION,
            frameworkVersion: hostMessageValues?.frameworkVersion ?? HOST_MESSAGE_VALUES.FRAMEWORK_VERSION,
            massTransitVersion: hostMessageValues?.massTransitVersion ?? HOST_MESSAGE_VALUES.MASSTRANSIT_VERSION,
            operatingSystemVersion: hostMessageValues?.operatingSystemVersion ?? process.platform,
        },
    };
};