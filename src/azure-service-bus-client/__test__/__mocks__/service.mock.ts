import { IMassTransitMessage, MassTransitHost } from "../../azure-service-bus-client-interfaces";

export const validMessage = {
    Id: "test-id",
    User: "test-user",
    CodeCore: "test-codeCore",
    OperationSystem: "test-OperationSystem",
    DeviceToken: "test-DeviceToken",
    Email: "test-email",
    DeviceiOSToken: "test-deviceiOSToken",
    IdApplication: "test-IdApplication",
};

const mockhostMessageValues: MassTransitHost = {
    machineName: "test",
    processName: "test",
    processId: 123,
    assembly: "test",
    assemblyVersion: "test",
    frameworkVersion: "test",
    massTransitVersion: "test",
    operatingSystemVersion: "test",

}

export const validInputdata: IMassTransitMessage = {
    connString: 'validConnectionString',
    queueOrTopic: 'validQueueOrTopic',
    messages: validMessage,
    messageType: 'validMessageType',
    hostMessageValues: mockhostMessageValues
};

export const uniqueMessageIDdata: IMassTransitMessage = {
    connString: 'validConnectionString',
    queueOrTopic: 'validQueueOrTopic',
    messages: validMessage,
    messageType: 'validMessageType',
    hostMessageValues: mockhostMessageValues
};

export const missingHostMessageValues: IMassTransitMessage = { ...validInputdata, hostMessageValues: undefined };
export const missingmessageType: IMassTransitMessage = { ...validInputdata, messageType: undefined };