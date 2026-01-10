using System;
using System.Security.Cryptography;
using System.Text;

namespace MzansiFleet.Utilities
{
    /// <summary>
    /// Utility class for password hashing
    /// Use this to generate password hashes for creating test users
    /// </summary>
    public class PasswordHasher
    {
        /// <summary>
        /// Hashes a password using SHA256
        /// </summary>
        /// <param name="password">Plain text password</param>
        /// <returns>Base64 encoded hash</returns>
        public static string HashPassword(string password)
        {
            using (var sha256 = SHA256.Create())
            {
                var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
                return Convert.ToBase64String(hashedBytes);
            }
        }

        /// <summary>
        /// Verifies a password against a hash
        /// </summary>
        /// <param name="password">Plain text password</param>
        /// <param name="hash">Hashed password to compare</param>
        /// <returns>True if password matches hash</returns>
        public static bool VerifyPassword(string password, string hash)
        {
            var passwordHash = HashPassword(password);
            return passwordHash == hash;
        }

        // Example usage for creating test users
        public static void Main(string[] args)
        {
            Console.WriteLine("Password Hasher Utility");
            Console.WriteLine("=======================\n");

            // Common test passwords
            var testPasswords = new[]
            {
                "password",
                "password123",
                "admin123",
                "driver123",
                "owner123"
            };

            Console.WriteLine("Test Password Hashes:");
            Console.WriteLine("---------------------");
            
            foreach (var password in testPasswords)
            {
                var hash = HashPassword(password);
                Console.WriteLine($"Password: {password}");
                Console.WriteLine($"Hash:     {hash}");
                Console.WriteLine();
            }

            // Interactive mode
            Console.WriteLine("\nEnter a password to hash (or press Enter to exit):");
            while (true)
            {
                Console.Write("> ");
                var input = Console.ReadLine();
                
                if (string.IsNullOrWhiteSpace(input))
                    break;
                
                var hash = HashPassword(input);
                Console.WriteLine($"Hash: {hash}\n");
            }
        }
    }
}

/*
 * USAGE INSTRUCTIONS:
 * 
 * 1. To run this utility:
 *    dotnet run --project PasswordHasher
 * 
 * 2. Or compile and run:
 *    dotnet build
 *    dotnet run
 * 
 * 3. To use in code:
 *    var hash = PasswordHasher.HashPassword("mypassword");
 * 
 * 4. Common test password hashes:
 * 
 *    password       → XohImNooBHFR0OVvjcYpJ3NgPQ1qq73WKhHvch0VQtg=
 *    password123    → EF797C8118F02DFB649607DD5D3F8C7623048C9C063D532CC95C5ED7A898A64F (base64)
 *    admin123       → 240BE518FABD2724DDB6F04EEB1DA5967448D7E831C08C8FA822809F74C720A9 (base64)
 * 
 * 5. Creating a test user in Swagger:
 * 
 *    POST /api/Identity/users
 *    {
 *      "tenantId": "00000000-0000-0000-0000-000000000001",
 *      "email": "admin@mzansifleet.com",
 *      "phone": "+27821234567",
 *      "passwordHash": "XohImNooBHFR0OVvjcYpJ3NgPQ1qq73WKhHvch0VQtg=",
 *      "role": "Admin",
 *      "isActive": true
 *    }
 * 
 *    Then login with:
 *    POST /api/Identity/login
 *    {
 *      "email": "admin@mzansifleet.com",
 *      "password": "password"
 *    }
 */
