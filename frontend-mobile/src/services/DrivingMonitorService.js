import { Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { recordBehaviorEvent, BEHAVIOR_CATEGORIES } from '../api/driverBehavior';

// ── Thresholds (configurable) ────────────────────────────────────────────────
const THRESHOLDS = {
  harshBraking: 1.8,          // g-force delta (sudden deceleration)
  harshAcceleration: 1.6,     // g-force delta (sudden acceleration)
  sharpTurn: 2.0,             // lateral g-force
  speedLimit: 120,            // km/h — general road speed limit
  urbanSpeedLimit: 60,        // km/h — urban zone speed limit
  speedSustainedMs: 5000,     // must exceed limit for this long to trigger
  cooldownMs: 30000,          // min time between same-type events (30s)
  locationIntervalMs: 3000,   // GPS poll interval
  accelIntervalMs: 200,       // accelerometer sample interval
};

// ── State ────────────────────────────────────────────────────────────────────
let _isMonitoring = false;
let _accelSubscription = null;
let _locationSubscription = null;
let _driverId = null;
let _vehicleId = null;
let _tenantId = null;
let _reporterId = null;

// Cooldown tracking (prevents event spam)
let _lastEventTimes = {};

// Accelerometer history for detecting sudden changes
let _accelHistory = [];
const ACCEL_WINDOW = 5; // number of samples to keep

// Speed tracking for sustained speeding
let _speedOverLimitSince = null;
let _currentSpeed = 0;

// Callbacks
let _onEvent = null;      // (event) => void — UI notification callback
let _onStatusChange = null; // (status) => void

// ── Helpers ──────────────────────────────────────────────────────────────────
function magnitude(x, y, z) {
  return Math.sqrt(x * x + y * y + z * z);
}

function canFireEvent(category) {
  const now = Date.now();
  const last = _lastEventTimes[category] || 0;
  if (now - last < THRESHOLDS.cooldownMs) return false;
  _lastEventTimes[category] = now;
  return true;
}

function getCategoryDef(key) {
  return BEHAVIOR_CATEGORIES.find(c => c.key === key);
}

async function fireEvent(categoryKey, extraDescription, location) {
  if (!canFireEvent(categoryKey)) return;

  const catDef = getCategoryDef(categoryKey);
  if (!catDef) return;

  const event = {
    driverId: _driverId,
    vehicleId: _vehicleId,
    tenantId: _tenantId,
    reportedById: _reporterId,
    category: catDef.key,
    severity: catDef.severity,
    description: extraDescription || catDef.label,
    location: location || null,
    pointsImpact: catDef.points,
    eventType: catDef.type,
  };

  // Notify UI immediately
  if (_onEvent) _onEvent({ ...event, timestamp: new Date().toISOString() });

  // Post to backend (fire-and-forget, don't block monitoring)
  try {
    await recordBehaviorEvent(event);
  } catch (err) {
    console.warn('[DrivingMonitor] Failed to post event:', categoryKey, err?.message);
  }
}

// ── Accelerometer Handler ────────────────────────────────────────────────────
function handleAccelData({ x, y, z }) {
  const g = magnitude(x, y, z);
  _accelHistory.push({ x, y, z, g, t: Date.now() });
  if (_accelHistory.length > ACCEL_WINDOW) _accelHistory.shift();

  if (_accelHistory.length < 2) return;

  const prev = _accelHistory[_accelHistory.length - 2];
  const curr = _accelHistory[_accelHistory.length - 1];

  // Forward/backward acceleration delta (using z-axis primarily on phone mounted vertically)
  const forwardDelta = Math.abs(curr.z - prev.z);
  const lateralDelta = Math.abs(curr.x - prev.x);
  const totalDelta = Math.abs(curr.g - prev.g);

  // Harsh braking: sudden increase in g-force (deceleration)
  if (totalDelta > THRESHOLDS.harshBraking && curr.z < prev.z) {
    const desc = `Harsh braking detected (${totalDelta.toFixed(2)}g delta)`;
    fireEvent('HarshBraking', desc);
  }

  // Harsh acceleration: sudden forward push
  if (totalDelta > THRESHOLDS.harshAcceleration && curr.z > prev.z) {
    const desc = `Harsh acceleration detected (${totalDelta.toFixed(2)}g delta)`;
    fireEvent('HarshAcceleration', desc);
  }

  // Sharp turn: lateral g-force spike
  if (lateralDelta > THRESHOLDS.sharpTurn) {
    // We don't have a "SharpTurn" category defined, so we use Other or skip
    // For now, we can log it under HarshBraking as aggressive maneuver
  }
}

// ── Location Handler ─────────────────────────────────────────────────────────
function handleLocationUpdate(location) {
  if (!location?.coords) return;

  const speedMs = location.coords.speed; // m/s, can be null
  if (speedMs == null || speedMs < 0) return;

  const speedKmh = speedMs * 3.6;
  _currentSpeed = speedKmh;

  const lat = location.coords.latitude;
  const lon = location.coords.longitude;
  const locationStr = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

  // Check speeding
  if (speedKmh > THRESHOLDS.speedLimit) {
    if (!_speedOverLimitSince) {
      _speedOverLimitSince = Date.now();
    } else if (Date.now() - _speedOverLimitSince >= THRESHOLDS.speedSustainedMs) {
      const desc = `Speeding detected: ${Math.round(speedKmh)} km/h (limit: ${THRESHOLDS.speedLimit} km/h)`;
      fireEvent('Speeding', desc, locationStr);
      _speedOverLimitSince = Date.now(); // reset to avoid continuous firing
    }
  } else {
    _speedOverLimitSince = null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Start monitoring driver behavior using phone sensors.
 * @param {Object} options
 * @param {string} options.driverId - Driver profile ID
 * @param {string} options.vehicleId - Assigned vehicle ID (optional)
 * @param {string} options.tenantId - Owner's tenant ID
 * @param {string} options.reporterId - User ID of the driver (for self-reporting)
 * @param {Function} options.onEvent - Callback when an event is detected
 * @param {Function} options.onStatusChange - Callback for status updates
 */
export async function startMonitoring(options = {}) {
  if (_isMonitoring) {
    console.log('[DrivingMonitor] Already monitoring');
    return { success: true, alreadyRunning: true };
  }

  _driverId = options.driverId;
  _vehicleId = options.vehicleId;
  _tenantId = options.tenantId;
  _reporterId = options.reporterId || options.driverId;
  _onEvent = options.onEvent;
  _onStatusChange = options.onStatusChange;

  if (!_driverId) {
    console.warn('[DrivingMonitor] No driverId provided');
    return { success: false, error: 'No driverId' };
  }

  // Reset state
  _lastEventTimes = {};
  _accelHistory = [];
  _speedOverLimitSince = null;
  _currentSpeed = 0;

  try {
    // Request location permissions
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      console.warn('[DrivingMonitor] Location permission denied');
      return { success: false, error: 'Location permission denied' };
    }

    // Start accelerometer (native only — not available on web)
    if (Platform.OS !== 'web') {
      try {
        const isAvailable = await Accelerometer.isAvailableAsync();
        if (isAvailable) {
          Accelerometer.setUpdateInterval(THRESHOLDS.accelIntervalMs);
          _accelSubscription = Accelerometer.addListener(handleAccelData);
          console.log('[DrivingMonitor] Accelerometer started');
        } else {
          console.log('[DrivingMonitor] Accelerometer not available on this device');
        }
      } catch (accelErr) {
        console.warn('[DrivingMonitor] Accelerometer init failed, continuing with GPS only:', accelErr.message);
      }
    } else {
      console.log('[DrivingMonitor] Web platform — skipping accelerometer, GPS only');
    }

    // Start location tracking
    _locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: THRESHOLDS.locationIntervalMs,
        distanceInterval: 10, // meters
      },
      handleLocationUpdate
    );

    _isMonitoring = true;
    if (_onStatusChange) _onStatusChange({ monitoring: true, speed: 0 });
    console.log('[DrivingMonitor] Started monitoring');
    return { success: true };
  } catch (err) {
    console.error('[DrivingMonitor] Failed to start:', err);
    stopMonitoring();
    return { success: false, error: err.message };
  }
}

