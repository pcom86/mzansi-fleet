$env:PGPASSWORD='postgres'
Write-Host "Checking for RentalOffers table..."
& 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -h localhost -U postgres -d MzansiFleetDb -c "\d ""RentalOffers"""

Write-Host "`n`nChecking for VehicleRentalBookings table..."
& 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -h localhost -U postgres -d MzansiFleetDb -c "\d ""VehicleRentalBookings"""

Write-Host "`n`nListing all tables..."
& 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -h localhost -U postgres -d MzansiFleetDb -c "\dt"
