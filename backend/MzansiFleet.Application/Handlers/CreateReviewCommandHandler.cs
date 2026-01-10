using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class CreateReviewCommandHandler : IRequestHandler<CreateReviewCommand, Review>
    {
        private readonly IReviewRepository _repository;
        public CreateReviewCommandHandler(IReviewRepository repository)
        {
            _repository = repository;
        }
        public Task<Review> Handle(CreateReviewCommand request, CancellationToken cancellationToken)
        {
            var entity = new Review
            {
                Id = System.Guid.NewGuid(),
                ReviewerId = request.ReviewerId,
                TargetId = request.TargetId,
                TargetType = request.TargetType,
                Rating = request.Rating,
                Comments = request.Comments,
                CreatedAt = request.CreatedAt
            };
            _repository.Add(entity);
            return Task.FromResult(entity);
        }
    }
}