/**
 * Stop monitoring driver behavior.
 */
export function stopMonitoring() {
  if (_accelSubscription) {
    _accelSubscription.remove();
    _accelSubscription = null;
  }
  if (_locationSubscription) {
    if (typeof _locationSubscription.remove === 'function') {
      try {
        _locationSubscription.remove();
      } catch (err) {
        console.warn('[DrivingMonitor] Error removing location subscription:', err.message);
      }
    }
    _locationSubscription = null;
  }
  _isMonitoring = false;
  _accelHistory = [];
  _speedOverLimitSince = null;
  _currentSpeed = 0;
  if (_onStatusChange) _onStatusChange({ monitoring: false, speed: 0 });
  console.log('[DrivingMonitor] Stopped monitoring');
}

/**
 * Check if monitoring is active.
 */
export function isMonitoring() {
  return _isMonitoring;
}

/**
 * Get the current speed in km/h.
 */
export function getCurrentSpeed() {
  return Math.round(_currentSpeed);
}

/**
 * Update thresholds at runtime (owner can configure sensitivity).
 */
export function updateThresholds(overrides = {}) {
  Object.assign(THRESHOLDS, overrides);
}

/**
 * Get current threshold values.
 */
export function getThresholds() {
  return { ...THRESHOLDS };
}
