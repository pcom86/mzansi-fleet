using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace MzansiFleet.Api.Services.AI
{
    public class ChatbotService
    {
        private readonly IConfiguration _configuration;
        private readonly ExternalAIService _externalAI;

        public ChatbotService(IConfiguration configuration, ExternalAIService externalAI)
        {
            _configuration = configuration;
            _externalAI = externalAI;
        }
        
        /// <summary>
        /// Processes natural language queries from passengers/drivers
        /// </summary>
        public async Task<ChatbotResponse> ProcessQuery(string query, string userId, string userRole = "passenger")
        {
            // Build user context for better responses
            var userContext = BuildUserContext(userId, userRole);
            
            // Use specialized taxi query processing
            var openAIResponse = await _externalAI.ProcessTaxiQuery(query, userContext);
            
            if (!openAIResponse.Success)
            {
                return new ChatbotResponse
                {
                    Message = "I'm having trouble connecting right now. Please try again later.",
                    Intent = "error",
                    Confidence = 0.0,
                    Actions = new List<string>()
                };
            }

            var intent = DetectIntent(query);
            var response = openAIResponse.Content;
            
            return new ChatbotResponse
            {
                Message = response,
                Intent = intent,
                Confidence = 0.92,
                Actions = ExtractActions(intent, userId),
                TokensUsed = openAIResponse.TokensUsed
            };
        }
        
        /// <summary>
        /// Generate automated responses for common scenarios
        /// </summary>
        public async Task<ChatbotResponse> GenerateScenarioResponse(string scenario, string details = null)
        {
            var openAIResponse = await _externalAI.GenerateTaxiResponse(scenario, details);
            
            return new ChatbotResponse
            {
                Message = openAIResponse.Content,
                Intent = "automated_response",
                Confidence = 0.95,
                Actions = new List<string>(),
                TokensUsed = openAIResponse.TokensUsed
            };
        }
        
        private string BuildUserContext(string userId, string userRole)
        {
            return $"User ID: {userId}, Role: {userRole}, System: Mzansi Fleet Taxi Management";
        }
        
        private string DetectIntent(string query)
        {
            query = query.ToLowerInvariant();
            
            if (query.Contains("route") || query.Contains("schedule"))
                return "route_inquiry";
            if (query.Contains("book") || query.Contains("reserve"))
                return "booking_request";
            if (query.Contains("pay") || query.Contains("payment"))
                return "payment_issue";
            if (query.Contains("complaint") || query.Contains("problem"))
                return "complaint";
            if (query.Contains("fare") || query.Contains("price"))
                return "fare_inquiry";
            if (query.Contains("time") || query.Contains("when"))
                return "timing_inquiry";
            
            return "general_inquiry";
        }
        
        private List<string> ExtractActions(string intent, string userId)
        {
            var actions = new List<string>();
            
            switch (intent)
            {
                case "booking_request":
                    actions.Add("CREATE_BOOKING");
                    actions.Add($"USER_ID:{userId}");
                    break;
                case "route_inquiry":
                    actions.Add("SHOW_ROUTES");
                    break;
                case "fare_inquiry":
                    actions.Add("ESTIMATE_FARE");
                    break;
                case "payment_issue":
                    actions.Add("CONTACT_SUPPORT");
                    break;
            }
            
            return actions;
        }
    }
    
    public class ChatbotResponse
    {
        public string Message { get; set; }
        public string Intent { get; set; }
        public double Confidence { get; set; }
        public List<string> Actions { get; set; } = new();
        public int TokensUsed { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
