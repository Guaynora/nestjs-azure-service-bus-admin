import { ServiceBusModule } from "../azure-service-bus-admin.module";
import * as serviceClient from '@azure/service-bus';
import * as azureIdentity from '@azure/identity';
import * as adminClient from '../azure-service-bus-admin.service';

const mockServiceBusClient = jest.spyOn(serviceClient, "ServiceBusClient");
const mockDefaultAzureCredential = jest.spyOn(azureIdentity, "DefaultAzureCredential");
const mockServiceBusAdminService = jest.spyOn(adminClient, "ServiceBusAdminService");


type MockServiceModuleType = {
  module: any,
  providers?: any[],
  exports?: any[],
}

const mockUseFactory = jest.fn();
const mockUseAdminClient = jest.fn();

const mockUseFactoryForFeatAsync = { useFactory: jest.fn().mockResolvedValue({ senders: ['testSender'], receivers: ['testReceiver'] }) }
const PROVIDER_NAME = "AZURE_SERVICE_BUS_CONNECTION";
const SENDER_NAME = "AZURE_SB_SENDER_TESTSENDER";
const RECIEVER_NAME = "AZURE_SB_RECEIVER_TESTRECEIVER";
const OPTIONS_PROVIDER = "AZURE_SB_OPTIONS";
const SENDER_DECORATOR = "AZURE_SB_SENDERS";
const RECIEVER_DECORATOR = "AZURE_SB_RECEIVERS";

beforeAll(() => {
  mockServiceBusClient.mockReturnValue({} as never);
  mockDefaultAzureCredential.mockReturnValue({ credentials: true } as never);
})

describe('ServiceBusModule For Root methods', () => {

  // Tests that the forRoot method returns a DynamicModule with providers and exports
  it('should return a DynamicModule with providers and exports when options parameter is provided', () => {
    // Arrange
    const options = { connectionString: 'testConnectionString' };

    // Act
    const dynamicModule: MockServiceModuleType = ServiceBusModule.forRoot(options);
    const { providers, exports, module } = dynamicModule;

    // Assert
    expect(dynamicModule).toBeDefined();
    expect(module).toBe(ServiceBusModule);
    expect(providers).toBeDefined();
    expect(providers.length).toBe(1);
    expect(providers[0].provide).toBe(PROVIDER_NAME);
    expect(providers[0].useValue).toBeDefined();
    expect(exports).toBeDefined();
    expect(exports.length).toBe(1);
    expect(exports[0].provide).toBe(PROVIDER_NAME);
  });

  // Test the flow when no @connectionString is set
  it("should return Credentials value when no connectionString is set on forRoot", () => {
    const mockOptions = {
      fullyQualifiedNamespace: "test"
    };
    mockServiceBusClient.mockReturnValue({ test: true } as never);
    const dynamicModule: MockServiceModuleType = ServiceBusModule.forRoot(mockOptions);
    const { providers, exports } = dynamicModule;

    expect(providers[0].useValue.test).toBeTruthy();
    expect(exports[0].useValue.test).toBeTruthy();
  });

  // Test the flow when no @connectionString and @useAdminClient are set
  it("should return Credentials and execute useAdminClient when they are set", async () => {
    mockServiceBusClient.mockReturnValue({ test: true } as never);
    mockServiceBusAdminService.mockReturnValue({ client: true } as never);
    const dynamicModule: MockServiceModuleType = ServiceBusModule.forRootAsync(
      {
        useFactory: jest.fn().mockResolvedValue({ connectionString: 'testConnectionString' }),
        useAdminClient: async (e: never) => { await mockUseAdminClient(e) }
      });
    const { providers, exports } = dynamicModule;
    await exports[0].useFactory();
    expect(providers[0].useFactory.constructor.name).toEqual("AsyncFunction");
    expect(exports[0].useFactory.constructor.name).toEqual("AsyncFunction");
    expect(mockUseAdminClient).toHaveBeenCalled();
  });

  // Tests that the forRootAsync method returns a DynamicModule with providers and exports
  it('should return a DynamicModule with providers and exports when options parameter is provided', async () => {
    // Arrange
    const options = {
      useFactory: jest.fn().mockResolvedValue({ connectionString: 'testConnectionString' }),
      inject: []
    };

    // Act
    const dynamicModule: MockServiceModuleType = ServiceBusModule.forRootAsync(options);
    const { providers, exports, module } = dynamicModule;

    // Assert
    expect(dynamicModule).toBeDefined();
    expect(module).toBe(ServiceBusModule);
    expect(providers.length).toBe(1);
    expect(providers[0].provide).toBe(PROVIDER_NAME);
    expect(providers[0].useFactory).toBeDefined();
    expect(exports.length).toBe(1);
    expect(exports[0].provide).toBe(PROVIDER_NAME);
  });

  it("should return Credentials value when no connectionString is set on forRootAsync", async () => {
    const mockOptions = {
      useFactory: mockUseFactory,
    };
    const serviceBusOpts = { test: true };
    mockUseFactory.mockReturnValue({ connectionString: "test" })
    mockServiceBusClient.mockReturnValue(serviceBusOpts as never);
    const dynamicModule: MockServiceModuleType = ServiceBusModule.forRootAsync(mockOptions);
    const { providers, exports } = dynamicModule;

    expect(providers[0].provide).toEqual(PROVIDER_NAME);
    expect(providers[0].useFactory.constructor.name).toEqual("AsyncFunction");
    expect(exports[0].provide).toEqual(PROVIDER_NAME);
    expect(exports[0].useFactory.constructor.name).toEqual("AsyncFunction");
    expect(await exports[0].useFactory()).toEqual(serviceBusOpts);
    mockUseFactory.mockReturnValue({});
    expect(await exports[0].useFactory()).toEqual(serviceBusOpts);

  });



});



