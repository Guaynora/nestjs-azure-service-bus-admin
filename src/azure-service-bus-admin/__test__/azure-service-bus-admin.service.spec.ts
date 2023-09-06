import { ServiceBusAdminService } from "../azure-service-bus-admin.service";
import * as serviceBus from '@azure/service-bus';

const mockServiceBusAdministrationClient = jest.spyOn(serviceBus, "ServiceBusAdministrationClient");

const mockCreateQueue = jest.fn();
const mockQueueExists = jest.fn();
const mockGetQueue = jest.fn();
const mockCreateTopic = jest.fn();
const mockGetTopic = jest.fn();
const mockTopicExists = jest.fn();
const mockCreateSubscription = jest.fn();
const mockGetSubscription = jest.fn();
const mockSubscriptionExists = jest.fn();

const mockserviClientProps = {
    queueExists: mockQueueExists,
    getQueue: mockGetQueue,
    createQueue: mockCreateQueue,
    topicExists: mockTopicExists,
    getTopic: mockGetTopic,
    createTopic: mockCreateTopic,
    subscriptionExists: mockSubscriptionExists,
    getSubscription: mockGetSubscription,
    createSubscription: mockCreateSubscription
}

const servBusOptions = { connectionString: "testconnectionString" }

beforeAll(() => {
    mockServiceBusAdministrationClient.mockReturnValue(mockserviClientProps as never)
});

beforeEach(() => {
    jest.clearAllMocks()
})


describe('ServiceBusAdminService', () => {

    // Tests that the createQueue method successfully creates a queue when it does not exist
    it('should create a queue when it does not exist', async () => {
        const mockQueueName = 'testQueue';
        mockServiceBusAdministrationClient.mockReturnValue({
            ...mockserviClientProps,
            queueExists: () => false,
            createQueue: mockCreateQueue.mockReturnValue({ name: mockQueueName })
        } as never);

        // Arrange
        const serviceBusAdminService = new ServiceBusAdminService(servBusOptions);
        // Act
        const { name } = await serviceBusAdminService.createQueue(mockQueueName);
        expect(mockCreateQueue).toHaveBeenCalled();
        expect(name).toEqual(mockQueueName);
    });

    // Tests that the createQueue method successfully get a queue when it exists
    it('should get a queue when it does exist', async () => {
        const mockQueueName = 'testQueue';
        mockServiceBusAdministrationClient.mockReturnValue({
            ...mockserviClientProps,
            queueExists: () => true,
        } as never);

        // Arrange
        const serviceBusAdminService = new ServiceBusAdminService(servBusOptions);
        // Act
        await serviceBusAdminService.createQueue(mockQueueName);
        expect(mockGetQueue).toHaveBeenCalled();
    });

    // Tests that the createTopic method successfully creates a topic when it does not exist
    it('should create a topic when it does not exist', async () => {
        // Arrange
        const mocktopicName = 'testTopic';
        mockServiceBusAdministrationClient.mockReturnValue({
            ...mockserviClientProps,
            topicExists: () => false,
            createTopic: mockCreateTopic.mockReturnValue({ name: mocktopicName })
        } as never);
        const serviceBusAdminService = new ServiceBusAdminService(servBusOptions);
        // Act
        const result = await serviceBusAdminService.createTopic(mocktopicName);
        // Assert
        expect(result).toBeDefined();
        expect(mockCreateTopic).toHaveBeenCalled();
        expect(result.name).toBe(mocktopicName);
    });

    // Tests that the createTopic method successfully get a topic when it exists
    it('should get a topic when it does exist', async () => {
        const mockQueueName = 'testTopic';
        mockServiceBusAdministrationClient.mockReturnValue({
            ...mockserviClientProps,
            topicExists: mockTopicExists.mockReturnValue(true),
        } as never);

        // Arrange
        const serviceBusAdminService = new ServiceBusAdminService(servBusOptions);
        // Act
        await serviceBusAdminService.createTopic(mockQueueName);
        expect(mockTopicExists).toHaveBeenCalled();
    });



    // Tests that the createSubscription method successfully creates a subscription when it does not exist
    it('should create a subscription when it does not exist', async () => {
        // Arrange
        const topicName = 'testTopic';
        const subscriptionName = 'testSubscription';
        mockServiceBusAdministrationClient.mockReturnValue({
            ...mockserviClientProps,
            subscriptionExists: mockSubscriptionExists.mockReturnValue(false),
            createSubscription: mockCreateSubscription.mockReturnValue({ subscriptionName: subscriptionName })
        } as never);
        const serviceBusAdminService = new ServiceBusAdminService(servBusOptions);
        // Act
        const result = await serviceBusAdminService.createSubscription(topicName, subscriptionName);
        // Assert
        expect(result).toBeDefined();
        expect(result.subscriptionName).toBe(subscriptionName);
        expect(mockSubscriptionExists).toHaveBeenCalled();
        expect(mockCreateSubscription).toHaveBeenCalled();
    });

    // Tests that the createSubscription method successfully gets a subscription when it exist
    it('should get a subscription when it exist', async () => {
        // Arrange
        const topicName = 'testTopic';
        const subscriptionName = 'testSubscription';
        mockServiceBusAdministrationClient.mockReturnValue({
            ...mockserviClientProps,
            subscriptionExists: mockSubscriptionExists.mockReturnValue(true),
        } as never);
        const serviceBusAdminService = new ServiceBusAdminService(servBusOptions);
        // Act
        await serviceBusAdminService.createSubscription(topicName, subscriptionName);
        // Assert
        expect(mockGetSubscription).toHaveBeenCalled();
    });
});
