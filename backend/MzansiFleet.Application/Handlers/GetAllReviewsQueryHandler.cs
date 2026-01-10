using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class GetAllReviewsQueryHandler : IRequestHandler<GetAllReviewsQuery, IEnumerable<Review>>
    {
        private readonly IReviewRepository _repository;
        public GetAllReviewsQueryHandler(IReviewRepository repository)
        {
            _repository = repository;
        }
        public Task<IEnumerable<Review>> Handle(GetAllReviewsQuery request, CancellationToken cancellationToken)
        {
            var entities = _repository.GetAll();
            return Task.FromResult(entities);
        }
    }
}

