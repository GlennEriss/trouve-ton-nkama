module.exports = {
  getMessaging: jest.fn(() => ({})),
  requestPermission: jest.fn(async () => 1),
  getToken: jest.fn(async () => 'mock-fcm-token'),
  onTokenRefresh: jest.fn(() => jest.fn()),
  onMessage: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  getInitialNotification: jest.fn(async () => null),
  AuthorizationStatus: { NOT_DETERMINED: -1, DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2 },
};
