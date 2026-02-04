// @ts-ignore - Capacitor types are optional, only needed when building native apps
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.sdp.memberportal',
  appName: 'SDP Member Portal',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // For development, you can use:
    // url: 'http://localhost:3000',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#f48735',
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#ffffff',
    },
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  ios: {
    scheme: 'SDP Portal',
  },
};

export default config;
