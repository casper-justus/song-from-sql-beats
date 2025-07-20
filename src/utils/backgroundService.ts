import { BackgroundService } from 'capacitor-plugin-backgroundservice';

export const startService = async () => {
  await BackgroundService.startService();
};

export const stopService = async () => {
  await BackgroundService.stopService();
};
