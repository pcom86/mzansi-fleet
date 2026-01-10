using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Repository
{
    public class MzansiFleetDbContext : DbContext
    {
        public MzansiFleetDbContext(DbContextOptions<MzansiFleetDbContext> options) : base(options) { }

        public DbSet<Vehicle> Vehicles { get; set; }
        public DbSet<VehicleDocument> VehicleDocuments { get; set; }
        public DbSet<VehicleEarnings> VehicleEarnings { get; set; }
        public DbSet<VehicleExpense> VehicleExpenses { get; set; }
        public DbSet<ServiceHistory> ServiceHistories { get; set; }
        public DbSet<MaintenanceHistory> MaintenanceHistories { get; set; }
        public DbSet<MaintenanceEvent> MaintenanceEvents { get; set; }
        public DbSet<ServiceRule> ServiceRules { get; set; }
        public DbSet<PartRule> PartRules { get; set; }
        public DbSet<Tenant> Tenants { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<OwnerProfile> OwnerProfiles { get; set; }
        public DbSet<StaffProfile> StaffProfiles { get; set; }
        public DbSet<DriverProfile> DriverProfiles { get; set; }
        public DbSet<PassengerProfile> PassengerProfiles { get; set; }
        public DbSet<MechanicProfile> MechanicProfiles { get; set; }
        public DbSet<ShopProfile> ShopProfiles { get; set; }
        public DbSet<TripRequest> TripRequests { get; set; }
        public DbSet<TripOffer> TripOffers { get; set; }
        public DbSet<TripBooking> TripBookings { get; set; }
        public DbSet<TripStop> TripStops { get; set; }
        public DbSet<PoolingGroup> PoolingGroups { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<MechanicalRequest> MechanicalRequests { get; set; }
        public DbSet<Quote> Quotes { get; set; }
        public DbSet<ServiceBooking> ServiceBookings { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Inventory> Inventories { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<PaymentIntent> PaymentIntents { get; set; }
        public DbSet<PaymentTransaction> PaymentTransactions { get; set; }
        public DbSet<LedgerEntry> LedgerEntries { get; set; }
        public DbSet<PayoutBatch> PayoutBatches { get; set; }
        public DbSet<PayoutItem> PayoutItems { get; set; }
        public DbSet<DisputeCase> DisputeCases { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<StuffRequest> StuffRequests { get; set; }
        public DbSet<StuffQuote> StuffQuotes { get; set; }
        public DbSet<ServiceProvider> ServiceProviders { get; set; }
        public DbSet<ServiceProviderProfile> ServiceProviderProfiles { get; set; }
        
        // Taxi Rank Module
        public DbSet<TaxiRank> TaxiRanks { get; set; }
        public DbSet<TaxiRankTrip> TaxiRankTrips { get; set; }
        public DbSet<TripPassenger> TripPassengers { get; set; }
        public DbSet<TripCost> TripCosts { get; set; }
        public DbSet<TaxiMarshalProfile> TaxiMarshalProfiles { get; set; }
        public DbSet<TaxiRankAdminProfile> TaxiRankAdmins { get; set; }
        public DbSet<VehicleTaxiRank> VehicleTaxiRanks { get; set; }
        public DbSet<TripSchedule> TripSchedules { get; set; }
        
        // Admin Dashboard Module
        public DbSet<Route> Routes { get; set; }
        public DbSet<OwnerAssignment> OwnerAssignments { get; set; }
        public DbSet<VehicleRouteAssignment> VehicleRouteAssignments { get; set; }
        public DbSet<Trip> Trips { get; set; }
        public DbSet<Passenger> Passengers { get; set; }
        public DbSet<VehicleEarning> VehicleEarningRecords { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure all entities with Guid IDs to not auto-generate values
            // This ensures the application-generated GUIDs are used
            modelBuilder.Entity<Tenant>().Property(t => t.Id).ValueGeneratedNever();
            modelBuilder.Entity<User>().Property(u => u.Id).ValueGeneratedNever();
            modelBuilder.Entity<OwnerProfile>().Property(o => o.Id).ValueGeneratedNever();
            modelBuilder.Entity<StaffProfile>().Property(s => s.Id).ValueGeneratedNever();
            modelBuilder.Entity<DriverProfile>().Property(d => d.Id).ValueGeneratedNever();
            modelBuilder.Entity<PassengerProfile>().Property(p => p.Id).ValueGeneratedNever();
            modelBuilder.Entity<MechanicProfile>().Property(m => m.Id).ValueGeneratedNever();
            modelBuilder.Entity<ShopProfile>().Property(s => s.Id).ValueGeneratedNever();
            modelBuilder.Entity<Vehicle>().Property(v => v.Id).ValueGeneratedNever();
            
            // Configure Photos as JSON column with proper conversion
            modelBuilder.Entity<Vehicle>()
                .Property(v => v.Photos)
                .HasColumnType("jsonb")
                .HasDefaultValueSql("'[]'::jsonb")
                .HasConversion(
                    v => System.Text.Json.JsonSerializer.Serialize(v, new System.Text.Json.JsonSerializerOptions()),
                    v => System.Text.Json.JsonSerializer.Deserialize<List<string>>(v, new System.Text.Json.JsonSerializerOptions()) ?? new List<string>()
                );
            
            modelBuilder.Entity<VehicleDocument>().Property(v => v.Id).ValueGeneratedNever();
            modelBuilder.Entity<TripRequest>().Property(t => t.Id).ValueGeneratedNever();
            modelBuilder.Entity<TripOffer>().Property(t => t.Id).ValueGeneratedNever();
            modelBuilder.Entity<TripBooking>().Property(t => t.Id).ValueGeneratedNever();
            modelBuilder.Entity<Review>().Property(r => r.Id).ValueGeneratedNever();
            modelBuilder.Entity<MechanicalRequest>().Property(m => m.Id).ValueGeneratedNever();
            modelBuilder.Entity<Quote>().Property(q => q.Id).ValueGeneratedNever();
            modelBuilder.Entity<ServiceBooking>().Property(s => s.Id).ValueGeneratedNever();
            modelBuilder.Entity<Product>().Property(p => p.Id).ValueGeneratedNever();
            modelBuilder.Entity<Order>().Property(o => o.Id).ValueGeneratedNever();
            modelBuilder.Entity<PaymentIntent>().Property(p => p.Id).ValueGeneratedNever();
            modelBuilder.Entity<PaymentTransaction>().Property(p => p.Id).ValueGeneratedNever();
            modelBuilder.Entity<PayoutBatch>().Property(p => p.Id).ValueGeneratedNever();
            modelBuilder.Entity<DisputeCase>().Property(d => d.Id).ValueGeneratedNever();
            modelBuilder.Entity<ServiceProvider>().Property(s => s.Id).ValueGeneratedNever();
            modelBuilder.Entity<ServiceProviderProfile>().Property(s => s.Id).ValueGeneratedNever();
            
            // Taxi Rank Module
            modelBuilder.Entity<TaxiRankTrip>().Property(t => t.Id).ValueGeneratedNever();
            modelBuilder.Entity<TripPassenger>().Property(t => t.Id).ValueGeneratedNever();
            modelBuilder.Entity<TripCost>().Property(t => t.Id).ValueGeneratedNever();
            modelBuilder.Entity<TaxiMarshalProfile>().Property(t => t.Id).ValueGeneratedNever();
        }
    }
}

