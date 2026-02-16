using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

#nullable enable

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MessagesController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public MessagesController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        // GET: api/Messages/inbox/{userId}
        [HttpGet("inbox/{userId}")]
        public async Task<ActionResult<IEnumerable<MessageDto>>> GetInbox(Guid userId)
        {
            var messages = await _context.Messages
                .Where(m => m.ReceiverId == userId && !m.IsDeletedByReceiver)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            var messageDtos = messages.Select(m => new MessageDto
            {
                Id = m.Id,
                SenderId = m.SenderId,
                ReceiverId = m.ReceiverId,
                Subject = m.Subject,
                Content = m.Content,
                IsRead = m.IsRead,
                CreatedAt = m.CreatedAt,
                ReadAt = m.ReadAt,
                RelatedEntityType = m.RelatedEntityType,
                RelatedEntityId = m.RelatedEntityId,
                ParentMessageId = m.ParentMessageId,
                SenderName = GetUserName(m.SenderId),
                SenderEmail = GetUserEmail(m.SenderId)
            }).ToList();

            return Ok(messageDtos);
        }

        // GET: api/Messages/sent/{userId}
        [HttpGet("sent/{userId}")]
        public async Task<ActionResult<IEnumerable<MessageDto>>> GetSent(Guid userId)
        {
            var messages = await _context.Messages
                .Where(m => m.SenderId == userId && !m.IsDeletedBySender)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            var messageDtos = messages.Select(m => new MessageDto
            {
                Id = m.Id,
                SenderId = m.SenderId,
                ReceiverId = m.ReceiverId,
                Subject = m.Subject,
                Content = m.Content,
                IsRead = m.IsRead,
                CreatedAt = m.CreatedAt,
                ReadAt = m.ReadAt,
                RelatedEntityType = m.RelatedEntityType,
                RelatedEntityId = m.RelatedEntityId,
                ParentMessageId = m.ParentMessageId,
                ReceiverName = GetUserName(m.ReceiverId),
                ReceiverEmail = GetUserEmail(m.ReceiverId)
            }).ToList();

            return Ok(messageDtos);
        }

        // GET: api/Messages/conversation/{userId}/{otherUserId}
        [HttpGet("conversation/{userId}/{otherUserId}")]
        public async Task<ActionResult<IEnumerable<MessageDto>>> GetConversation(Guid userId, Guid otherUserId)
        {
            var messages = await _context.Messages
                .Where(m => 
                    (m.SenderId == userId && m.ReceiverId == otherUserId && !m.IsDeletedBySender) ||
                    (m.SenderId == otherUserId && m.ReceiverId == userId && !m.IsDeletedByReceiver))
                .OrderBy(m => m.CreatedAt)
                .Select(m => new MessageDto
                {
                    Id = m.Id,
                    SenderId = m.SenderId,
                    ReceiverId = m.ReceiverId,
                    Subject = m.Subject,
                    Content = m.Content,
                    IsRead = m.IsRead,
                    CreatedAt = m.CreatedAt,
                    ReadAt = m.ReadAt,
                    RelatedEntityType = m.RelatedEntityType,
                    RelatedEntityId = m.RelatedEntityId,
                    ParentMessageId = m.ParentMessageId,
                    SenderName = GetUserName(m.SenderId),
                    ReceiverName = GetUserName(m.ReceiverId),
                    SenderEmail = GetUserEmail(m.SenderId),
                    ReceiverEmail = GetUserEmail(m.ReceiverId)
                })
                .ToListAsync();

            return Ok(messages);
        }

        // GET: api/Messages/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<MessageDto>> GetById(Guid id)
        {
            var message = await _context.Messages.FindAsync(id);
            
            if (message == null)
                return NotFound();

            var dto = new MessageDto
            {
                Id = message.Id,
                SenderId = message.SenderId,
                ReceiverId = message.ReceiverId,
                Subject = message.Subject,
                Content = message.Content,
                IsRead = message.IsRead,
                CreatedAt = message.CreatedAt,
                ReadAt = message.ReadAt,
                RelatedEntityType = message.RelatedEntityType,
                RelatedEntityId = message.RelatedEntityId,
                ParentMessageId = message.ParentMessageId,
                SenderName = GetUserName(message.SenderId),
                ReceiverName = GetUserName(message.ReceiverId)
            };

            return Ok(dto);
        }

        // GET: api/Messages/unread-count/{userId}
        [HttpGet("unread-count/{userId}")]
        public async Task<ActionResult<int>> GetUnreadCount(Guid userId)
        {
            var count = await _context.Messages
                .Where(m => m.ReceiverId == userId && !m.IsRead && !m.IsDeletedByReceiver)
                .CountAsync();

            return Ok(count);
        }

        // POST: api/Messages
        [HttpPost]
        public async Task<ActionResult<Message>> Create([FromBody] CreateMessageDto dto)
        {
            var message = new Message
            {
                Id = Guid.NewGuid(),
                SenderId = dto.SenderId,
                ReceiverId = dto.ReceiverId,
                Subject = dto.Subject,
                Content = dto.Content,
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
                RelatedEntityType = dto.RelatedEntityType,
                RelatedEntityId = dto.RelatedEntityId,
                ParentMessageId = dto.ParentMessageId,
                IsDeletedBySender = false,
                IsDeletedByReceiver = false
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = message.Id }, message);
        }

        // PUT: api/Messages/{id}/mark-as-read
        [HttpPut("{id}/mark-as-read")]
        public async Task<IActionResult> MarkAsRead(Guid id)
        {
            var message = await _context.Messages.FindAsync(id);
            
            if (message == null)
                return NotFound();

            message.IsRead = true;
            message.ReadAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/Messages/{id}/sender
        [HttpDelete("{id}/sender")]
        public async Task<IActionResult> DeleteBySender(Guid id)
        {
            var message = await _context.Messages.FindAsync(id);
            
            if (message == null)
                return NotFound();

            message.IsDeletedBySender = true;

            // If both parties deleted, remove from database
            if (message.IsDeletedByReceiver)
            {
                _context.Messages.Remove(message);
            }

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/Messages/{id}/receiver
        [HttpDelete("{id}/receiver")]
        public async Task<IActionResult> DeleteByReceiver(Guid id)
        {
            var message = await _context.Messages.FindAsync(id);
            
            if (message == null)
                return NotFound();

            message.IsDeletedByReceiver = true;

            // If both parties deleted, remove from database
            if (message.IsDeletedBySender)
            {
                _context.Messages.Remove(message);
            }

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/Messages/related/{entityType}/{entityId}
        [HttpGet("related/{entityType}/{entityId}")]
        public async Task<ActionResult<IEnumerable<MessageDto>>> GetRelatedMessages(string entityType, Guid entityId)
        {
            var messages = await _context.Messages
                .Where(m => m.RelatedEntityType == entityType && m.RelatedEntityId == entityId)
                .OrderBy(m => m.CreatedAt)
                .Select(m => new MessageDto
                {
                    Id = m.Id,
                    SenderId = m.SenderId,
                    ReceiverId = m.ReceiverId,
                    Subject = m.Subject,
                    Content = m.Content,
                    IsRead = m.IsRead,
                    CreatedAt = m.CreatedAt,
                    ReadAt = m.ReadAt,
                    RelatedEntityType = m.RelatedEntityType,
                    RelatedEntityId = m.RelatedEntityId,
                    ParentMessageId = m.ParentMessageId,
                    SenderName = GetUserName(m.SenderId),
                    ReceiverName = GetUserName(m.ReceiverId)
                })
                .ToListAsync();

            return Ok(messages);
        }

        private string GetUserName(Guid userId)
        {
            var user = _context.Users.Find(userId);
            if (user != null)
            {
                return user.Email; // Or fetch from profile tables
            }

            // Try to get name from profiles
            var driver = _context.DriverProfiles.FirstOrDefault(d => d.UserId == userId);
            if (driver != null) return driver.Name;

            var owner = _context.OwnerProfiles.FirstOrDefault(o => o.UserId == userId);
            if (owner != null) return owner.ContactName ?? user?.Email ?? "Unknown";

            var serviceProvider = _context.ServiceProviderProfiles.FirstOrDefault(sp => sp.UserId == userId);
            if (serviceProvider != null) return serviceProvider.BusinessName;

            var taxiAdmin = _context.TaxiRankAdmins.FirstOrDefault(ta => ta.UserId == userId);
            if (taxiAdmin != null) return taxiAdmin.FullName;

            var marshal = _context.TaxiMarshalProfiles.FirstOrDefault(m => m.UserId == userId);
            if (marshal != null) return marshal.FullName;

            return user?.Email ?? "Unknown User";
        }

        private string GetUserEmail(Guid userId)
        {
            var user = _context.Users.Find(userId);
            return user?.Email ?? "unknown@example.com";
        }
    }

    public class MessageDto
    {
        public Guid Id { get; set; }
        public Guid SenderId { get; set; }
        public Guid ReceiverId { get; set; }
        public string Subject { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ReadAt { get; set; }
        public string? RelatedEntityType { get; set; }
        public Guid? RelatedEntityId { get; set; }
        public Guid? ParentMessageId { get; set; }
        public string? SenderName { get; set; }
        public string? ReceiverName { get; set; }
        public string? SenderEmail { get; set; }
        public string? ReceiverEmail { get; set; }
    }

    public class CreateMessageDto
    {
        public Guid SenderId { get; set; }
        public Guid ReceiverId { get; set; }
        public string Subject { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? RelatedEntityType { get; set; }
        public Guid? RelatedEntityId { get; set; }
        public Guid? ParentMessageId { get; set; }
    }
}
