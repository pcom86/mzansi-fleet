using System;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MzansiFleet.Api.Services
{
    public class OzowSettings
    {
        public string SiteCode { get; set; } = "";
        public string PrivateKey { get; set; } = "";
        public string ApiKey { get; set; } = "";
        public bool IsTest { get; set; } = true;
        public string NotifyUrl { get; set; } = "";
        public string SuccessUrl { get; set; } = "";
        public string CancelUrl { get; set; } = "";
        public string ErrorUrl { get; set; } = "";
    }

    public class OzowPaymentRequest
    {
        public string SiteCode { get; set; } = "";
        public string CountryCode { get; set; } = "ZA";
        public string CurrencyCode { get; set; } = "ZAR";
        public decimal Amount { get; set; }
        public string TransactionReference { get; set; } = "";
        public string BankReference { get; set; } = "";
        public string Customer { get; set; } = "";
        public string NotifyUrl { get; set; } = "";
        public string SuccessUrl { get; set; } = "";
        public string CancelUrl { get; set; } = "";
        public string ErrorUrl { get; set; } = "";
        public bool IsTest { get; set; }
        public string HashCheck { get; set; } = "";
    }

    public class OzowNotification
    {
        public string SiteCode { get; set; } = "";
        public string TransactionId { get; set; } = "";
        public string TransactionReference { get; set; } = "";
        public decimal Amount { get; set; }
        public string Status { get; set; } = "";
        public string StatusMessage { get; set; } = "";
        public string CurrencyCode { get; set; } = "";
        public string IsTest { get; set; } = "";
        public string HashCheck { get; set; } = "";
    }

    public class OzowService
    {
        private readonly OzowSettings _settings;
        private readonly ILogger<OzowService> _logger;

        // Ozow payment page URL
        private const string OzowPayUrl = "https://pay.ozow.com";

        public OzowService(IConfiguration configuration, ILogger<OzowService> logger)
        {
            _settings = new OzowSettings();
            var section = configuration.GetSection("Ozow");
            section.Bind(_settings);
            _logger = logger;
        }

        /// <summary>
        /// Generate the Ozow payment URL that the mobile app opens in a WebView/browser.
        /// </summary>
        public OzowPaymentRequest GeneratePaymentRequest(
            string transactionReference,
            string bankReference,
            decimal amount,
            string customerEmail)
        {
            var request = new OzowPaymentRequest
            {
                SiteCode = _settings.SiteCode,
                CountryCode = "ZA",
                CurrencyCode = "ZAR",
                Amount = Math.Round(amount, 2),
                TransactionReference = transactionReference,
                BankReference = bankReference,
                Customer = customerEmail,
                NotifyUrl = _settings.NotifyUrl,
                SuccessUrl = _settings.SuccessUrl,
                CancelUrl = _settings.CancelUrl,
                ErrorUrl = _settings.ErrorUrl,
                IsTest = _settings.IsTest,
            };

            // Generate SHA-512 hash: concatenate values in order, lowercased, with private key appended
            request.HashCheck = GenerateRequestHash(request);

            return request;
        }

        /// <summary>
        /// Build the full Ozow payment URL with query parameters.
        /// </summary>
        public string GetPaymentUrl(OzowPaymentRequest request)
        {
            var qs = new StringBuilder();
            qs.Append($"{OzowPayUrl}?");
            qs.Append($"SiteCode={Uri.EscapeDataString(request.SiteCode)}");
            qs.Append($"&CountryCode={request.CountryCode}");
            qs.Append($"&CurrencyCode={request.CurrencyCode}");
            qs.Append($"&Amount={request.Amount:F2}");
            qs.Append($"&TransactionReference={Uri.EscapeDataString(request.TransactionReference)}");
            qs.Append($"&BankReference={Uri.EscapeDataString(request.BankReference)}");
            qs.Append($"&Customer={Uri.EscapeDataString(request.Customer)}");
            qs.Append($"&NotifyUrl={Uri.EscapeDataString(request.NotifyUrl)}");
            qs.Append($"&SuccessUrl={Uri.EscapeDataString(request.SuccessUrl)}");
            qs.Append($"&CancelUrl={Uri.EscapeDataString(request.CancelUrl)}");
            qs.Append($"&ErrorUrl={Uri.EscapeDataString(request.ErrorUrl)}");
            qs.Append($"&IsTest={request.IsTest.ToString().ToLower()}");
            qs.Append($"&HashCheck={request.HashCheck}");

            return qs.ToString();
        }

        /// <summary>
        /// Validate the hash on an incoming Ozow notification (webhook).
        /// </summary>
        public bool ValidateNotificationHash(OzowNotification notification)
        {
            var input = string.Concat(
                notification.SiteCode,
                notification.TransactionId,
                notification.TransactionReference,
                notification.Amount.ToString("F2"),
                notification.Status,
                notification.CurrencyCode,
                notification.IsTest,
                _settings.PrivateKey
            ).ToLower();

            var computed = ComputeSha512(input);
            return string.Equals(computed, notification.HashCheck, StringComparison.OrdinalIgnoreCase);
        }

        private string GenerateRequestHash(OzowPaymentRequest request)
        {
            // Ozow hash: SiteCode + CountryCode + CurrencyCode + Amount + TransactionReference
            // + BankReference + Customer + NotifyUrl + SuccessUrl + CancelUrl + ErrorUrl
            // + IsTest + PrivateKey — all concatenated, lowercased, then SHA-512
            var input = string.Concat(
                request.SiteCode,
                request.CountryCode,
                request.CurrencyCode,
                request.Amount.ToString("F2"),
                request.TransactionReference,
                request.BankReference,
                request.Customer,
                request.NotifyUrl,
                request.SuccessUrl,
                request.CancelUrl,
                request.ErrorUrl,
                request.IsTest.ToString().ToLower(),
                _settings.PrivateKey
            ).ToLower();

            return ComputeSha512(input);
        }

        private static string ComputeSha512(string input)
        {
            var bytes = SHA512.HashData(Encoding.UTF8.GetBytes(input));
            return Convert.ToHexStringLower(bytes);
        }
    }
}
