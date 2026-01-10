using System.Collections.Generic;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Queries
{
    public class GetAllUsersQuery : IRequest<IEnumerable<User>>
    {
    }
}

