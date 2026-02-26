import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useAppTheme } from './src/theme';
import LoginScreen from './src/screens/LoginScreen';
import ProfileSelectionScreen from './src/screens/ProfileSelectionScreen';
import OnboardingWizardScreen from './src/screens/OnboardingWizardScreen';
import DriverRegistrationScreen from './src/screens/DriverRegistrationScreen';
import ServiceProviderRegistrationScreen from './src/screens/ServiceProviderRegistrationScreen';
import OwnerRegistrationScreen from './src/screens/OwnerRegistrationScreen';
import OwnerDashboardScreen from './src/screens/OwnerDashboardScreen';
import VehiclePerformanceScreen from './src/screens/VehiclePerformanceScreen';
import TaxiRankDashboardScreen from './src/screens/TaxiRankDashboardScreen';
import TaxiRankDetailsScreen from './src/screens/TaxiRankDetailsScreen';
import OwnerVehiclesScreen from './src/screens/OwnerVehiclesScreen';
import OwnerVehicleDetailsScreen from './src/screens/OwnerVehicleDetailsScreen';
import OwnerVehicleFormScreen from './src/screens/OwnerVehicleFormScreen';
import OwnerVehicleFinancialEntryScreen from './src/screens/OwnerVehicleFinancialEntryScreen';
import VehicleWeekDetailsScreen from './src/screens/VehicleWeekDetailsScreen';
import OwnerMessagesScreen from './src/screens/OwnerMessagesScreen';
import OwnerMessageDetailsScreen from './src/screens/OwnerMessageDetailsScreen';
import OwnerComposeMessageScreen from './src/screens/OwnerComposeMessageScreen';
import OwnerMaintenanceRequestDetailsScreen from './src/screens/OwnerMaintenanceRequestDetailsScreen';
import OwnerTendersScreen from './src/screens/OwnerTendersScreen';
import RentalMarketplaceScreen from './src/screens/RentalMarketplaceScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { theme, mode, setMode } = useAppTheme();
  const c = theme.colors;

  const navTheme = {
    dark: theme.mode === 'dark',
    colors: {
      primary: c.primary,
      background: c.background,
      card: c.surface,
      text: c.text,
      border: c.border,
      notification: c.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: { backgroundColor: c.surface },
          headerTintColor: c.text,
          contentStyle: { backgroundColor: c.background },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 12,
                backgroundColor: c.surface2,
                borderWidth: 1,
                borderColor: c.border,
              }}
              accessibilityRole="button"
              accessibilityLabel="Toggle theme"
            >
              <Ionicons
                name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={c.text}
              />
            </TouchableOpacity>
          ),
        }}
      >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ProfileSelection" component={ProfileSelectionScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingWizardScreen} />
          <Stack.Screen name="DriverRegistration" component={DriverRegistrationScreen} />
          <Stack.Screen name="ServiceProviderRegistration" component={ServiceProviderRegistrationScreen} />
          <Stack.Screen name="OwnerRegistration" component={OwnerRegistrationScreen} />
          <Stack.Screen name="OwnerDashboard" component={OwnerDashboardScreen} />
          <Stack.Screen name="VehiclePerformance" component={VehiclePerformanceScreen} />
          <Stack.Screen name="VehicleWeekDetails" component={VehicleWeekDetailsScreen} />
          <Stack.Screen name="OwnerVehicles" component={OwnerVehiclesScreen} />
          <Stack.Screen name="OwnerVehicleDetails" component={OwnerVehicleDetailsScreen} />
          <Stack.Screen name="OwnerVehicleForm" component={OwnerVehicleFormScreen} />
          <Stack.Screen name="OwnerVehicleFinancialEntry" component={OwnerVehicleFinancialEntryScreen} />
          <Stack.Screen name="OwnerMessages" component={OwnerMessagesScreen} />
          <Stack.Screen name="OwnerMessageDetails" component={OwnerMessageDetailsScreen} />
          <Stack.Screen name="OwnerComposeMessage" component={OwnerComposeMessageScreen} />
          <Stack.Screen name="OwnerMaintenanceRequestDetails" component={OwnerMaintenanceRequestDetailsScreen} />
          <Stack.Screen name="OwnerTenders" component={OwnerTendersScreen} />
          <Stack.Screen name="RentalMarketplace" component={RentalMarketplaceScreen} />
          <Stack.Screen name="TaxiRankDashboard" component={TaxiRankDashboardScreen} />
          <Stack.Screen name="TaxiRankDetails" component={TaxiRankDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
