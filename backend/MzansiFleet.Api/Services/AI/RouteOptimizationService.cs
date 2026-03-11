using MzansiFleet.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MzansiFleet.Api.Services.AI
{
    public class RouteOptimizationService
    {
        private readonly ExternalAIService _externalAI;
        private static readonly Dictionary<string, double> VehicleTypeMultipliers = new()
        {
            ["standard"] = 1.0,
            ["premium"] = 1.3,
            ["luxury"] = 1.6
        };

        public RouteOptimizationService(ExternalAIService externalAI)
        {
            _externalAI = externalAI;
        }

        /// <summary>
        /// Optimizes a route using Google Maps AI algorithms
        /// </summary>
        public async Task<RouteOptimizationResult> OptimizeRoute(Route route)
        {
            try
            {
                var waypoints = ExtractWaypoints(route);
                var externalRoute = await _externalAI.OptimizeRouteWithGoogle(
                    waypoints,
                    route.DepartureStation,
                    route.DestinationStation
                );

                if (externalRoute == null)
                    return CreateFailureResult("Failed to optimize route", route);

                // Convert external route to our shared type
                var optimizedRoute = new SharedOptimizedRoute
                {
                    DistanceMeters = externalRoute.DistanceMeters,
                    Duration = externalRoute.Duration,
                    Polyline = externalRoute.Polyline,
                    Waypoints = externalRoute.Waypoints,
                    FuelEfficiency = externalRoute.FuelEfficiency,
                    EstimatedCost = externalRoute.EstimatedCost
                };

                var improvements = CalculateImprovements(route, optimizedRoute);

                return new RouteOptimizationResult
                {
                    Success = true,
                    OptimizedRoute = optimizedRoute,
                    DistanceSavings = improvements.DistanceSavings,
                    TimeSavings = improvements.TimeSavings,
                    CostSavings = improvements.CostSavings,
                    Recommendations = GenerateRecommendations(optimizedRoute, improvements),
                    OriginalRoute = route
                };
            }
            catch (Exception ex)
            {
                return CreateFailureResult(ex.Message, route);
            }
        }

        /// <summary>
        /// Predicts optimal departure times based on traffic patterns
        /// </summary>
        public async Task<DepartureTimePrediction> PredictOptimalDepartureTime(string origin, string destination, TimeSpan targetArrivalTime)
        {
            try
            {
                var trafficData = await _externalAI.GetTrafficData(origin, destination);
                var currentDuration = ParseDuration(trafficData.NormalDuration);
                var adjustments = GetTrafficAdjustments(trafficData.TrafficConditions);
                
                var recommendedDeparture = DateTime.UtcNow.Add(currentDuration).AddMinutes(-adjustments);

                return new DepartureTimePrediction
                {
                    RecommendedDepartureTime = recommendedDeparture.TimeOfDay,
                    ExpectedArrivalTime = recommendedDeparture.Add(currentDuration).TimeOfDay,
                    Confidence = 0.85,
                    TrafficConditions = trafficData.TrafficConditions,
                    Recommendation = trafficData.Recommendation,
                    AlternativeTimes = GenerateAlternativeTimes(adjustments)
                };
            }
            catch (Exception)
            {
                return CreateDefaultDeparturePrediction();
            }
        }

        /// <summary>
        /// Estimates optimal fare using real-time data
        /// </summary>
        public async Task<FareEstimation> EstimateOptimalFare(string origin, string destination, string vehicleType = "standard")
        {
            try
            {
                var externalRouteData = await _externalAI.OptimizeRouteWithGoogle(new List<string>(), origin, destination);
                
                if (externalRouteData == null)
                    return CreateDefaultFareEstimation();

                // Convert to our shared type
                var routeData = new SharedOptimizedRoute
                {
                    DistanceMeters = externalRouteData.DistanceMeters,
                    Duration = externalRouteData.Duration,
                    Polyline = externalRouteData.Polyline,
                    Waypoints = externalRouteData.Waypoints,
                    FuelEfficiency = externalRouteData.FuelEfficiency,
                    EstimatedCost = externalRouteData.EstimatedCost
                };

                var fareCalculation = CalculateFare(routeData, vehicleType);

                return new FareEstimation
                {
                    EstimatedFare = fareCalculation.TotalFare,
                    Range = fareCalculation.Range,
                    Factors = fareCalculation.Factors,
                    Confidence = 0.88,
                    Breakdown = fareCalculation.Breakdown
                };
            }
            catch (Exception)
            {
                return CreateDefaultFareEstimation();
            }
        }

        #region Private Helper Methods

        private List<string> ExtractWaypoints(Route route)
        {
            return route.Stops?.OrderBy(s => s.StopOrder).Select(s => s.StopName).ToList() ?? new List<string>();
        }

        private RouteImprovements CalculateImprovements(Route originalRoute, SharedOptimizedRoute optimizedRoute)
        {
            var originalDistance = EstimateOriginalDistance(originalRoute);
            var distanceSavings = originalDistance > 0 
                ? (originalDistance - optimizedRoute.DistanceMeters) / (double)originalDistance * 100 
                : 0;

            return new RouteImprovements
            {
                DistanceSavings = distanceSavings,
                TimeSavings = CalculateTimeSavings(optimizedRoute),
                CostSavings = CalculateCostSavings(optimizedRoute, distanceSavings)
            };
        }

        private TimeSpan CalculateTimeSavings(SharedOptimizedRoute optimizedRoute)
        {
            var estimatedOriginalTime = TimeSpan.FromHours(optimizedRoute.DistanceMeters / 40000.0);
            var optimizedTime = ParseDuration(optimizedRoute.Duration);
            return estimatedOriginalTime - optimizedTime;
        }

        private double CalculateCostSavings(SharedOptimizedRoute optimizedRoute, double distanceSavings)
        {
            var fuelSavings = (optimizedRoute.DistanceMeters * distanceSavings / 100.0) * 0.08 * 19.50;
            var timeSavings = CalculateTimeSavings(optimizedRoute).TotalHours * 100;
            return fuelSavings + timeSavings;
        }

        private FareCalculation CalculateFare(SharedOptimizedRoute routeData, string vehicleType)
        {
            var multiplier = VehicleTypeMultipliers.GetValueOrDefault(vehicleType.ToLower(), 1.0);
            var baseFare = 25.00 * multiplier;
            var distanceRate = 15.00 * multiplier;
            var timeRate = 100.00 * multiplier;
            
            var distanceCost = (routeData.DistanceMeters / 1000.0) * distanceRate;
            var timeCost = ParseDuration(routeData.Duration).TotalHours * timeRate;
            var fuelCost = routeData.FuelEfficiency * 19.50;
            
            var totalFare = baseFare + distanceCost + timeCost + fuelCost;
            totalFare *= GetTrafficMultiplier(routeData.DistanceMeters);

            return new FareCalculation
            {
                TotalFare = Math.Round(totalFare, 2),
                Range = new FareRange 
                { 
                    Min = Math.Round(totalFare * 0.9, 2), 
                    Max = Math.Round(totalFare * 1.2, 2) 
                },
                Factors = GenerateFareFactors(routeData, vehicleType),
                Breakdown = new FareBreakdown
                {
                    BaseFare = baseFare,
                    DistanceCost = distanceCost,
                    TimeCost = timeCost,
                    FuelCost = fuelCost,
                    TrafficAdjustment = totalFare * (GetTrafficMultiplier(routeData.DistanceMeters) - 1)
                }
            };
        }

        private int GetTrafficAdjustments(string trafficConditions)
        {
            return trafficConditions switch
            {
                "Heavy Traffic" => 20,
                "Moderate Traffic" => 10,
                "Severe Traffic" => 30,
                _ => 0
            };
        }

        private double GetTrafficMultiplier(int distanceMeters)
        {
            var distanceKm = distanceMeters / 1000.0;
            return distanceKm switch
            {
                > 50 => 1.2,
                > 20 => 1.1,
                _ => 1.0
            };
        }

        private List<string> GenerateRecommendations(SharedOptimizedRoute optimizedRoute, RouteImprovements improvements)
        {
            var recommendations = new List<string>();
            
            if (optimizedRoute.EstimatedCost > 0)
                recommendations.Add($"Estimated cost: R{optimizedRoute.EstimatedCost:F2}");
            
            if (improvements.DistanceSavings > 5)
                recommendations.Add($"Save {improvements.DistanceSavings:F1}% distance with this route");
            
            recommendations.Add("Route optimized for current traffic conditions");
            return recommendations;
        }

        private List<TimeSpan> GenerateAlternativeTimes(int baseAdjustment)
        {
            return Enumerable.Range(-2, 5)
                .Where(i => i != 0)
                .Select(i => TimeSpan.FromMinutes(baseAdjustment + (i * 15)))
                .ToList();
        }

        private List<string> GenerateFareFactors(SharedOptimizedRoute routeData, string vehicleType)
        {
            return new List<string>
            {
                $"Base fare for {vehicleType} vehicle",
                $"{routeData.DistanceMeters / 1000.0:F1}km distance",
                "Current traffic conditions",
                "Estimated fuel consumption"
            };
        }

        #endregion

        #region Factory Methods

        private RouteOptimizationResult CreateFailureResult(string error, Route route)
        {
            return new RouteOptimizationResult
            {
                Success = false,
                Error = error,
                OriginalRoute = route
            };
        }

        private DepartureTimePrediction CreateDefaultDeparturePrediction()
        {
            return new DepartureTimePrediction
            {
                RecommendedDepartureTime = DateTime.Now.TimeOfDay,
                ExpectedArrivalTime = DateTime.Now.AddHours(1).TimeOfDay,
                Confidence = 0.0,
                TrafficConditions = "Unknown",
                Recommendation = "Unable to predict optimal time",
                AlternativeTimes = new List<TimeSpan>()
            };
        }

        private FareEstimation CreateDefaultFareEstimation()
        {
            return new FareEstimation
            {
                EstimatedFare = 0,
                Range = new FareRange { Min = 0, Max = 0 },
                Factors = new List<string> { "Route data unavailable" },
                Confidence = 0.0
            };
        }

        #endregion

        #region Utility Methods

        private int EstimateOriginalDistance(Route route)
        {
            return route.Stops?.Count > 0 ? route.Stops.Count * 3000 : 15000;
        }

        private TimeSpan ParseDuration(string duration)
        {
            return TimeSpan.TryParse(duration, out var result) ? result : TimeSpan.FromHours(1);
        }

        #endregion
    }

    #region Supporting Classes

    internal class RouteImprovements
    {
        public double DistanceSavings { get; set; }
        public TimeSpan TimeSavings { get; set; }
        public double CostSavings { get; set; }
    }

    internal class FareCalculation
    {
        public double TotalFare { get; set; }
        public FareRange Range { get; set; }
        public List<string> Factors { get; set; }
        public FareBreakdown Breakdown { get; set; }
    }

    #endregion
}

