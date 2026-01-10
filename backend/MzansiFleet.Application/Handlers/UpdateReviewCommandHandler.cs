using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class UpdateReviewCommandHandler : IRequestHandler<UpdateReviewCommand, Review>
    {
        private readonly IReviewRepository _repository;
        public UpdateReviewCommandHandler(IReviewRepository repository)
        {
            _repository = repository;
        }
        public Task<Review> Handle(UpdateReviewCommand request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            if (entity == null) return Task.FromResult<Review>(null);
            entity.ReviewerId = request.ReviewerId;
            entity.TargetId = request.TargetId;
            entity.TargetType = request.TargetType;
            entity.Rating = request.Rating;
            entity.Comments = request.Comments;
            entity.CreatedAt = request.CreatedAt;
            _repository.Update(entity);
            return Task.FromResult(entity);
        }
    }
}

