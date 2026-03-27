using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace MzansiFleet.Api.Services
{
    public interface ISMSService
    {
        Task SendLoginCredentialsAsync(string phoneNumber, string fullName, string username, string password);
        Task SendPasswordResetAsync(string phoneNumber, string resetToken);
    }

    public class SMSService : ISMSService
    {
        private readonly ILogger<SMSService> _logger;
        private readonly IConfiguration _configuration;

        public SMSService(ILogger<SMSService> logger, IConfiguration configuration)
        {
            _logger = logger;
            _configuration = configuration;
        }

        public async Task SendLoginCredentialsAsync(string phoneNumber, string fullName, string username, string password)
        {
            try
            {
                var message = $"MzansiFleet - Welcome {fullName}! Your login credentials: Username: {username}, Password: {password}. Please change your password on first login.";
                
                // TODO: Implement actual SMS provider integration
                // Options: Twilio, AWS SNS, Azure Communication Services, or local SMS gateway
                
                await SendSMSAsync(phoneNumber, message);
                
                _logger.LogInformation($"SMS sent successfully to {phoneNumber} for user {username}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send SMS to {phoneNumber}");
                throw;
            }
        }

        public async Task SendPasswordResetAsync(string phoneNumber, string resetToken)
        {
            try
            {
                var message = $"MzansiFleet - Password reset requested. Use this code: {resetToken}. If you didn't request this, please ignore.";
                
                await SendSMSAsync(phoneNumber, message);
                
                _logger.LogInformation($"Password reset SMS sent to {phoneNumber}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send password reset SMS to {phoneNumber}");
                throw;
            }
        }

        private async Task SendSMSAsync(string phoneNumber, string message)
        {
            // Placeholder implementation - Replace with actual SMS provider
            // This is a mock implementation for development
            
            // Example Twilio implementation:
            /*
            var accountSid = _configuration["Twilio:AccountSid"];
            var authToken = _configuration["Twilio:AuthToken"];
            var fromNumber = _configuration["Twilio:FromNumber"];
            
            TwilioClient.Init(accountSid, authToken);
            
            var messageOptions = new CreateMessageOptions(
                new PhoneNumber(phoneNumber))
            {
                From = new PhoneNumber(fromNumber),
                Body = message
            };
            
            var messageResource = await MessageResource.CreateAsync(messageOptions);
            */
            
            // For development, just log the message
            _logger.LogInformation($"SMS Mock - To: {phoneNumber}, Message: {message}");
            
            // Simulate async operation
            await Task.Delay(100);
        }
    }
}
