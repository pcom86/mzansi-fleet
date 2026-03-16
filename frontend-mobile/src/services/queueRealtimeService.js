import { useState, useEffect, useCallback } from 'react';

// Simple polling-based real-time service for React Native
// In a production app, you might want to use a proper WebSocket library
// like react-native-websockets or a SignalR client for React Native

class QueueRealtimeService {
  constructor() {
    this.listeners = new Map();
    this.pollingIntervals = new Map();
    this.isPolling = false;
  }

  // Subscribe to queue updates for a specific taxi rank
  subscribeToQueueUpdates(taxiRankId, callback) {
    const key = `queue_${taxiRankId}`;
    
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    
    this.listeners.get(key).push(callback);
    
    // Start polling if not already polling
    if (!this.isPolling) {
      this.startPolling();
    }
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
        
        // Clean up if no more listeners
        if (callbacks.length === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  // Subscribe to priority dispatch notifications
  subscribeToPriorityDispatches(taxiRankId, callback) {
    const key = `dispatch_${taxiRankId}`;
    
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    
    this.listeners.get(key).push(callback);
    
    if (!this.isPolling) {
      this.startPolling();
    }
    
    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
        
        if (callbacks.length === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  // Start polling for updates
  startPolling() {
    this.isPolling = true;
    
    // Poll every 30 seconds for queue updates
    this.pollingIntervals.set('queue', setInterval(() => {
      this.pollQueueUpdates();
    }, 30000));
    
    // Poll every 10 seconds for priority dispatches
    this.pollingIntervals.set('dispatch', setInterval(() => {
      this.pollPriorityDispatches();
    }, 10000));
  }

  // Stop polling
  stopPolling() {
    this.isPolling = false;
    
    this.pollingIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    
    this.pollingIntervals.clear();
  }

  // Poll for queue updates
  async pollQueueUpdates() {
    try {
      // This would need to be implemented with your API client
      // For now, we'll simulate with a timeout
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Notify listeners about queue updates
      this.listeners.forEach((callbacks, key) => {
        if (key.startsWith('queue_')) {
          callbacks.forEach(callback => {
            callback({
              type: 'queue_update',
              taxiRankId: key.replace('queue_', ''),
              timestamp: new Date().toISOString(),
              data: null // Would contain actual queue data
            });
          });
        }
      });
    } catch (error) {
      console.warn('Error polling queue updates:', error);
    }
  }

  // Poll for priority dispatches
  async pollPriorityDispatches() {
    try {
      // This would need to be implemented with your API client
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Notify listeners about priority dispatches
      this.listeners.forEach((callbacks, key) => {
        if (key.startsWith('dispatch_')) {
          callbacks.forEach(callback => {
            callback({
              type: 'priority_dispatch',
              taxiRankId: key.replace('dispatch_', ''),
              timestamp: new Date().toISOString(),
              data: null // Would contain actual dispatch data
            });
          });
        }
      });
    } catch (error) {
      console.warn('Error polling priority dispatches:', error);
    }
  }

  // Manual refresh trigger
  triggerRefresh(taxiRankId) {
    this.listeners.forEach((callbacks, key) => {
      if (key.includes(taxiRankId)) {
        callbacks.forEach(callback => {
          callback({
            type: 'manual_refresh',
            taxiRankId,
            timestamp: new Date().toISOString(),
            data: null
          });
        });
      }
    });
  }

  // Cleanup
  cleanup() {
    this.stopPolling();
    this.listeners.clear();
  }
}

// Create singleton instance
const queueRealtimeService = new QueueRealtimeService();

// React hook for using the real-time service
export function useQueueRealtime(taxiRankId) {
  const [lastUpdate, setLastUpdate] = useState(null);
  const [lastDispatch, setLastDispatch] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!taxiRankId) return;

    setIsConnected(true);

    // Subscribe to queue updates
    const unsubscribeQueue = queueRealtimeService.subscribeToQueueUpdates(
      taxiRankId,
      (update) => {
        setLastUpdate(update);
      }
    );

    // Subscribe to priority dispatches
    const unsubscribeDispatch = queueRealtimeService.subscribeToPriorityDispatches(
      taxiRankId,
      (dispatch) => {
        setLastDispatch(dispatch);
      }
    );

    return () => {
      unsubscribeQueue();
      unsubscribeDispatch();
      
      // Check if there are any more active subscriptions
      if (queueRealtimeService.listeners.size === 0) {
        queueRealtimeService.stopPolling();
        setIsConnected(false);
      }
    };
  }, [taxiRankId]);

  const triggerRefresh = useCallback(() => {
    if (taxiRankId) {
      queueRealtimeService.triggerRefresh(taxiRankId);
    }
  }, [taxiRankId]);

  return {
    lastUpdate,
    lastDispatch,
    isConnected,
    triggerRefresh
  };
}

// Export the service instance for direct use if needed
export default queueRealtimeService;
