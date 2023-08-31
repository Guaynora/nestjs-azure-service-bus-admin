import { DynamicModule, Module } from '@nestjs/common';
import { ServiceBusAdminService } from './azure-service-bus-admin.service';
import { ServiceBusAdminOptions } from './azure-service-bus-admin-options.interface';

@Module({})
export class ServiceBusModule {
  static forRoot(options: ServiceBusAdminOptions): DynamicModule {
    return {
      module: ServiceBusModule,
      providers: [
        {
          provide: 'SERVICE_BUS_ADMIN_OPTIONS',
          useValue: options,
        },
        ServiceBusAdminService,
      ],
      exports: [ServiceBusAdminService],
    };
  }
}
