import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getExpoProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    ''
  );
}

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') {
    return '';
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('mindpath-alerts', {
      name: 'MindPath Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4A90D9',
    });
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermissions.status;

  if (finalStatus !== 'granted') {
    const permissionResponse = await Notifications.requestPermissionsAsync();
    finalStatus = permissionResponse.status;
  }

  if (finalStatus !== 'granted') {
    return '';
  }

  const projectId = getExpoProjectId();

  if (!projectId) {
    console.warn('Expo push registration skipped because the EAS project ID is missing.');
    return '';
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return tokenResponse.data || '';
}
