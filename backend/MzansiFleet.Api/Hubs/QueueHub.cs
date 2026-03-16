using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace MzansiFleet.Api.Hubs
{
    public class QueueHub : Hub
    {
        public async Task JoinQueueGroup(string taxiRankId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"rank_{taxiRankId}");
        }

        public async Task LeaveQueueGroup(string taxiRankId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"rank_{taxiRankId}");
        }

        public async Task SubscribeToRouteUpdates(string taxiRankId, string routeId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"rank_{taxiRankId}_route_{routeId}");
        }

        public async Task UnsubscribeFromRouteUpdates(string taxiRankId, string routeId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"rank_{taxiRankId}_route_{routeId}");
        }
    }
}
