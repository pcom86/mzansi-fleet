import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  StyleSheet, Alert, TextInput, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import client from '../api/client';
import Constants from 'expo-constants';
import * as Location from 'expo-location';

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const GREEN = '#22c55e';

export default function TripRequestAddressScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchingRanks, setSearchingRanks] = useState(false);
  const [nearbyRanks, setNearbyRanks] = useState([]);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);

  const apiKey = Constants.expoConfig?.extra?.googlePlacesApiKey ?? '';
  const hasValidKey = apiKey && !apiKey.includes('YOUR_');
  const searchDistanceKm = Constants.expoConfig?.extra?.taxiRankSearchDistanceKm ?? 20;

  const geocodeAddress = async (address) => {
    if (!address || !hasValidKey) return null;
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
      );
      const data = await response.json();
      if (data.results && data.results[0]) {
        return data.results[0].geometry.location;
      }
    } catch (err) {
      console.warn('Geocoding error:', err);
    }
    return null;
  };

  const getPlacePredictions = async (input) => {
    if (!input || !hasValidKey) return [];
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`
      );
      const data = await response.json();
      if (data.predictions) {
        return data.predictions.map(p => ({
          placeId: p.place_id,
          description: p.description,
          mainText: p.structured_formatting?.main_text || p.description,
          secondaryText: p.structured_formatting?.secondary_text || '',
        }));
      }
    } catch (err) {
      console.warn('Places autocomplete error:', err);
    }
    return [];
  };

  const getPlaceDetails = async (placeId) => {
    if (!placeId || !hasValidKey) return null;
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${apiKey}`
      );
      const data = await response.json();
      if (data.result) {
        return {
          address: data.result.formatted_address,
          location: data.result.geometry?.location,
        };
      }
    } catch (err) {
      console.warn('Place details error:', err);
    }
    return null;
  };

  let pickupDebounceTimer = null;
  let destinationDebounceTimer = null;

  const handlePickupChange = (text) => {
    setPickupAddress(text);
    if (pickupDebounceTimer) clearTimeout(pickupDebounceTimer);
    if (text.length > 2) {
      pickupDebounceTimer = setTimeout(async () => {
        const predictions = await getPlacePredictions(text);
        setPickupSuggestions(predictions);
        setShowPickupSuggestions(predictions.length > 0);
      }, 300);
    } else {
      setPickupSuggestions([]);
      setShowPickupSuggestions(false);
    }
  };

  const handleDestinationChange = (text) => {
    setDestinationAddress(text);
    if (destinationDebounceTimer) clearTimeout(destinationDebounceTimer);
    if (text.length > 2) {
      destinationDebounceTimer = setTimeout(async () => {
        const predictions = await getPlacePredictions(text);
        setDestinationSuggestions(predictions);
        setShowDestinationSuggestions(predictions.length > 0);
      }, 300);
    } else {
      setDestinationSuggestions([]);
      setShowDestinationSuggestions(false);
    }
  };

  const handlePickupSuggestionPress = async (suggestion) => {
    setShowPickupSuggestions(false);
    setPickupAddress(suggestion.description);
    const details = await getPlaceDetails(suggestion.placeId);
    if (details) {
      setPickupAddress(details.address);
    }
  };

  const handleDestinationSuggestionPress = async (suggestion) => {
    setShowDestinationSuggestions(false);
    setDestinationAddress(suggestion.description);
    const details = await getPlaceDetails(suggestion.placeId);
    if (details) {
      setDestinationAddress(details.address);
    }
  };

  const searchNearbyTaxiRanks = async (pickupCoords, destCoords) => {
    try {
      setSearchingRanks(true);
      const response = await client.get('/TaxiRanks');
      const allRanks = response.data || [];

      // Calculate distance from pickup to each rank
      const ranksWithDistance = allRanks.map(rank => {
        const rankLat = rank.latitude || rank.Latitude || 0;
        const rankLng = rank.longitude || rank.Longitude || 0;

        // Calculate distance using Haversine formula (returns distance in km)
        const distance = calculateDistance(
          pickupCoords.lat, pickupCoords.lng,
          rankLat, rankLng
        );

        return {
          ...rank,
          distance,
          distanceKm: distance.toFixed(1)
        };
      });

      // Sort by distance and filter to nearby ranks (within configurable distance)
      const nearby = ranksWithDistance
        .filter(r => r.distance <= searchDistanceKm)
        .sort((a, b) => a.distance - b.distance);

      setNearbyRanks(nearby);
      return nearby;
    } catch (err) {
      console.warn('Error searching nearby ranks:', err);
      Alert.alert('Error', 'Failed to search for nearby taxi ranks');
      return [];
    } finally {
      setSearchingRanks(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const handleSearchRanks = async () => {
    if (!pickupAddress.trim()) {
      Alert.alert('Required', 'Please enter your pickup address');
      return;
    }
    if (!destinationAddress.trim()) {
      Alert.alert('Required', 'Please enter your destination address');
      return;
    }

    setLoading(true);
    try {
      // Geocode both addresses
      const pickupCoords = await geocodeAddress(pickupAddress);
      const destCoords = await geocodeAddress(destinationAddress);

      if (!pickupCoords) {
        Alert.alert('Error', 'Could not find pickup address. Please check the address and try again.');
        setLoading(false);
        return;
      }
      if (!destCoords) {
        Alert.alert('Error', 'Could not find destination address. Please check the address and try again.');
        setLoading(false);
        return;
      }

      // Search for nearby taxi ranks
      const ranks = await searchNearbyTaxiRanks(pickupCoords, destCoords);

      if (ranks.length === 0) {
        Alert.alert('No Ranks Found', 'No nearby taxi ranks found. Please try a different pickup address.');
        setLoading(false);
        return;
      }

      // Navigate to rank selection screen with the data
      navigation.navigate('TaxiRankSelection', {
        pickupAddress: pickupAddress.trim(),
        destinationAddress: destinationAddress.trim(),
        pickupCoords,
        destCoords,
        nearbyRanks: ranks
      });
    } catch (err) {
      console.error('Error:', err);
      Alert.alert('Error', 'Failed to process addresses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!hasValidKey) {
      Alert.alert('API Key Required', 'Google Places API key is required for location services. Please configure it in app.json');
      return;
    }

    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use your current location');
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      console.log('Current location:', latitude, longitude);

      // Reverse geocode to get address
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
      console.log('Geocoding URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      console.log('Geocoding response:', data);

      if (data.status === 'OK' && data.results && data.results[0]) {
        const address = data.results[0].formatted_address;
        setPickupAddress(address);
        Alert.alert('Success', 'Current location set as pickup address');
      } else if (data.status === 'REQUEST_DENIED') {
        Alert.alert('API Error', `Google API request denied: ${data.error_message || 'Invalid API key or missing permissions'}`);
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        Alert.alert('API Error', 'Google API quota exceeded. Please check your billing settings');
      } else if (data.status === 'ZERO_RESULTS') {
        Alert.alert('Location Error', 'Could not find an address for this location. Try moving to a different location');
      } else {
        Alert.alert('Error', `Failed to get address: ${data.status || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error getting current location:', err);
      Alert.alert('Error', `Failed to get current location: ${err.message || 'Please try again'}`);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Where to?</Text>
          <Text style={styles.headerSub}>Enter your pickup and destination</Text>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* Pickup Address */}
        <View style={[styles.inputSection, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.inputHeader}>
            <View style={[styles.iconCircle, { backgroundColor: GOLD_LIGHT }]}>
              <Ionicons name="location" size={20} color={GOLD} />
            </View>
            <Text style={[styles.inputLabel, { color: c.text }]}>Pickup Address</Text>
          </View>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Enter pickup address or location"
            placeholderTextColor={c.textMuted}
            value={pickupAddress}
            onChangeText={handlePickupChange}
            autoCapitalize="words"
          />
          {showPickupSuggestions && pickupSuggestions.length > 0 && (
            <View style={[styles.suggestionsContainer, { backgroundColor: c.surface, borderColor: c.border }]}>
              <ScrollView style={styles.suggestionsScroll} nestedScrollEnabled={true}>
                {pickupSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={suggestion.placeId}
                    style={[styles.suggestionItem, { borderBottomColor: c.border }]}
                    onPress={() => handlePickupSuggestionPress(suggestion)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.suggestionMainText, { color: c.text }]}>{suggestion.mainText}</Text>
                      {suggestion.secondaryText && (
                        <Text style={[styles.suggestionSecondaryText, { color: c.textMuted }]}>{suggestion.secondaryText}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <TouchableOpacity 
            style={styles.locationBtn}
            onPress={handleUseCurrentLocation}
          >
            <Ionicons name="navigate" size={16} color={GOLD} />
            <Text style={styles.locationBtnText}>Use current location</Text>
          </TouchableOpacity>
        </View>

        {/* Destination Address */}
        <View style={[styles.inputSection, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.inputHeader}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
              <Ionicons name="flag" size={20} color="#ef4444" />
            </View>
            <Text style={[styles.inputLabel, { color: c.text }]}>Destination Address</Text>
          </View>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Enter destination address"
            placeholderTextColor={c.textMuted}
            value={destinationAddress}
            onChangeText={handleDestinationChange}
            autoCapitalize="words"
          />
          {showDestinationSuggestions && destinationSuggestions.length > 0 && (
            <View style={[styles.suggestionsContainer, { backgroundColor: c.surface, borderColor: c.border }]}>
              <ScrollView style={styles.suggestionsScroll} nestedScrollEnabled={true}>
                {destinationSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={suggestion.placeId}
                    style={[styles.suggestionItem, { borderBottomColor: c.border }]}
                    onPress={() => handleDestinationSuggestionPress(suggestion)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.suggestionMainText, { color: c.text }]}>{suggestion.mainText}</Text>
                      {suggestion.secondaryText && (
                        <Text style={[styles.suggestionSecondaryText, { color: c.textMuted }]}>{suggestion.secondaryText}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Ionicons name="information-circle" size={20} color={GOLD} />
          <Text style={[styles.infoText, { color: c.textMuted }]}>
            We'll search for nearby taxi ranks that serve routes matching your pickup and destination.
          </Text>
        </View>

        {/* Search Button */}
        <TouchableOpacity
          style={[styles.searchBtn, { backgroundColor: GOLD }]}
          onPress={handleSearchRanks}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <Ionicons name="search" size={20} color="#000" />
              <Text style={styles.searchBtnText}>Find Taxi Ranks</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1a1a2e',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  headerSub: {
    fontSize: 13,
    color: GOLD,
    marginTop: 2,
    fontWeight: '600',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: GOLD,
  },
  suggestionsContainer: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: -8,
    marginBottom: 12,
    maxHeight: 200,
  },
  suggestionsScroll: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  suggestionMainText: {
    fontSize: 15,
    fontWeight: '600',
  },
  suggestionSecondaryText: {
    fontSize: 13,
    marginTop: 2,
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  searchBtn: {
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  searchBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
  },
});
