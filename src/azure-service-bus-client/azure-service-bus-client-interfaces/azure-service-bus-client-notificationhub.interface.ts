
/**
 * Types of notification hub operations
 */
export type NotificacionAudienceCreate = {
  Id: string;
  User: string;
  CodeCore: string;
  OperationSystem: string;
  DeviceToken: string;
  Email: string;
  DeviceiOSToken?: string;
  IdApplication?: string;
};

export type NotificacionAudienceDelete = {
  id: string;
  deviceToken: string;
};