using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Application.Handlers;
using MzansiFleet.Domain.Interfaces.IRepositories;
using MzansiFleet.Repository;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TripRequestsController : ControllerBase
    {
        private readonly CreateTripRequestCommandHandler _createTripRequestHandler;
        private readonly ITripRequestRepository _requestRepo;
        private readonly ITripOfferRepository _offerRepo;
        private readonly MzansiFleetDbContext _context;

        public TripRequestsController(
            CreateTripRequestCommandHandler createTripRequestHandler,
            ITripRequestRepository requestRepo,
            ITripOfferRepository offerRepo,
            MzansiFleetDbContext context)
        {
            _createTripRequestHandler = createTripRequestHandler;
            _requestRepo = requestRepo;
            _offerRepo = offerRepo;
            _context = context;
        }

        [HttpPost]
        public ActionResult<TripRequest> Create([FromBody] CreateTripRequestCommand command)
        {
            var result = _createTripRequestHandler.Handle(command, CancellationToken.None).Result;
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpGet]
        public ActionResult<object> GetAll([FromQuery] string status = null, [FromQuery] string passengerId = null, [FromQuery] string driverId = null)
        {
            var all = _requestRepo.GetAll();
            if (!string.IsNullOrWhiteSpace(status))
                all = all.Where(r => r.State != null && r.State.Equals(status, StringComparison.OrdinalIgnoreCase));
            if (!string.IsNullOrWhiteSpace(passengerId) && Guid.TryParse(passengerId, out var pId))
                all = all.Where(r => r.PassengerId == pId);
            if (!string.IsNullOrWhiteSpace(driverId) && Guid.TryParse(driverId, out var dId))
                all = all.Where(r => r.DriverId == dId);
            return Ok(all.OrderByDescending(r => r.RequestedTime).ToList());
        }


        [HttpGet("rank/{rankId}")]
        public ActionResult<object> GetByRank(Guid rankId, [FromQuery] string status = "Requested")
        {
            var allRequests = _requestRepo.GetAll().AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
                allRequests = allRequests.Where(r => r.State != null && r.State.Equals(status, StringComparison.OrdinalIgnoreCase));

            // Requests tagged to this specific rank
            var byRank = allRequests.Where(r => r.TaxiRankId == rankId).AsEnumerable();

            // Untagged requests (no rank assigned) are visible to all drivers
            var untagged = allRequests.Where(r => r.TaxiRankId == null).AsEnumerable();

            var result = byRank
                .Concat(untagged)
                .GroupBy(r => r.Id)
                .Select(g => g.First());

            return Ok(result.OrderByDescending(r => r.RequestedTime).ToList());
        }

        [HttpGet("route/{routeId}")]
        public ActionResult<object> GetByRoute(Guid routeId, [FromQuery] string status = "Requested")
        {
            var route = _context.Routes
                .Include(r => r.Stops)
                .FirstOrDefault(r => r.Id == routeId);

            if (route == null)
                return NotFound(new { message = "Route not found" });

            var requests = _requestRepo.GetAll().AsQueryable();
            if (!string.IsNullOrWhiteSpace(status))
                requests = requests.Where(r => r.State != null && r.State.Equals(status, StringComparison.OrdinalIgnoreCase));

            var filtered = requests
                .AsEnumerable()
                .Where(r => RequestMatchesRoute(r, route))
                .OrderByDescending(r => r.RequestedTime)
                .ToList();

            return Ok(filtered);
        }

        private static bool RequestMatchesRoute(TripRequest request, Route route)
        {
            if (request == null || route == null) return false;
            string normalize(string value) => (value ?? string.Empty).ToLowerInvariant().Trim();
            var pickup = normalize(request.PickupLocation);
            var dropoff = normalize(request.DropoffLocation);
            var fields = new[]
            {
                normalize(route.RouteName),
                normalize(route.DepartureStation),
                normalize(route.DestinationStation)
            }
            .Where(f => !string.IsNullOrEmpty(f))
            .ToList();

            if (route.Stops != null)
            {
                fields.AddRange(route.Stops
                    .Select(s => normalize(s.StopName))
                    .Where(f => !string.IsNullOrEmpty(f)));
            }

            if (!fields.Any()) return false;

            return fields.Any(field =>
                (!string.IsNullOrEmpty(pickup) && (pickup.Contains(field) || field.Contains(pickup))) ||
                (!string.IsNullOrEmpty(dropoff) && (dropoff.Contains(field) || field.Contains(dropoff))));
        }

        [HttpGet("{id}")]
        public ActionResult<TripRequest> GetById(Guid id)
        {
            var entity = _requestRepo.GetById(id);
            if (entity == null) return NotFound();
            return Ok(entity);
        }

        [HttpGet("passenger/{passengerId}")]
        public ActionResult<object> GetByPassenger(Guid passengerId)
        {
            var requests = _requestRepo.GetAll()
                .Where(r => r.PassengerId == passengerId)
                .OrderByDescending(r => r.RequestedTime)
                .ToList();
            return Ok(requests);
        }

        [HttpPost("{id}/accept")]
        public ActionResult<TripOffer> Accept(Guid id, [FromBody] AcceptTripRequestDto dto)
        {
            var request = _requestRepo.GetById(id);
            if (request == null) return NotFound("Trip request not found");
            if (request.State != "Requested" && request.State != "Pending")
                return BadRequest("Trip request is not available for acceptance");

            var offer = new TripOffer
            {
                Id = Guid.NewGuid(),
                TripRequestId = id,
                DriverId = dto.DriverId,
                OfferPrice = dto.OfferPrice > 0 ? dto.OfferPrice : 0,
                Expiry = DateTime.UtcNow.AddMinutes(15),
                State = "Accepted",
            };
            _offerRepo.Add(offer);

            request.DriverId = dto.DriverId;
            request.AcceptedAt = DateTime.UtcNow;
            request.TotalPrice = offer.OfferPrice > 0 ? offer.OfferPrice : request.TotalPrice;
            request.State = "OffersReceived";
            _requestRepo.Update(request);

            return Ok(offer);
        }

        [HttpPut("{id}/start")]
        public ActionResult<TripRequest> Start(Guid id, [FromBody] StartTripRequestDto dto)
        {
            var request = _requestRepo.GetById(id);
            if (request == null) return NotFound("Trip request not found");
            if (request.State != "OffersReceived" && request.State != "Accepted")
                return BadRequest("Trip request is not ready to start");

            if (request.DriverId == null && dto.DriverId != Guid.Empty)
            {
                request.DriverId = dto.DriverId;
            }

            request.PickupStartedAt = DateTime.UtcNow;
            request.State = "InProgress";
            _requestRepo.Update(request);

            return Ok(request);
        }

        [HttpPut("{id}/complete")]
        public ActionResult<TripRequest> Complete(Guid id, [FromBody] CompleteTripRequestDto dto)
        {
            var request = _requestRepo.GetById(id);
            if (request == null) return NotFound("Trip request not found");
            if (request.State != "InProgress")
                return BadRequest("Trip request is not in progress");

            request.CompletedAt = DateTime.UtcNow;
            request.DistanceKm = dto.DistanceKm > 0 ? dto.DistanceKm : request.DistanceKm;
            request.RatePerKm = dto.RatePerKm > 0 ? dto.RatePerKm : request.RatePerKm;
            request.TotalPrice = dto.TotalPrice > 0 ? dto.TotalPrice : request.TotalPrice;
            request.State = "Completed";
            _requestRepo.Update(request);

            return Ok(request);
        }
    }

    public class AcceptTripRequestDto
    {
        public Guid DriverId { get; set; }
        public decimal OfferPrice { get; set; }
    }

    public class StartTripRequestDto
    {
        public Guid DriverId { get; set; }
    }

    public class CompleteTripRequestDto
    {
        public decimal DistanceKm { get; set; }
        public decimal RatePerKm { get; set; }
        public decimal TotalPrice { get; set; }
    }
}


