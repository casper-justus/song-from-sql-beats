import { LocalNotifications } from '@capacitor/local-notifications';

export const scheduleNotification = async (title: string, body: string, at: Date) => {
  await LocalNotifications.schedule({
    notifications: [
      {
        title,
        body,
        id: 1,
        schedule: { at },
      },
    ],
  });
};
