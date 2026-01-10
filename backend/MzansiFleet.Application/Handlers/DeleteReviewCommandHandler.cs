using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class DeleteReviewCommandHandler : IRequestHandler<DeleteReviewCommand, bool>
    {
        private readonly IReviewRepository _repository;
        public DeleteReviewCommandHandler(IReviewRepository repository)
        {
            _repository = repository;
        }
        public Task<bool> Handle(DeleteReviewCommand request, CancellationToken cancellationToken)
        {
            _repository.Delete(request.Id);
            return Task.FromResult(true);
        }
    }
}

