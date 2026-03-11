using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace MzansiFleet.Api.Services.AI
{
    public class ExternalAIService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<ExternalAIService> _logger;

        public ExternalAIService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<ExternalAIService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Integrates with OpenAI GPT-4 for advanced NLP tasks
        /// </summary>
        public async Task<OpenAIResponse> CallOpenAI(string prompt, string model = "gpt-4", string systemPrompt = null)
        {
            var apiKey = _configuration["OpenAI:ApiKey"];
            var endpoint = "https://api.openai.com/v1/chat/completions";

            var defaultSystemPrompt = "You are a helpful assistant for the Mzansi Fleet taxi management system. Provide accurate, helpful information about taxi services, routes, and transportation in South Africa.";
            
            var request = new
            {
                model = model,
                messages = new[]
                {
                    new { role = "system", content = systemPrompt ?? defaultSystemPrompt },
                    new { role = "user", content = prompt }
                },
                max_tokens = 1000,
                temperature = 0.7,
                response_format = new { type = "text" }
            };

            var json = JsonSerializer.Serialize(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

            try
            {
                var response = await _httpClient.PostAsync(endpoint, content);
                response.EnsureSuccessStatusCode();

                var responseJson = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<JsonElement>(responseJson);

                var message = result.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
                var usage = result.GetProperty("usage");

                return new OpenAIResponse
                {
                    Content = message,
                    Model = model,
                    TokensUsed = usage.GetProperty("total_tokens").GetInt32(),
                    PromptTokens = usage.GetProperty("prompt_tokens").GetInt32(),
                    CompletionTokens = usage.GetProperty("completion_tokens").GetInt32(),
                    Success = true
                };
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP error calling OpenAI API: {StatusCode}", ex.StatusCode);
                return new OpenAIResponse
                {
                    Content = "AI service temporarily unavailable due to network issues",
                    Success = false,
                    Error = ex.Message
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling OpenAI API");
                return new OpenAIResponse
                {
                    Content = "AI service temporarily unavailable",
                    Success = false,
                    Error = ex.Message
                };
            }
        }

        /// <summary>
        /// Specialized method for taxi-related queries
        /// </summary>
        public async Task<OpenAIResponse> ProcessTaxiQuery(string query, string userContext = null)
        {
            var systemPrompt = $@"
You are an expert assistant for Mzansi Fleet taxi management system in South Africa. 
Provide helpful, accurate information about:
- Taxi routes and schedules
- Fare information and payment methods
- Booking procedures
- Safety guidelines
- Local transportation information

{(!string.IsNullOrEmpty(userContext) ? $"User Context: {userContext}" : "")}

Be friendly, professional, and provide practical advice. If you don't know specific information, be honest and suggest alternatives.";

            return await CallOpenAI(query, "gpt-4", systemPrompt);
        }

        /// <summary>
        /// Generate automated responses for common taxi scenarios
        /// </summary>
        public async Task<OpenAIResponse> GenerateTaxiResponse(string scenario, string details = null)
        {
            var prompt = $@"
Generate a professional response for the following taxi scenario:

Scenario: {scenario}
{(!string.IsNullOrEmpty(details) ? $"Additional Details: {details}" : "")}

Provide a helpful, empathetic response that addresses the customer's needs and follows best practices for customer service in the taxi industry.";

            var systemPrompt = "You are a customer service representative for Mzansi Fleet. Generate professional, helpful responses for taxi-related scenarios.";

            return await CallOpenAI(prompt, "gpt-4", systemPrompt);
        }

        /// <summary>
        /// Integrates with Azure Cognitive Services for speech recognition
        /// </summary>
        public async Task<string> TranscribeAudio(byte[] audioData)
        {
            var apiKey = _configuration["AzureCognitiveServices:ApiKey"];
            var region = _configuration["AzureCognitiveServices:Region"];
            var endpoint = $"https://{region}.api.cognitive.microsoft.com/sts/v1.0/issuetoken";

            // Get access token
            var tokenResponse = await _httpClient.PostAsync(endpoint, null);
            var token = await tokenResponse.Content.ReadAsStringAsync();

            // Transcribe audio
            var speechEndpoint = $"https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1";
            
            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
            _httpClient.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", apiKey);

            var content = new ByteArrayContent(audioData);
            content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("audio/wav");

            try
            {
                var response = await _httpClient.PostAsync($"{speechEndpoint}?language=en-US", content);
                response.EnsureSuccessStatusCode();

                var responseJson = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<JsonElement>(responseJson);

                return result.GetProperty("DisplayText").GetString();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error transcribing audio");
                return "Speech recognition failed";
            }
        }

        /// <summary>
        /// Integrates with Google Maps API for route optimization
        /// </summary>
        public async Task<OptimizedRoute> OptimizeRouteWithGoogle(List<string> waypoints, string origin, string destination, string departureTime = null)
        {
            var apiKey = _configuration["GoogleMaps:ApiKey"];
            var endpoint = "https://routes.googleapis.com/directions/v2:computeRoutes";

            // Build request with traffic awareness
            var request = new
            {
                origin = new { address = origin },
                destination = new { address = destination },
                intermediates = waypoints.ConvertAll(w => new { address = w }),
                travelMode = "DRIVE",
                routingPreference = "TRAFFIC_AWARE",
                computeAlternativeRoutes = true,
                routeModifiers = new
                {
                    avoidTolls = false,
                    avoidHighways = false,
                    avoidFerries = true
                },
                extraComputations = new[] { "TRAFFIC_ON_POLYLINE", "FUEL_CONSUMPTION" },
                departureTime = departureTime ?? DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
            };

            var json = JsonSerializer.Serialize(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("X-Goog-Api-Key", apiKey);
            _httpClient.DefaultRequestHeaders.Add("X-Goog-FieldMask", "routes.duration,routes.distanceMeters,routes.polyline,routes.description,routes.legs,routes.travelAdvisory,routes.fuelConsumption");

            try
            {
                var response = await _httpClient.PostAsync(endpoint, content);
                response.EnsureSuccessStatusCode();

                var responseJson = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<JsonElement>(responseJson);

                var route = result.GetProperty("routes")[0];

                // Extract detailed route information
                var legs = route.GetProperty("legs");
                var totalDistance = 0;
                var totalDuration = TimeSpan.Zero;
                var routeWaypoints = new List<string>();

                foreach (var leg in legs.EnumerateArray())
                {
                    totalDistance += leg.GetProperty("distance").GetProperty("meters").GetInt32();
                    var durationStr = leg.GetProperty("duration").GetString();
                    totalDuration = totalDuration.Add(TimeSpan.Parse(durationStr.Replace("s", "sec").Replace("m", "min").Replace("h", "hr")));
                    
                    // Extract waypoints
                    if (leg.TryGetProperty("startLocation", out var startLoc))
                    {
                        routeWaypoints.Add(startLoc.GetProperty("address").GetString());
                    }
                }

                // Calculate fuel efficiency and cost
                var fuelConsumption = route.TryGetProperty("fuelConsumption", out var fuel) 
                    ? fuel.GetProperty("liters").GetDouble() 
                    : totalDistance * 0.08 / 1000; // Default: 8L/100km

                var estimatedCost = CalculateEstimatedCost(totalDistance, fuelConsumption);

                return new OptimizedRoute
                {
                    DistanceMeters = totalDistance,
                    Duration = totalDuration.ToString(@"hh\:mm\:ss"),
                    Polyline = route.GetProperty("polyline").GetProperty("encodedPolyline").GetString(),
                    Waypoints = routeWaypoints,
                    FuelEfficiency = fuelConsumption,
                    EstimatedCost = estimatedCost
                };
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Error calling Google Routes API: {StatusCode}", ex.StatusCode);
                return new OptimizedRoute
                {
                    DistanceMeters = 0,
                    Duration = "00:00:00",
                    Polyline = "",
                    Waypoints = new List<string>(),
                    FuelEfficiency = 0,
                    EstimatedCost = 0
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error optimizing route with Google Maps");
                return null;
            }
        }

        /// <summary>
        /// Get real-time traffic data for routes
        /// </summary>
        public async Task<TrafficData> GetTrafficData(string origin, string destination)
        {
            var apiKey = _configuration["GoogleMaps:ApiKey"];
            var endpoint = "https://routes.googleapis.com/directions/v2:computeRoutes";

            var request = new
            {
                origin = new { address = origin },
                destination = new { address = destination },
                travelMode = "DRIVE",
                routingPreference = "TRAFFIC_AWARE_OPTIMAL",
                departureTime = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                extraComputations = new[] { "TRAFFIC_ON_POLYLINE" }
            };

            var json = JsonSerializer.Serialize(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("X-Goog-Api-Key", apiKey);
            _httpClient.DefaultRequestHeaders.Add("X-Goog-FieldMask", "routes.duration,routes.distanceMeters,routes.travelAdvisory");

            try
            {
                var response = await _httpClient.PostAsync(endpoint, content);
                response.EnsureSuccessStatusCode();

                var responseJson = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<JsonElement>(responseJson);

                var route = result.GetProperty("routes")[0];
                var travelAdvisory = route.TryGetProperty("travelAdvisory", out var advisory) ? advisory : default(JsonElement);

                return new TrafficData
                {
                    NormalDuration = route.GetProperty("duration").GetString(),
                    DistanceMeters = route.GetProperty("distanceMeters").GetInt32(),
                    TrafficConditions = ExtractTrafficConditions(travelAdvisory),
                    HasIncidents = travelAdvisory.ValueKind != JsonValueKind.Null && travelAdvisory.TryGetProperty("trafficIncident", out _) == true,
                    Recommendation = GenerateTrafficRecommendation(travelAdvisory)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting traffic data");
                return new TrafficData
                {
                    NormalDuration = "Unknown",
                    DistanceMeters = 0,
                    TrafficConditions = "Unknown",
                    HasIncidents = false,
                    Recommendation = "Traffic data unavailable"
                };
            }
        }

        /// <summary>
        /// Geocode addresses to coordinates
        /// </summary>
        public async Task<LocationData> GeocodeAddress(string address)
        {
            var apiKey = _configuration["GoogleMaps:ApiKey"];
            var endpoint = $"https://maps.googleapis.com/maps/api/geocode/json";

            var request = new
            {
                address = address,
                key = apiKey
            };

            var response = await _httpClient.GetAsync($"{endpoint}?address={Uri.EscapeDataString(address)}&key={apiKey}");

            try
            {
                response.EnsureSuccessStatusCode();
                var responseJson = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<JsonElement>(responseJson);

                if (result.GetProperty("status").GetString() == "OK")
                {
                    var location = result.GetProperty("results")[0].GetProperty("geometry").GetProperty("location");
                    
                    return new LocationData
                    {
                        Latitude = location.GetProperty("lat").GetDouble(),
                        Longitude = location.GetProperty("lng").GetDouble(),
                        FormattedAddress = result.GetProperty("results")[0].GetProperty("formatted_address").GetString(),
                        Success = true
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error geocoding address: {Address}", address);
            }

            return new LocationData
            {
                Latitude = 0,
                Longitude = 0,
                FormattedAddress = address,
                Success = false
            };
        }

        private double CalculateEstimatedCost(int distanceMeters, double fuelLiters)
        {
            // Base fare calculation for South African taxi rates
            var baseFare = 25.00; // Base fare in ZAR
            var perKmRate = 15.00; // Per kilometer rate
            var fuelCost = fuelLiters * 19.50; // Fuel price ~ZAR 19.50/L
            
            var distanceKm = distanceMeters / 1000.0;
            var distanceCost = distanceKm * perKmRate;
            
            return baseFare + distanceCost + fuelCost;
        }

        private string ExtractTrafficConditions(JsonElement travelAdvisory)
        {
            if (travelAdvisory.ValueKind == JsonValueKind.Null)
                return "Normal";

            // Extract traffic conditions from travel advisory
            if (travelAdvisory.TryGetProperty("trafficReading", out var reading))
            {
                var speed = reading.GetProperty("speed").GetString();
                return speed switch
                {
                    "TRAFFIC_FREE" => "Light Traffic",
                    "LIGHT" => "Light Traffic",
                    "MODERATE" => "Moderate Traffic",
                    "HEAVY" => "Heavy Traffic",
                    "STOP_AND_GO" => "Severe Traffic",
                    _ => "Unknown"
                };
            }

            return "Normal";
        }

        private string GenerateTrafficRecommendation(JsonElement travelAdvisory)
        {
            var conditions = ExtractTrafficConditions(travelAdvisory);
            
            return conditions switch
            {
                "Light Traffic" => "Good conditions for travel",
                "Moderate Traffic" => "Allow extra 10-15 minutes",
                "Heavy Traffic" => "Allow extra 20-30 minutes",
                "Severe Traffic" => "Consider alternative routes or delay travel",
                _ => "Current conditions normal"
            };
        }

        /// <summary>
        /// Integrates with Azure Translator for multi-language support
        /// </summary>
        public async Task<string> TranslateText(string text, string targetLanguage, string sourceLanguage = "auto")
        {
            var apiKey = _configuration["AzureTranslator:ApiKey"];
            var region = _configuration["AzureTranslator:Region"];
            var endpoint = "https://api.cognitive.microsofttranslator.com/translate";

            var request = new[]
            {
                new { text = text }
            };

            var json = JsonSerializer.Serialize(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", apiKey);
            _httpClient.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Region", region);

            try
            {
                var response = await _httpClient.PostAsync($"{endpoint}?api-version=3.0&from={sourceLanguage}&to={targetLanguage}", content);
                response.EnsureSuccessStatusCode();

                var responseJson = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<JsonElement>(responseJson);

                return result[0].GetProperty("translations")[0].GetProperty("text").GetString();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error translating text");
                return text; // Return original text if translation fails
            }
        }
    }

    public class OptimizedRoute
    {
        public int DistanceMeters { get; set; }
        public string Duration { get; set; }
        public string Polyline { get; set; }
        public List<string> Waypoints { get; set; } = new();
        public double FuelEfficiency { get; set; }
        public double EstimatedCost { get; set; }
    }

    public class OpenAIResponse
    {
        public string Content { get; set; }
        public string Model { get; set; }
        public int TokensUsed { get; set; }
        public int PromptTokens { get; set; }
        public int CompletionTokens { get; set; }
        public bool Success { get; set; }
        public string Error { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    public class TrafficData
    {
        public string NormalDuration { get; set; }
        public int DistanceMeters { get; set; }
        public string TrafficConditions { get; set; }
        public bool HasIncidents { get; set; }
        public string Recommendation { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    public class LocationData
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string FormattedAddress { get; set; }
        public bool Success { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
