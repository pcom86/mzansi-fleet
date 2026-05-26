var builder = DistributedApplication.CreateBuilder(args);

var db = builder.AddConnectionString("DefaultConnection");

var api = builder.AddExecutable("api", "dotnet", "../MzansiFleet.Api",
        "run", "--project", "MzansiFleet.Api.csproj", "--no-launch-profile")
    .WithReference(db)
    .WithEnvironment("SkipDatabase", "false")
    .WithEnvironment("ASPNETCORE_ENVIRONMENT", "Development")
    .WithEnvironment("ASPNETCORE_URLS", "http://0.0.0.0:5000");

var mobileFrontend = builder.AddExecutable("mobile-frontend", "npm.cmd", "../../frontend-mobile", "run", "web:reset")
    .WithEnvironment("PORT", "19006")
    .WaitFor(api);

builder.Build().Run();