public class SharedOptimizedRoute
{
    public int DistanceMeters { get; set; }
    public string Duration { get; set; }
    public string Polyline { get; set; }
    public List<string> Waypoints { get; set; } = new();
    public double FuelEfficiency { get; set; }
    public double EstimatedCost { get; set; }
}

public class RouteOptimizationResult
{
    public bool Success { get; set; }
    public SharedOptimizedRoute OptimizedRoute { get; set; }
    public double DistanceSavings { get; set; }
    public TimeSpan TimeSavings { get; set; }
    public double CostSavings { get; set; }
    public List<string> Recommendations { get; set; } = new();
    public string Error { get; set; }
    public Route OriginalRoute { get; set; }
}

public class DepartureTimePrediction
{
    public TimeSpan RecommendedDepartureTime { get; set; }
    public TimeSpan ExpectedArrivalTime { get; set; }
    public double Confidence { get; set; }
    public string TrafficConditions { get; set; }
    public string Recommendation { get; set; }
    public List<TimeSpan> AlternativeTimes { get; set; } = new();
}

public class FareEstimation
{
    public double EstimatedFare { get; set; }
    public FareRange Range { get; set; }
    public List<string> Factors { get; set; } = new();
    public double Confidence { get; set; }
    public FareBreakdown Breakdown { get; set; }
}

public class FareRange
{
    public double Min { get; set; }
    public double Max { get; set; }
}

public class FareBreakdown
{
    public double BaseFare { get; set; }
    public double DistanceCost { get; set; }
    public double TimeCost { get; set; }
    public double FuelCost { get; set; }
    public double TrafficAdjustment { get; set; }
}
