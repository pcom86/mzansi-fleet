#!/usr/bin/env dotnet-script
// List All Users and Their Roles in Mzansi Fleet System
// Run with: dotnet script list-all-users.csx

#r "nuget: Npgsql, 8.0.1"

using System;
using System.Collections.Generic;
using System.Linq;
using Npgsql;

var connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres";

Console.WriteLine("========================================");
Console.WriteLine("  Mzansi Fleet - User & Role Report");
Console.WriteLine("========================================");
Console.WriteLine();

try
{
    using var connection = new NpgsqlConnection(connectionString);
    connection.Open();
    
    Console.WriteLine($"Connected to database: MzansiFleetDb");
    Console.WriteLine();

    var query = @"
        SELECT 
            u.""Id"" as user_id,
            u.""Email"",
            u.""Phone"",
            u.""Role"",
            u.""IsActive"" as is_active,
            u.""CreatedAt"" as created_at,
            t.""Name"" as tenant_name,
            t.""Code"" as tenant_code,
            CASE 
                WHEN u.""Role"" = 'Owner' THEN op.""ContactName""
                WHEN u.""Role"" = 'Driver' THEN dp.""Name""
                WHEN u.""Role"" = 'ServiceProvider' THEN sp.""BusinessName""
                WHEN u.""Role"" = 'TaxiRankAdmin' THEN tra.""FullName""
                WHEN u.""Role"" = 'TaxiMarshal' THEN tmp.""FullName""
                ELSE NULL
            END as full_name,
            CASE 
                WHEN u.""Role"" = 'Owner' THEN op.""CompanyName""
                WHEN u.""Role"" = 'ServiceProvider' THEN sp.""BusinessName""
                ELSE NULL
            END as company_name,
            CASE 
                WHEN u.""Role"" = 'Driver' THEN dp.""LicenseNumber""
                WHEN u.""Role"" = 'TaxiRankAdmin' THEN tra.""AdminCode""
                WHEN u.""Role"" = 'TaxiMarshal' THEN tmp.""MarshalCode""
                WHEN u.""Role"" = 'ServiceProvider' THEN sp.""RegistrationNumber""
                ELSE NULL
            END as additional_info
        FROM ""Users"" u
        LEFT JOIN ""Tenants"" t ON u.""TenantId"" = t.""Id""
        LEFT JOIN ""OwnerProfiles"" op ON u.""Id"" = op.""UserId""
        LEFT JOIN ""DriverProfiles"" dp ON u.""Id"" = dp.""UserId""
        LEFT JOIN ""ServiceProviderProfiles"" sp ON u.""Id"" = sp.""UserId""
        LEFT JOIN ""TaxiRankAdminProfiles"" tra ON u.""Id"" = tra.""UserId""
        LEFT JOIN ""TaxiMarshalProfiles"" tmp ON u.""Id"" = tmp.""UserId""
        ORDER BY u.""Role"", u.""CreatedAt"" DESC";

    using var command = new NpgsqlCommand(query, connection);
    using var reader = command.ExecuteReader();

    var users = new List<dynamic>();
    var roleStats = new Dictionary<string, int>();
    
    while (reader.Read())
    {
        var role = reader["Role"]?.ToString() ?? "";
        
        if (!roleStats.ContainsKey(role))
            roleStats[role] = 0;
        roleStats[role]++;
        
        users.Add(new
        {
            UserId = reader["user_id"],
            Email = reader["Email"]?.ToString() ?? "",
            Phone = reader["Phone"]?.ToString() ?? "",
            Role = role,
            IsActive = reader["is_active"] as bool? ?? false,
            CreatedAt = reader["created_at"],
            TenantName = reader["tenant_name"]?.ToString() ?? "",
            TenantCode = reader["tenant_code"]?.ToString() ?? "",
            FullName = reader["full_name"]?.ToString() ?? "",
            CompanyName = reader["company_name"]?.ToString() ?? "",
            AdditionalInfo = reader["additional_info"]?.ToString() ?? ""
        });
    }

    Console.WriteLine("USERS AND ROLES:");
    Console.WriteLine(new string('=', 120));
    Console.WriteLine();

    string currentRole = "";
    foreach (var user in users)
    {
        if (currentRole != user.Role)
        {
            if (currentRole != "")
                Console.WriteLine();
            
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"[{user.Role}]");
            Console.ResetColor();
            Console.WriteLine(new string('-', 120));
            currentRole = user.Role;
        }

        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.Write("  Email:      ");
        Console.ResetColor();
        Console.WriteLine(user.Email);

        if (!string.IsNullOrWhiteSpace(user.FullName))
        {
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.Write("  Name:       ");
            Console.ResetColor();
            Console.WriteLine(user.FullName);
        }

        if (!string.IsNullOrWhiteSpace(user.CompanyName))
        {
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.Write("  Company:    ");
            Console.ResetColor();
            Console.WriteLine(user.CompanyName);
        }

        if (!string.IsNullOrWhiteSpace(user.Phone))
        {
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.Write("  Phone:      ");
            Console.ResetColor();
            Console.WriteLine(user.Phone);
        }

        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.Write("  Status:     ");
        Console.ForegroundColor = user.IsActive ? ConsoleColor.Green : ConsoleColor.Red;
        Console.WriteLine(user.IsActive ? "Active" : "Inactive");
        Console.ResetColor();

        if (!string.IsNullOrWhiteSpace(user.TenantName))
        {
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.Write("  Tenant:     ");
            Console.ResetColor();
            Console.WriteLine($"{user.TenantName} ({user.TenantCode})");
        }

        if (!string.IsNullOrWhiteSpace(user.AdditionalInfo))
        {
            var infoLabel = user.Role switch
            {
                "Driver" => "License:    ",
                "TaxiRankAdmin" => "Admin Code: ",
                "TaxiMarshal" => "Marshal Code:",
                "ServiceProvider" => "Reg Number: ",
                _ => "Info:       "
            };
            
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.Write($"  {infoLabel}");
            Console.ResetColor();
            Console.WriteLine(user.AdditionalInfo);
        }

        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.Write("  User ID:    ");
        Console.ForegroundColor = ConsoleColor.Gray;
        Console.WriteLine(user.UserId);
        Console.ResetColor();
        Console.WriteLine();
    }

    // Display summary
    Console.WriteLine();
    Console.WriteLine(new string('=', 120));
    Console.ForegroundColor = ConsoleColor.Green;
    Console.WriteLine("SUMMARY");
    Console.ResetColor();
    Console.WriteLine(new string('=', 120));
    Console.WriteLine();
    
    Console.ForegroundColor = ConsoleColor.Cyan;
    Console.Write("Total Users: ");
    Console.ResetColor();
    Console.WriteLine(users.Count);
    Console.WriteLine();
    
    Console.ForegroundColor = ConsoleColor.Cyan;
    Console.WriteLine("Users by Role:");
    Console.ResetColor();
    
    foreach (var kvp in roleStats.OrderBy(x => x.Key))
    {
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.Write($"  {kvp.Key}");
        Console.ResetColor();
        Console.Write("\t\t\t: ");
        Console.WriteLine(kvp.Value);
    }

    Console.WriteLine();
    Console.WriteLine(new string('=', 120));
    Console.WriteLine();

    // Display available roles
    Console.ForegroundColor = ConsoleColor.Green;
    Console.WriteLine("AVAILABLE ROLES IN SYSTEM:");
    Console.ResetColor();
    Console.WriteLine(new string('=', 120));
    Console.WriteLine();

    var availableRoles = new[]
    {
        ("Owner", "Vehicle owner who manages fleet"),
        ("Driver", "Vehicle driver"),
        ("Staff", "Staff member"),
        ("Passenger", "Passenger/Customer"),
        ("Mechanic", "Mechanic service provider"),
        ("Shop", "Shop/Workshop service provider"),
        ("ServiceProvider", "General service provider"),
        ("TaxiRankAdmin", "Taxi rank administrator"),
        ("TaxiMarshal", "Taxi marshal at rank"),
        ("Admin", "System administrator")
    };

    foreach (var (role, description) in availableRoles)
    {
        var count = roleStats.ContainsKey(role) ? roleStats[role] : 0;
        
        Console.Write("  ");
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.Write(role.PadRight(20));
        Console.ResetColor();
        Console.Write(" - ");
        Console.Write(description.PadRight(40));
        Console.ForegroundColor = ConsoleColor.Gray;
        Console.Write(" [Users: ");
        Console.ForegroundColor = count > 0 ? ConsoleColor.Green : ConsoleColor.DarkGray;
        Console.Write(count);
        Console.ForegroundColor = ConsoleColor.Gray;
        Console.WriteLine("]");
        Console.ResetColor();
    }

    Console.WriteLine();
    Console.WriteLine("========================================");
    Console.WriteLine();
}
catch (Exception ex)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine($"ERROR: {ex.Message}");
    Console.ResetColor();
    Console.WriteLine(ex.StackTrace);
}
