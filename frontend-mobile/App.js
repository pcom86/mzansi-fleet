import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import DriverDashboardScreen from './src/screens/DriverDashboardScreen';
import DriverOnboardingStep2Screen from './src/screens/DriverOnboardingStep2Screen';
import ServiceProviderRegistrationScreen from './src/screens/ServiceProviderRegistrationScreen';
import ServiceProviderDashboardScreen from './src/screens/ServiceProviderDashboardScreen';
import ServiceProviderEditScreen from './src/screens/ServiceProviderEditScreen';
import ServiceProviderBookingsScreen from './src/screens/ServiceProviderBookingsScreen';
import ServiceProviderScheduleBookingScreen from './src/screens/ServiceProviderScheduleBookingScreen';
import ServiceProviderScheduleManagerScreen from './src/screens/ServiceProviderScheduleManagerScreen';
import ServiceProviderJobHistoryScreen from './src/screens/ServiceProviderJobHistoryScreen';
import OwnerBookServiceScreen from './src/screens/OwnerBookServiceScreen';
import OwnerNewMaintenanceRequestScreen from './src/screens/OwnerNewMaintenanceRequestScreen';
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
import TaxiRankRoleSelectionScreen from './src/screens/TaxiRankRoleSelectionScreen';
import TaxiRankRoutesScreen from './src/screens/TaxiRankRoutesScreen';
import TaxiRankEditScreen from './src/screens/TaxiRankEditScreen';
import TaxiRankVehiclesScreen from './src/screens/TaxiRankVehiclesScreen';
import BookTripScreen from './src/screens/BookTripScreen';
import CaptureTripScreen from './src/screens/CaptureTripScreen';
import MyBookingsScreen from './src/screens/MyBookingsScreen';
import AdminTripDetailsScreen from './src/screens/AdminTripDetailsScreen';
import CreateTripScheduleScreen from './src/screens/CreateTripScheduleScreen';
import { ConnectivityProvider } from './src/context/ConnectivityContext';
import BackendStatusBanner from './src/components/BackendStatusBanner';

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
          headerBackImage: ({ tintColor }) => (
            <Ionicons name="chevron-back" size={24} color={tintColor} />
          ),
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
          <Stack.Screen name="TaxiRankRoleSelection" component={TaxiRankRoleSelectionScreen} options={{ title: 'Taxi Rank Registration' }} />
          <Stack.Screen name="DriverRegistration" component={DriverRegistrationScreen} />
          <Stack.Screen name="DriverDashboard" component={DriverDashboardScreen} options={{ headerShown: false }} />
          <Stack.Screen name="DriverOnboardingStep2" component={DriverOnboardingStep2Screen} options={{ title: 'Driver Details' }} />
          <Stack.Screen name="ServiceProviderRegistration" component={ServiceProviderRegistrationScreen} />
          <Stack.Screen name="ServiceProviderDashboard" component={ServiceProviderDashboardScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ServiceProviderEdit" component={ServiceProviderEditScreen} options={{ title: 'Edit Profile' }} />
          <Stack.Screen name="SPBookings" component={ServiceProviderBookingsScreen} options={{ title: 'My Bookings & Schedule' }} />
          <Stack.Screen name="SPScheduleBooking" component={ServiceProviderScheduleBookingScreen} options={{ title: 'Schedule a Booking' }} />
          <Stack.Screen name="SPScheduleManager" component={ServiceProviderScheduleManagerScreen} options={{ title: 'Daily Schedule' }} />
          <Stack.Screen name="SPJobHistory" component={ServiceProviderJobHistoryScreen} options={{ title: 'Job History' }} />
          <Stack.Screen name="OwnerBookService" component={OwnerBookServiceScreen} options={{ title: 'Book a Service' }} />
          <Stack.Screen name="OwnerNewMaintenanceRequest" component={OwnerNewMaintenanceRequestScreen} options={{ title: 'New Maintenance Request' }} />
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
          <Stack.Screen name="TaxiRankDashboard" component={TaxiRankDashboardScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TaxiRankDetails" component={TaxiRankDetailsScreen} />
          <Stack.Screen name="TaxiRankRoutes" component={TaxiRankRoutesScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TaxiRankEdit" component={TaxiRankEditScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TaxiRankVehicles" component={TaxiRankVehiclesScreen} options={{ headerShown: false }} />
          <Stack.Screen name="BookTrip" component={BookTripScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CaptureTrip" component={CaptureTripScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MyBookings" component={MyBookingsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AdminTripDetails" component={AdminTripDetailsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CreateTripSchedule" component={CreateTripScheduleScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ConnectivityProvider>
          <AuthProvider>
            <BackendStatusBanner />
            <AppNavigator />
          </AuthProvider>
        </ConnectivityProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
