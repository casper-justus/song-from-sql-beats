import { SecureStorage } from 'capacitor-secure-storage';

export const setItem = async (key: string, value: string) => {
  await SecureStorage.set({ key, value });
};

export const getItem = async (key: string) => {
  const { value } = await SecureStorage.get({ key });
  return value;
};

export const removeItem = async (key: string) => {
  await SecureStorage.remove({ key });
};
