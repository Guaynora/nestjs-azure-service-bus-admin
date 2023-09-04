import { DynamicModule, Module } from '@nestjs/common';
import { AzureServiceBusAdminService } from './azure-service-bus-admin.service';
import { AzureServiceBusAdminOptions } from './azure-service-bus-admin-options.interface';

@Module({})
export class AzureServiceBusModule {
  static forRoot(options: AzureServiceBusAdminOptions): DynamicModule {
    return {
      module: AzureServiceBusModule,
      providers: [
        {
          provide: 'SERVICE_BUS_ADMIN_OPTIONS',
          useValue: options,
        },
        AzureServiceBusAdminService,
      ],
      exports: [AzureServiceBusAdminService],
    };
  }
}
