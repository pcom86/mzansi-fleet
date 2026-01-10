## Plan: Refactor Vehicle Domain to Full CQRS

Refactor the Vehicle domain in both MzansiFleet.Api and MzansiFleet.Application to strictly follow the CQRS pattern. This involves separating command (write) and query (read) models, creating dedicated handlers, updating controllers, ensuring correct use of DTOs and repositories, and removing any code that mixes read/write logic.

### Steps
1. **Audit Current Vehicle Logic**  
   Review all Vehicle-related code in [Controllers/VehiclesController.cs](MzansiFleet.Api/Controllers/VehiclesController.cs), [VehicleService.cs](MzansiFleet.Api/Services/VehicleService.cs), [VehicleRepository.cs](MzansiFleet.Api/Repositories/VehicleRepository.cs), and [VehicleDto.cs](MzansiFleet.Api/DTOs/VehicleDto.cs) for mixed read/write logic.

2. **Separate Command and Query Models**  
   - Create distinct command models (e.g., `CreateVehicleCommand`, `UpdateVehicleCommand`) in [Commands/](MzansiFleet.Application/Commands/).
   - Create query models (e.g., `GetVehicleByIdQuery`, `ListVehiclesQuery`) in [Queries/](MzansiFleet.Application/Queries/).

3. **Implement Command and Query Handlers**  
   - Add/complete command handlers in [Handlers/](MzansiFleet.Application/Handlers/) for each command.
   - Add/complete query handlers for each query, ensuring no write logic is present.

4. **Refactor DTOs and Repositories**  
   - Ensure [VehicleDto.cs](MzansiFleet.Api/DTOs/VehicleDto.cs) is used only for data transfer, not domain logic.
   - Refactor [VehicleRepository.cs](MzansiFleet.Api/Repositories/VehicleRepository.cs) to expose separate methods for read and write operations, or split into separate repositories if needed.

5. **Update Controllers to Use Handlers**  
   - Refactor [VehiclesController.cs](MzansiFleet.Api/Controllers/VehiclesController.cs) to delegate commands to command handlers and queries to query handlers, removing any direct repository/service access.

6. **Remove Mixed Responsibility Code**  
   - Delete or refactor any code (especially in services or controllers) that mixes read and write logic, ensuring strict CQRS adherence.

### Further Considerations
1. Should repositories be split into separate read/write classes or just methods? (Option A: Split classes / Option B: Split methods)
2. Should MediatR or a similar library be introduced for handler dispatching, or use manual invocation?
3. Are there any existing tests that need updating to reflect the new CQRS structure?

