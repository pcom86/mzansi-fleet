using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace MzansiFleet.Api.Services
{
    public interface IFileUploadService
    {
        Task<string> UploadReceiptImageAsync(Guid vehicleId, IFormFile file);
        Task<string> UploadReceiptFileAsync(Guid vehicleId, IFormFile file);
        Task<bool> DeleteFileAsync(string fileUrl);
        List<string> GetAllowedImageTypes();
        List<string> GetAllowedFileTypes();
    }

    public class FileUploadService : IFileUploadService
    {
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<FileUploadService> _logger;
        private readonly string _uploadsFolder;
        private readonly string _receiptsFolder;

        public FileUploadService(IWebHostEnvironment environment, ILogger<FileUploadService> logger)
        {
            _environment = environment;
            _logger = logger;
            _uploadsFolder = Path.Combine(environment.ContentRootPath, "uploads");
            _receiptsFolder = Path.Combine(_uploadsFolder, "receipts");
            
            // Ensure directories exist
            Directory.CreateDirectory(_uploadsFolder);
            Directory.CreateDirectory(_receiptsFolder);
        }

        public async Task<string> UploadReceiptImageAsync(Guid vehicleId, IFormFile file)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("No file provided");

            // Validate file type
            var allowedTypes = GetAllowedImageTypes();
            var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
            
            if (!allowedTypes.Contains(fileExtension))
                throw new InvalidOperationException($"File type {fileExtension} is not allowed for receipt images");

            // Create vehicle-specific folder
            var vehicleFolder = Path.Combine(_receiptsFolder, vehicleId.ToString());
            Directory.CreateDirectory(vehicleFolder);

            // Generate unique filename
            var fileName = $"receipt_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid()}{fileExtension}";
            var filePath = Path.Combine(vehicleFolder, fileName);

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Return relative URL
            var relativePath = Path.Combine("uploads", "receipts", vehicleId.ToString(), fileName)
                .Replace("\\", "/");
            
            _logger.LogInformation($"Receipt image uploaded: {relativePath}");
            return relativePath;
        }

        public async Task<string> UploadReceiptFileAsync(Guid vehicleId, IFormFile file)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("No file provided");

            // Validate file type
            var allowedTypes = GetAllowedFileTypes();
            var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
            
            if (!allowedTypes.Contains(fileExtension))
                throw new InvalidOperationException($"File type {fileExtension} is not allowed for receipt files");

            // Create vehicle-specific folder
            var vehicleFolder = Path.Combine(_receiptsFolder, vehicleId.ToString());
            Directory.CreateDirectory(vehicleFolder);

            // Generate unique filename
            var fileName = $"receipt_file_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid()}{fileExtension}";
            var filePath = Path.Combine(vehicleFolder, fileName);

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Return relative URL
            var relativePath = Path.Combine("uploads", "receipts", vehicleId.ToString(), fileName)
                .Replace("\\", "/");
            
            _logger.LogInformation($"Receipt file uploaded: {relativePath}");
            return relativePath;
        }

        public async Task<bool> DeleteFileAsync(string fileUrl)
        {
            try
            {
                if (string.IsNullOrEmpty(fileUrl))
                    return false;

                // Convert URL to physical path
                var fileName = Path.GetFileName(fileUrl);
                var vehicleId = fileUrl.Split('/')[2]; // uploads/receipts/{vehicleId}/filename
                
                var filePath = Path.Combine(_receiptsFolder, vehicleId, fileName);

                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                    _logger.LogInformation($"File deleted: {fileUrl}");
                    return true;
                }

                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting file: {fileUrl}");
                return false;
            }
        }

        public List<string> GetAllowedImageTypes()
        {
            return new List<string> { ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp" };
        }

        public List<string> GetAllowedFileTypes()
        {
            return new List<string> { ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png" };
        }
    }
}
