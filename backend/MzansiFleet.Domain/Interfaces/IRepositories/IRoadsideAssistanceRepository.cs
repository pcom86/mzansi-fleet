using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Domain.Interfaces.IRepositories
{
    public interface IRoadsideAssistanceRepository
    {
        Task<RoadsideAssistanceRequest> CreateAsync(RoadsideAssistanceRequest request);
        Task<RoadsideAssistanceRequest?> GetByIdAsync(Guid id);
        Task<IEnumerable<RoadsideAssistanceRequest>> GetByUserIdAsync(Guid userId);
        Task<IEnumerable<RoadsideAssistanceRequest>> GetPendingRequestsAsync();
        Task<IEnumerable<RoadsideAssistanceRequest>> GetByServiceProviderIdAsync(Guid serviceProviderId);
        Task<RoadsideAssistanceRequest> UpdateAsync(RoadsideAssistanceRequest request);
        Task<bool> DeleteAsync(Guid id);
    }
}
