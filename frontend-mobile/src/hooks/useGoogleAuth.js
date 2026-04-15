import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

const extra = Constants.expoConfig?.extra || {};

export default function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: extra.googleClientId,
    androidClientId: extra.googleAndroidClientId,
    iosClientId: extra.googleIosClientId,
  });

  return { request, response, promptAsync };
}
