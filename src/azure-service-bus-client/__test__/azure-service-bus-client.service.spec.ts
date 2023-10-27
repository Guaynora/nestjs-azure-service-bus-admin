import { ServiceBusClientService } from "../azure-service-bus-client.service";
import { missingHostMessageValues, missingmessageType, uniqueMessageIDdata, validInputdata } from "./__mocks__";

describe('ServiceBusClientService', () => {

  // The function 'generateMassTransitMessage' should return a MassTransit message object when given valid input data.
  it('should return a MassTransit message object when given valid input data', () => {
    // Arrange
    const service = new ServiceBusClientService();


    // Act
    const result = service.generateMassTransitMessage(validInputdata);

    // Assert
    expect(result).toBeDefined();
    expect(result.messageId).toBeDefined();
    expect(result.sourceAddress).toBeDefined();
    expect(result.destinationAddress).toBeDefined();
    expect(result.messageType).toBeDefined();
    expect(result.message).toBeDefined();
    expect(result.sentTime).toBeDefined();
    expect(result.host).toBeDefined();
  });

  // The function 'generateMassTransitMessage' should generate a unique messageId for each message.
  it('should generate a unique messageId for each message', () => {
    // Arrange
    const service = new ServiceBusClientService();
    // Act
    const result1 = service.generateMassTransitMessage(uniqueMessageIDdata);
    const result2 = service.generateMassTransitMessage(uniqueMessageIDdata);
    // Assert
    expect(result1.messageId).not.toBe(result2.messageId);
  });


  // The function 'generateMassTransitMessage' should generate a sourceAddress and destinationAddress for each message.
  it('should generate a sourceAddress and destinationAddress for each message', () => {
    // Arrange
    const service = new ServiceBusClientService();
    // Act
    const result = service.generateMassTransitMessage(validInputdata);
    // Assert
    expect(result.sourceAddress).toBeDefined();
    expect(result.destinationAddress).toBeDefined();
  });

  // The function 'generateMassTransitMessage' should throw an error if given invalid input data.
  it('should throw an error if given invalid input data', () => {
    // Arrange
    const service = new ServiceBusClientService();

    // Act & Assert
    expect(() => {
      service.generateMassTransitMessage({} as any);
    }).toThrow();
  });

  // The function 'generateMassTransitMessage' should handle missing hostMessageValues in the input data.
  it('should handle missing hostMessageValues in the input data', () => {
    // Arrange
    const service = new ServiceBusClientService();
    // Act
    const result = service.generateMassTransitMessage(missingHostMessageValues);

    // Assert
    expect(result.host.machineName).toBeDefined();
    expect(result.host.processName).toBeDefined();
    expect(result.host.processId).toBeDefined();
    expect(result.host.assembly).toBeDefined();
    expect(result.host.assemblyVersion).toBeDefined();
    expect(result.host.frameworkVersion).toBeDefined();
    expect(result.host.massTransitVersion).toBeDefined();
    expect(result.host.operatingSystemVersion).toBeDefined();
  });

  // The function 'generateMassTransitMessage' should handle missing messageType in the input data.
  it('should handle missing messageType in the input data', () => {
    // Arrange
    const service = new ServiceBusClientService();
    // Act
    const result = service.generateMassTransitMessage(missingmessageType);
    // Assert
    expect(result.messageType).toBeDefined();
  });


});
