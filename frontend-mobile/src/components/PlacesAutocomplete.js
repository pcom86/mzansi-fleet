import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, Modal, StyleSheet, Platform, StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const GOOGLE_API_KEY =
  Constants.expoConfig?.extra?.googlePlacesApiKey ||
  Constants.manifest2?.extra?.expoClient?.extra?.googlePlacesApiKey ||
  Constants.manifest?.extra?.googlePlacesApiKey ||
  '';

// Google Places JSON API does not include CORS headers, so direct fetch
// calls are blocked by browsers. On web we fall back to a plain text input.
const IS_WEB = Platform.OS === 'web';
const CAN_USE_PLACES_API = !IS_WEB && !!GOOGLE_API_KEY && GOOGLE_API_KEY !== 'YOUR_GOOGLE_PLACES_API_KEY_HERE';

const AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const DETAILS_URL      = 'https://maps.googleapis.com/maps/api/place/details/json';

/**
 * PlacesAutocomplete
 *
 * Props:
 *  value        {string}   – currently selected address text
 *  onSelect     {function} – called with { description, placeId, latitude, longitude }
 *  placeholder  {string}
 *  iconName     {string}   – Ionicons name for the trigger row icon
 *  iconColor    {string}
 *  c            {object}   – theme colors (background, surface, text, textMuted, border, primary)
 */
