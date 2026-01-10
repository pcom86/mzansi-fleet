using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class DeleteStaffProfileCommandHandler : IRequestHandler<DeleteStaffProfileCommand, bool>
    {
        private readonly IStaffProfileRepository _repository;
        public DeleteStaffProfileCommandHandler(IStaffProfileRepository repository)
        {
            _repository = repository;
        }
        public Task<bool> Handle(DeleteStaffProfileCommand request, CancellationToken cancellationToken)
        {
            _repository.Delete(request.Id);
            return Task.FromResult(true);
        }
    }
}

