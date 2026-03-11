import client from '../api/client';

// Optimized AI Service for mobile app AI capabilities
class AIService {
  // Voice recognition for hands-free operation
  async processVoiceCommand(audioBlob) {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      
      const response = await client.post('/ai/speech-to-text', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      return await this.interpretCommand(response.data.text);
    } catch (error) {
      console.error('Voice command failed:', error);
      return null;
    }
  }
  
  // Interpret voice commands and convert to actions
  async interpretCommand(command) {
    try {
      const response = await client.post('/ai/interpret-command', { command });
      
      return {
        action: response.data.action,
        parameters: response.data.parameters,
        confidence: response.data.confidence
      };
    } catch (error) {
      console.error('Command interpretation failed:', error);
      return { action: 'unknown', parameters: {}, confidence: 0 };
    }
  }
  
  // Real-time translation for multi-language support
  async translateText(text, targetLanguage) {
    try {
      const response = await client.post('/ai/translate', { 
        text, 
        targetLanguage,
        sourceLanguage: 'auto'
      });
      
      return response.data.translatedText;
    } catch (error) {
      console.error('Translation failed:', error);
      return text;
    }
  }
  
  // AI-powered trip recommendations using OpenAI
  async getTripRecommendations(userPreferences, currentLocation) {
    try {
      const response = await client.post('/ai/trip-recommendations', {
        preferences: userPreferences,
        location: currentLocation,
        timestamp: new Date().toISOString()
      });
      
      return response.data.recommendations;
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      return [];
    }
  }
  
  // Predictive ETA using Google Maps traffic data
  async predictETA(routeId, currentLocation, destination) {
    try {
      const response = await client.post('/ai/predict-eta', {
        routeId,
        currentLocation,
        destination,
        currentTime: new Date().toISOString()
      });
      
      return {
        estimatedArrival: response.data.eta,
        confidence: response.data.confidence,
        factors: response.data.factors,
        trafficConditions: response.data.trafficConditions,
        alternativeRoutes: response.data.alternativeRoutes
      };
    } catch (error) {
      console.error('ETA prediction failed:', error);
      return null;
    }
  }
  
  // Smart fare estimation using Google Maps and real-time data
  async estimateFare(departure, destination, vehicleType = 'standard', timeOfDay) {
    try {
      const response = await client.post('/ai/estimate-fare', {
        departure,
        destination,
        vehicleType,
        timeOfDay,
        date: new Date().toISOString()
      });
      
      return {
        estimatedFare: response.data.fare,
        range: response.data.range,
        factors: response.data.factors,
        breakdown: response.data.breakdown,
        confidence: response.data.confidence
      };
    } catch (error) {
      console.error('Fare estimation failed:', error);
      return null;
    }
  }
  
  // Route optimization using Google Maps API
  async optimizeRoute(waypoints, origin, destination, departureTime = null) {
    try {
      const response = await client.post('/ai/optimize-route', {
        waypoints,
        origin,
        destination,
        departureTime: departureTime || new Date().toISOString()
      });
      
      return {
        optimizedRoute: response.data.route,
        distanceMeters: response.data.distanceMeters,
        duration: response.data.duration,
        polyline: response.data.polyline,
        fuelEfficiency: response.data.fuelEfficiency,
        estimatedCost: response.data.estimatedCost,
        savings: response.data.savings,
        recommendations: response.data.recommendations
      };
    } catch (error) {
      console.error('Route optimization failed:', error);
      return null;
    }
  }
  
  // Get real-time traffic data
  async getTrafficData(origin, destination) {
    try {
      const response = await client.post('/ai/traffic-data', {
        origin,
        destination
      });
      
      return {
        normalDuration: response.data.normalDuration,
        distanceMeters: response.data.distanceMeters,
        trafficConditions: response.data.trafficConditions,
        hasIncidents: response.data.hasIncidents,
        recommendation: response.data.recommendation
      };
    } catch (error) {
      console.error('Traffic data failed:', error);
      return null;
    }
  }
  
  // Chat with AI assistant using OpenAI GPT-4
  async chatWithAI(message, userId, userRole = 'passenger') {
    try {
      const response = await client.post('/ai/chat', {
        query: message,
        userId,
        userRole
      });
      
      return {
        message: response.data.message,
        intent: response.data.intent,
        confidence: response.data.confidence,
        actions: response.data.actions,
        tokensUsed: response.data.tokensUsed
      };
    } catch (error) {
      console.error('AI chat failed:', error);
      return {
        message: 'I apologize, but I\'m having trouble connecting right now. Please try again later.',
        intent: 'error',
        confidence: 0,
        actions: [],
        tokensUsed: 0
      };
    }
  }
  
  // Geocode address to coordinates
  async geocodeAddress(address) {
    try {
      const response = await client.post('/ai/geocode', { address });
      
      return {
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        formattedAddress: response.data.formattedAddress,
        success: response.data.success
      };
    } catch (error) {
      console.error('Geocoding failed:', error);
      return {
        latitude: 0,
        longitude: 0,
        formattedAddress: address,
        success: false
      };
    }
  }
  
  // Anomaly detection for driver behavior
  async reportDrivingBehavior(tripData) {
    try {
      const response = await client.post('/ai/analyze-driving', tripData);
      
      return {
        safetyScore: response.data.safetyScore,
        alerts: response.data.alerts,
        recommendations: response.data.recommendations,
        riskLevel: response.data.riskLevel
      };
    } catch (error) {
      console.error('Driving behavior analysis failed:', error);
      return null;
    }
  }
  
  // Generate automated responses for common scenarios
  async generateScenarioResponse(scenario, details = null) {
    try {
      const response = await client.post('/ai/generate-response', {
        scenario,
        details
      });
      
      return {
        response: response.data.response,
        confidence: response.data.confidence,
        suggestedActions: response.data.suggestedActions
      };
    } catch (error) {
      console.error('Scenario response generation failed:', error);
      return null;
    }
  }
}

export default new AIService();
