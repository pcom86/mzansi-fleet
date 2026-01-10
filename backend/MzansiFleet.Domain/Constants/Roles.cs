namespace MzansiFleet.Domain.Constants
{
    /// <summary>
    /// System-wide role definitions for the Mzansi Fleet Management System
    /// </summary>
    public static class Roles
    {
        // Fleet Management Roles
        public const string Owner = "Owner";
        public const string Driver = "Driver";
        public const string Staff = "Staff";
        public const string Passenger = "Passenger";
        
        // Service Provider Roles
        public const string Mechanic = "Mechanic";
        public const string Shop = "Shop";
        public const string ServiceProvider = "ServiceProvider";
        
        // Taxi Rank Management Roles
        public const string TaxiRankAdmin = "TaxiRankAdmin";
        public const string TaxiMarshal = "TaxiMarshal";
        
        // System Admin
        public const string Admin = "Admin";

        /// <summary>
        /// Get all available roles in the system
        /// </summary>
        public static string[] GetAllRoles()
        {
            return new[]
            {
                Owner,
                Driver,
                Staff,
                Passenger,
                Mechanic,
                Shop,
                ServiceProvider,
                TaxiRankAdmin,
                TaxiMarshal,
                Admin
            };
        }

        /// <summary>
        /// Check if a role exists in the system
        /// </summary>
        public static bool IsValidRole(string role)
        {
            return role switch
            {
                Owner => true,
                Driver => true,
                Staff => true,
                Passenger => true,
                Mechanic => true,
                Shop => true,
                ServiceProvider => true,
                TaxiRankAdmin => true,
                TaxiMarshal => true,
                Admin => true,
                _ => false
            };
        }
    }
}