describe("ServiceBusModule ForFeature Methods", () => {

  // Tests that the forFeature method returns a DynamicModule with providers and exports
  it('should return a DynamicModule with providers and exports when options parameter is provided', () => {
    // Arrange
    const options = { senders: ['testSender'], receivers: ['testReceiver'] };

    // Act
    const dynamicModule: MockServiceModuleType = ServiceBusModule.forFeature(options);
    const { providers, exports, module } = dynamicModule;

    // Assert
    expect(dynamicModule).toBeDefined();
    expect(module).toBe(ServiceBusModule);
    expect(providers.length).toBe(2);
    expect(providers[0].provide).toBe(SENDER_NAME);
    expect(providers[0].useFactory).toBeDefined();
    expect(providers[1].provide).toBe(RECIEVER_NAME);
    expect(providers[1].useFactory).toBeDefined();
    expect(exports.length).toBe(2);
    expect(exports[0].provide).toBe(SENDER_NAME);
    expect(exports[1].provide).toBe(RECIEVER_NAME);
  });


  // Tests that the forFeatureAsync method returns a DynamicModule with providers and exports
  it('should return a DynamicModule with providers and exports when options parameter is provided', async () => {
    // Arrange
    const options = {
      ...mockUseFactoryForFeatAsync,
      inject: []
    };

    // Act
    const dynamicModule: MockServiceModuleType = ServiceBusModule.forFeatureAsync(options);
    const { providers, exports, module } = dynamicModule;

    // Assert
    expect(dynamicModule).toBeDefined();
    expect(module).toBe(ServiceBusModule);
    expect(providers.length).toBe(3);
    expect(providers[0].provide).toBe(OPTIONS_PROVIDER);
    expect(providers[0].useFactory).toBeDefined();
    expect(providers[1].provide).toBe(SENDER_DECORATOR);
    expect(providers[1].useFactory).toBeDefined();
    expect(providers[2].provide).toBe(RECIEVER_DECORATOR);
    expect(providers[2].useFactory).toBeDefined();
    expect(exports.length).toBe(2);
    expect(exports[0].provide).toBe(SENDER_DECORATOR);
    expect(exports[1].provide).toBe(RECIEVER_DECORATOR);
  });

  // Tests that the forFeature method interacts correctly with useFactory when senders and recievers are set
  it('should return a DynamicModule with providers and exports when options parameter is provided', async () => {
    const options = { senders: ['testSender'], receivers: ['testReceiver'] };
    // Act
    const dynamicModule: MockServiceModuleType = ServiceBusModule.forFeature(options);
    const { providers } = dynamicModule;
    providers[0].useFactory({ createSender: jest.fn() });
    providers[1].useFactory({ createReceiver: jest.fn() });
    expect(providers[0].useFactory.constructor.name).toEqual("Function");
    expect(providers[1].useFactory.constructor.name).toEqual("Function");
  });


  // Tests that the forFeature method interacts correctly with useFactory when senders and recievers are NOT set
  it('should not break when options parameter are NOT provided', async () => {
    const options = {};
    // Act
    const dynamicModule: MockServiceModuleType = ServiceBusModule.forFeature(options);
    const { providers } = dynamicModule;
    expect(Array.isArray(providers)).toBeTruthy()
    expect(providers.length).toEqual(0)
  });



  // Tests that the forFeatureAsync method interacts correctly with useFactory when senders and recievers are set
  it('should return a DynamicModule with providers and exports when options parameter is provided', async () => {
    const options = { senders: ['testSender'], receivers: ['testReceiver'] };
    // Act
    const dynamicModule: MockServiceModuleType = ServiceBusModule.forFeatureAsync(mockUseFactoryForFeatAsync);
    const { providers, exports } = dynamicModule;
    providers[0].useFactory(options);
    providers[1].useFactory({ createSender: jest.fn() }, options);
    providers[2].useFactory({ createReceiver: jest.fn() }, options);

    exports[0].useFactory({ createSender: jest.fn() }, options);
    exports[1].useFactory({ createReceiver: jest.fn() }, options);

    expect(Array.isArray(providers)).toBeTruthy();
    expect(providers.length).toEqual(3);
    expect(Array.isArray(exports)).toBeTruthy();
    expect(exports.length).toEqual(2);
  });

})