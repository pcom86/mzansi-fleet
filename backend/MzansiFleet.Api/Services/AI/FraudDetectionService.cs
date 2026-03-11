using MzansiFleet.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MzansiFleet.Api.Services.AI
{
    public class FraudDetectionService
    {
        private static readonly Dictionary<string, double> RiskThresholds = new()
        {
            ["HIGH_VALUE"] = 1000,
            ["UNUSUAL_DURATION"] = 4.0,
            ["LOW_FARE"] = 10,
            ["HIGH_FARE"] = 500
        };

        /// <summary>
        /// Analyzes transactions for potential fraud
        /// </summary>
        public async Task<FraudAnalysisResult> AnalyzeTransaction(PaymentTransaction transaction)
        {
            var riskScore = await CalculateRiskScore(transaction);
            var isSuspicious = riskScore > 0.7;
            
            return new FraudAnalysisResult
            {
                TransactionId = transaction.Id,
                RiskScore = riskScore,
                IsSuspicious = isSuspicious,
                RiskFactors = IdentifyRiskFactors(transaction),
                Recommendation = isSuspicious ? "BLOCK_AND_REVIEW" : "APPROVE"
            };
        }
        
        /// <summary>
        /// Detects anomalies in trip patterns
        /// </summary>
        public async Task<List<TripAnomaly>> DetectTripAnomalies(List<Trip> trips, DateTime period)
        {
            var anomalies = new List<TripAnomaly>();
            
            foreach (var trip in trips)
            {
                var anomalyScore = await CalculateAnomalyScore(trip);
                if (anomalyScore > 0.8)
                {
                    anomalies.Add(new TripAnomaly
                    {
                        TripId = trip.Id,
                        AnomalyType = GetAnomalyType(anomalyScore),
                        Score = anomalyScore,
                        Description = GetAnomalyDescription(anomalyScore)
                    });
                }
            }
            
            return anomalies;
        }
        
        private async Task<double> CalculateRiskScore(PaymentTransaction transaction)
        {
            await Task.Delay(5); // Simulate processing time
            
            var score = 0.1; // Base risk
            
            // High-value transaction check
            if ((double)transaction.Amount > RiskThresholds["HIGH_VALUE"])
                score += 0.3;
            
            // Location and frequency checks (simplified for optimization)
            score += IsUnusualLocation(transaction) ? 0.2 : 0;
            score += IsHighFrequency(transaction) ? 0.2 : 0;
            
            return Math.Min(score, 1.0);
        }
        
        private async Task<double> CalculateAnomalyScore(Trip trip)
        {
            await Task.Delay(5); // Simulate processing time
            
            var score = 0.0;
            
            // Duration anomaly check
            if (TryParseTripDuration(trip, out var duration))
            {
                if (duration.TotalHours > RiskThresholds["UNUSUAL_DURATION"] || duration.TotalHours < 0.5)
                    score += 0.4;
            }
            
            // Fare anomaly check
            if ((double)trip.TotalFare > RiskThresholds["HIGH_FARE"] || (double)trip.TotalFare < RiskThresholds["LOW_FARE"])
                score += 0.3;
            
            // Passenger count anomaly
            if (trip.PassengerCount > 15 || trip.PassengerCount < 1)
                score += 0.2;
            
            return Math.Min(score, 1.0);
        }
        
        private bool TryParseTripDuration(Trip trip, out TimeSpan duration)
        {
            duration = TimeSpan.Zero;
            
            if (string.IsNullOrEmpty(trip.ArrivalTime) || string.IsNullOrEmpty(trip.DepartureTime))
                return false;
            
            if (!DateTime.TryParse(trip.ArrivalTime, out var arrivalTime))
                return false;
            
            if (!DateTime.TryParse(trip.DepartureTime, out var departureTime))
                departureTime = trip.TripDate;
            
            duration = arrivalTime - departureTime;
            return duration.TotalMinutes > 0;
        }
        
        private List<string> IdentifyRiskFactors(PaymentTransaction transaction)
        {
            var factors = new List<string>();
            
            if ((double)transaction.Amount > RiskThresholds["HIGH_VALUE"])
                factors.Add("HIGH_VALUE_TRANSACTION");
            
            if (IsUnusualLocation(transaction))
                factors.Add("UNUSUAL_LOCATION");
            
            if (IsHighFrequency(transaction))
                factors.Add("HIGH_FREQUENCY");
            
            return factors;
        }
        
        private string GetAnomalyType(double score)
        {
            return score switch
            {
                > 0.9 => "CRITICAL_ANOMALY",
                > 0.8 => "HIGH_ANOMALY",
                > 0.7 => "MEDIUM_ANOMALY",
                _ => "LOW_ANOMALY"
            };
        }
        
        private string GetAnomalyDescription(double score)
        {
            return score switch
            {
                > 0.9 => "Critical deviation from normal patterns - immediate review required",
                > 0.8 => "High anomaly detected - investigate further",
                > 0.7 => "Moderate anomaly - monitor closely",
                _ => "Minor anomaly - standard review"
            };
        }
        
        private bool IsUnusualLocation(PaymentTransaction transaction)
        {
            // Simplified location check - would integrate with geolocation services
            return false;
        }
        
        private bool IsHighFrequency(PaymentTransaction transaction)
        {
            // Simplified frequency check - would analyze user transaction history
            return false;
        }
    }
    
    public class FraudAnalysisResult
    {
        public Guid TransactionId { get; set; }
        public double RiskScore { get; set; }
        public bool IsSuspicious { get; set; }
        public List<string> RiskFactors { get; set; } = new();
        public string Recommendation { get; set; }
        public DateTime AnalysisTime { get; set; } = DateTime.UtcNow;
    }
    
    public class TripAnomaly
    {
        public Guid TripId { get; set; }
        public string AnomalyType { get; set; }
        public double Score { get; set; }
        public string Description { get; set; }
        public DateTime DetectedAt { get; set; } = DateTime.UtcNow;
    }
}
