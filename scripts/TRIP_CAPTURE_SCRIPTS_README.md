# Trip Capture Scripts

This directory contains PowerShell scripts for capturing trip records in the Mzansi Fleet system.

## Scripts Overview

### 1. `capture-trip-fg79ffgp.ps1`
**Purpose**: Captures a specific trip for vehicle registration "FG79FFGP" with 15 passengers.

**Usage**:
```powershell
.\capture-trip-fg79ffgp.ps1
```

**What it does**:
- Finds the vehicle with registration "FG79FFGP"
- Generates 15 passengers with realistic data
- Creates a completed trip record
- Submits to the TripDetails API

### 2. `capture-trip.ps1`
**Purpose**: Generic script for capturing trips with customizable parameters.

**Usage**:
```powershell
.\capture-trip.ps1 -VehicleRegistration "ABC123" -PassengerCount 10 [-BaseFare 25.00] [-Notes "Custom notes"] [-DryRun]
```

**Parameters**:
- `VehicleRegistration` (Required): Vehicle registration number
- `PassengerCount` (Required): Number of passengers
- `BaseFare` (Optional): Fare per passenger (default: 25.00)
- `Notes` (Optional): Custom notes for the trip
- `DryRun` (Optional): Preview the trip data without submitting to API

**Examples**:
```powershell
# Basic usage
.\capture-trip.ps1 -VehicleRegistration "FG79FFGP" -PassengerCount 15

# With custom fare and notes
.\capture-trip.ps1 -VehicleRegistration "ABC123" -PassengerCount 8 -BaseFare 30.00 -Notes "Morning commute"

# Dry run to preview data
.\capture-trip.ps1 -VehicleRegistration "FG79FFGP" -PassengerCount 15 -DryRun
```

## Prerequisites

1. **Backend API Running**: The Mzansi Fleet backend must be running on `http://localhost:5000`
2. **Vehicle Exists**: The specified vehicle registration must exist in the system
3. **PowerShell**: Windows PowerShell or PowerShell Core

## Generated Data

### Passengers
Each passenger gets automatically generated data:
- **Name**: "Passenger X" (where X is the passenger number)
- **Contact Number**: Sequential phone numbers (0700000001, 0700000002, etc.)
- **Next of Kin**: "Next of Kin X"
- **Next of Kin Contact**: Sequential numbers offset by 100
- **Address**: "Address X, City"
- **Destination**: "Destination City"
- **Fare Amount**: As specified (default: 25.00)

### Trip Details
- **Trip Date**: Current date/time
- **Departure Time**: Current time
- **Arrival Time**: 2 hours after departure
- **Status**: "Completed"
- **Route/Driver**: Null (assumes owner-driven trip)
- **Total Fare**: Passenger count × Base fare

## API Endpoint

The scripts use the `POST /api/TripDetails` endpoint with the following payload structure:

```json
{
  "vehicleId": "guid",
  "routeId": null,
  "driverId": null,
  "tripDate": "2026-02-03T16:50:31Z",
  "departureTime": "16:50",
  "arrivalTime": "18:50",
  "passengers": [...],
  "passengerCount": 15,
  "totalFare": 375.00,
  "notes": "Trip description",
  "status": "Completed"
}
```

## Error Handling

The scripts include comprehensive error handling:
- Vehicle not found validation
- API call error reporting
- Detailed error response display
- Graceful exit with error codes

## Output

**Successful execution** shows:
- Vehicle details found
- Passenger generation summary
- Trip details preview
- API response with trip ID
- Success confirmation

**Error output** includes:
- Specific error messages
- API response details (when available)
- Troubleshooting information

## Use Cases

1. **Testing**: Generate test trip data for development
2. **Data Entry**: Bulk capture of completed trips
3. **Demonstration**: Show system capabilities with realistic data
4. **Migration**: Import historical trip data

## Notes

- All trips are created with "Completed" status
- Passenger data is generated procedurally for testing purposes
- Real passenger data should be collected through proper channels
- Scripts assume the backend is running locally on port 5000