export default function PlacesAutocomplete({
  value = '',
  onSelect,
  placeholder = 'Search address…',
  iconName = 'location-outline',
  iconColor = '#10B981',
  c = {},
}) {
  const [modalVisible,  setModalVisible]  = useState(false);
  const [query,         setQuery]         = useState('');
  const [predictions,   setPredictions]   = useState([]);
  const [fetching,      setFetching]      = useState(false);
  const [resolving,     setResolving]     = useState(false);
  const debounceRef = useRef(null);
  const inputRef    = useRef(null);

  const bg      = c.background || '#f8fafc';
  const surface = c.surface    || '#ffffff';
  const txt     = c.text       || '#1e293b';
  const muted   = c.textMuted  || '#94a3b8';
  const border  = c.border     || '#e2e8f0';
  const primary = c.primary    || '#3B82F6';

  // Must be declared before any early return to satisfy Rules of Hooks
  const fetchPredictions = useCallback(async (input) => {
    if (!input || input.trim().length < 2) { setPredictions([]); return; }
    if (!CAN_USE_PLACES_API) { setPredictions([]); return; }
    setFetching(true);
    try {
      const url =
        `${AUTOCOMPLETE_URL}?input=${encodeURIComponent(input)}` +
        `&key=${GOOGLE_API_KEY}&components=country:za&language=en` +
        `&types=geocode|establishment`;
      const resp = await fetch(url);
      const json = await resp.json();
      setPredictions(json.status === 'OK' ? (json.predictions || []) : []);
    } catch {
      setPredictions([]);
    } finally {
      setFetching(false);
    }
  }, []);

  // ── Web fallback: plain TextInput (no CORS support for Places JSON API) ─
  if (IS_WEB) {
    return (
      <View style={[styles.trigger, { borderColor: border, backgroundColor: bg }]}>
        <Ionicons name={iconName} size={16} color={value ? iconColor : muted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.triggerText, { color: txt, flex: 1, padding: 0 }]}
          value={value}
          onChangeText={text => onSelect?.({ description: text, placeId: null, latitude: null, longitude: null })}
          placeholder={placeholder}
          placeholderTextColor={muted}
        />
        {value ? (
          <TouchableOpacity
            onPress={() => onSelect?.({ description: '', placeId: null, latitude: null, longitude: null })}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons name="close-circle" size={17} color={muted} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }
  function handleChangeText(text) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(text), 350);
  }

  // ── Fetch place lat/lng then close modal ────────────────────────────────
  async function handleSelectPrediction(pred) {
    setResolving(true);
    let latitude = null;
    let longitude = null;
    try {
      if (GOOGLE_API_KEY && pred.place_id) {
        const url =
          `${DETAILS_URL}?place_id=${pred.place_id}&fields=geometry&key=${GOOGLE_API_KEY}`;
        const resp = await fetch(url);
        const json = await resp.json();
        if (json.status === 'OK') {
          const loc = json.result?.geometry?.location;
          if (loc) { latitude = loc.lat; longitude = loc.lng; }
        }
      }
    } catch {}
    finally { setResolving(false); }
    onSelect?.({ description: pred.description, placeId: pred.place_id, latitude, longitude });
    closeModal();
  }

  // ── Use the typed text as-is (manual fallback) ──────────────────────────
  function handleManualConfirm() {
    if (!query.trim()) return;
    onSelect?.({ description: query.trim(), placeId: null, latitude: null, longitude: null });
    closeModal();
  }

  function openModal() {
    setQuery('');
    setPredictions([]);
    setModalVisible(true);
    setTimeout(() => inputRef.current?.focus(), 120);
  }

  function closeModal() {
    setModalVisible(false);
    setPredictions([]);
    setQuery('');
  }

  const hasQuery = query.trim().length >= 2;

  return (
    <>
      {/* ── Trigger row ─────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[
          styles.trigger,
          { borderColor: value ? `${iconColor}80` : border, backgroundColor: bg },
        ]}
        onPress={openModal}
        activeOpacity={0.75}
      >
        <Ionicons name={iconName} size={16} color={value ? iconColor : muted} style={{ marginRight: 8 }} />
        <Text style={[styles.triggerText, { color: value ? txt : muted }]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        {value ? (
          <TouchableOpacity
            onPress={() => onSelect?.({ description: '', placeId: null, latitude: null, longitude: null })}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons name="close-circle" size={17} color={muted} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-down" size={14} color={muted} />
        )}
      </TouchableOpacity>

      {/* ── Full-screen search modal ─────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={[styles.modalRoot, { backgroundColor: bg }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Search bar + cancel */}
          <View
            style={[
              styles.modalHead,
              {
                borderBottomColor: border,
                paddingTop:
                  Platform.OS === 'android'
                    ? (StatusBar.currentHeight || 24) + 10
                    : 16,
              },
            ]}
          >
            <View style={[styles.searchRow, { backgroundColor: surface, borderColor: border }]}>
              <Ionicons name="search-outline" size={16} color={muted} style={{ marginRight: 8 }} />
              <TextInput
                ref={inputRef}
                style={[styles.searchInput, { color: txt }]}
                value={query}
                onChangeText={handleChangeText}
                placeholder={placeholder}
                placeholderTextColor={muted}
                returnKeyType="search"
                onSubmitEditing={handleManualConfirm}
                autoFocus
              />
              {fetching ? (
                <ActivityIndicator size="small" color={primary} style={{ marginLeft: 4 }} />
              ) : query.length > 0 ? (
                <TouchableOpacity onPress={() => { setQuery(''); setPredictions([]); }}>
                  <Ionicons name="close-circle" size={16} color={muted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity onPress={closeModal} style={{ marginLeft: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: primary }}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Resolving overlay */}
          {resolving ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={iconColor} />
              <Text style={{ color: muted, marginTop: 12, fontSize: 13 }}>Fetching location…</Text>
            </View>
          ) : (
            <FlatList
              data={predictions}
              keyExtractor={item => item.place_id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
              ListHeaderComponent={
                hasQuery ? (
                  /* "Use typed text" shortcut */
                  <TouchableOpacity
                    style={[styles.predRow, { borderBottomColor: border, backgroundColor: surface }]}
                    onPress={handleManualConfirm}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.predIcon, { backgroundColor: `${iconColor}18` }]}>
                      <Ionicons name="create-outline" size={14} color={iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: txt }}>
                        Use "{query.trim()}"
                      </Text>
                      <Text style={{ fontSize: 11, color: muted, marginTop: 1 }}>
                        Enter address manually
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={14} color={muted} />
                  </TouchableOpacity>
                ) : null
              }
              ListEmptyComponent={
                !fetching && hasQuery && !GOOGLE_API_KEY ? (
                  <View style={{ alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 }}>
                    <Ionicons name="key-outline" size={40} color={muted} />
                    <Text style={{ color: txt, fontWeight: '700', fontSize: 14, marginTop: 12, textAlign: 'center' }}>
                      Google Places key not configured
                    </Text>
                    <Text style={{ color: muted, fontSize: 12, marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
                      Add your key to app.json → extra → googlePlacesApiKey.{'\n'}
                      Use the "Use …" option above to enter the address manually in the meantime.
                    </Text>
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.predRow, { borderBottomColor: border, backgroundColor: surface }]}
                  onPress={() => handleSelectPrediction(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.predIcon, { backgroundColor: `${iconColor}18` }]}>
                    <Ionicons name="location-outline" size={14} color={iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: txt }} numberOfLines={1}>
                      {item.structured_formatting?.main_text || item.description}
                    </Text>
                    {item.structured_formatting?.secondary_text ? (
                      <Text style={{ fontSize: 11, color: muted, marginTop: 2 }} numberOfLines={1}>
                        {item.structured_formatting.secondary_text}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="arrow-forward" size={14} color={muted} />
                </TouchableOpacity>
              )}
            />
          )}
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    marginBottom: 2,
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  modalRoot: {
    flex: 1,
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
  },
  predRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  predIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
