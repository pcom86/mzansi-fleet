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
        public async Task<ActionResult<IEnumerable<MessageDto>>> GetInbox(string userId)
        {
            if (!Guid.TryParse(userId, out var userGuid))
            {
                return BadRequest(new { message = "Invalid userId format" });
            }

            try
            {
                var messages = await _context.Messages
                    .Where(m => (m.RecipientId == userGuid || m.RecipientDriverId == userGuid || m.RecipientMarshalId == userGuid) && !m.IsDeletedByReceiver)
                    .OrderByDescending(m => m.CreatedAt)
                    .ToListAsync();

                var messageDtos = messages.Select(m => new MessageDto
                {
                    Id = m.Id,
                    SenderId = m.SenderId ?? Guid.Empty,
                    ReceiverId = m.RecipientId,
                    SenderType = m.SenderType ?? string.Empty,
                    SenderName = m.SenderName ?? string.Empty,
                    RecipientType = m.RecipientType ?? string.Empty,
                    RecipientDriverId = m.RecipientDriverId,
                    RecipientMarshalId = m.RecipientMarshalId,
                    TaxiRankId = m.TaxiRankId,
                    Subject = m.Subject ?? string.Empty,
                    Content = m.Content ?? string.Empty,
                    MessageType = m.MessageType ?? string.Empty,
                    IsRead = m.IsRead,
                    CreatedAt = m.CreatedAt,
                    ReadAt = m.ReadAt,
                    ExpiresAt = m.ExpiresAt,
                    RelatedEntityType = m.RelatedEntityType,
                    RelatedEntityId = m.RelatedEntityId,
                    ParentMessageId = m.ParentMessageId,
                    SenderEmail = GetUserEmail(m.SenderId ?? Guid.Empty),
                    ReceiverName = GetUserName(m.RecipientId ?? m.RecipientDriverId ?? m.RecipientMarshalId ?? Guid.Empty),
                    ReceiverEmail = GetUserEmail(m.RecipientId ?? m.RecipientDriverId ?? m.RecipientMarshalId ?? Guid.Empty)
                }).ToList();

                return Ok(messageDtos);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetInbox] Error: {ex.Message}");
                Console.WriteLine($"[GetInbox] Inner: {ex.InnerException?.Message}");
                return StatusCode(500, new { error = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        // GET: api/Messages/sent/{userId}
        [HttpGet("sent/{userId}")]
        public async Task<ActionResult<IEnumerable<MessageDto>>> GetSent(string userId)
        {
            if (!Guid.TryParse(userId, out var userGuid))
            {
                return BadRequest(new { message = "Invalid userId format" });
            }

            var messages = await _context.Messages
                .Where(m => m.SenderId == userGuid && !m.IsDeletedBySender)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            var messageDtos = messages.Select(m => new MessageDto
            {
                Id = m.Id,
                SenderId = m.SenderId ?? Guid.Empty,
                ReceiverId = m.RecipientId,
                SenderType = m.SenderType,
                SenderName = m.SenderName,
                RecipientType = m.RecipientType,
                RecipientDriverId = m.RecipientDriverId,
                RecipientMarshalId = m.RecipientMarshalId,
                TaxiRankId = m.TaxiRankId,
                Subject = m.Subject,
                Content = m.Content,
                MessageType = m.MessageType,
                IsRead = m.IsRead,
                CreatedAt = m.CreatedAt,
                ReadAt = m.ReadAt,
                ExpiresAt = m.ExpiresAt,
                RelatedEntityType = m.RelatedEntityType,
                RelatedEntityId = m.RelatedEntityId,
                ParentMessageId = m.ParentMessageId,
                SenderEmail = GetUserEmail(m.SenderId ?? Guid.Empty),
                ReceiverName = GetUserName(m.RecipientId ?? m.RecipientDriverId ?? m.RecipientMarshalId ?? Guid.Empty),
                ReceiverEmail = GetUserEmail(m.RecipientId ?? m.RecipientDriverId ?? m.RecipientMarshalId ?? Guid.Empty)
            }).ToList();

            return Ok(messageDtos);
        }

        // GET: api/Messages/conversation/{userId}/{otherUserId}
        [HttpGet("conversation/{userId}/{otherUserId}")]
        public async Task<ActionResult<IEnumerable<MessageDto>>> GetConversation(Guid userId, Guid otherUserId)
        {
            var messages = await _context.Messages
                .Where(m => ((m.SenderId == userId && (m.RecipientId == otherUserId || m.RecipientDriverId == otherUserId || m.RecipientMarshalId == otherUserId)) ||
                             (m.SenderId == otherUserId && (m.RecipientId == userId || m.RecipientDriverId == userId || m.RecipientMarshalId == userId))) &&
                             !m.IsDeletedBySender && !m.IsDeletedByReceiver)
                .OrderBy(m => m.CreatedAt)
                .Select(m => new MessageDto
                {
                    Id = m.Id,
                    SenderId = m.SenderId ?? Guid.Empty,
                    ReceiverId = m.RecipientId,
                    SenderType = m.SenderType,
                    SenderName = m.SenderName,
                    RecipientType = m.RecipientType,
                    RecipientDriverId = m.RecipientDriverId,
                    RecipientMarshalId = m.RecipientMarshalId,
                    TaxiRankId = m.TaxiRankId,
                    Subject = m.Subject,
                    Content = m.Content,
                    MessageType = m.MessageType,
                    IsRead = m.IsRead,
                    CreatedAt = m.CreatedAt,
                    ReadAt = m.ReadAt,
                    ExpiresAt = m.ExpiresAt,
                    RelatedEntityType = m.RelatedEntityType,
                    RelatedEntityId = m.RelatedEntityId,
                    ParentMessageId = m.ParentMessageId,
                    SenderEmail = GetUserEmail(m.SenderId ?? Guid.Empty),
                    ReceiverName = GetUserName(m.RecipientId ?? m.RecipientDriverId ?? m.RecipientMarshalId ?? Guid.Empty),
                    ReceiverEmail = GetUserEmail(m.RecipientId ?? m.RecipientDriverId ?? m.RecipientMarshalId ?? Guid.Empty)
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
                SenderId = message.SenderId ?? Guid.Empty,
                ReceiverId = message.RecipientId,
                SenderType = message.SenderType,
                SenderName = message.SenderName,
                RecipientType = message.RecipientType,
                RecipientDriverId = message.RecipientDriverId,
                RecipientMarshalId = message.RecipientMarshalId,
                TaxiRankId = message.TaxiRankId,
                Subject = message.Subject,
                Content = message.Content,
                MessageType = message.MessageType,
                IsRead = message.IsRead,
                CreatedAt = message.CreatedAt,
                ReadAt = message.ReadAt,
                ExpiresAt = message.ExpiresAt,
                RelatedEntityType = message.RelatedEntityType,
                RelatedEntityId = message.RelatedEntityId,
                ParentMessageId = message.ParentMessageId,
                SenderEmail = GetUserEmail(message.SenderId ?? Guid.Empty),
                ReceiverName = GetUserName(message.RecipientId ?? message.RecipientDriverId ?? message.RecipientMarshalId ?? Guid.Empty),
                ReceiverEmail = GetUserEmail(message.RecipientId ?? message.RecipientDriverId ?? message.RecipientMarshalId ?? Guid.Empty)
            };

            return Ok(dto);
        }

        // GET: api/Messages/unread-count/{userId}
        [HttpGet("unread-count/{userId}")]
        public async Task<ActionResult<int>> GetUnreadCount(Guid userId)
        {
            var count = await _context.Messages
                .Where(m => (m.RecipientId == userId || m.RecipientDriverId == userId || m.RecipientMarshalId == userId) && !m.IsRead && !m.IsDeletedByReceiver)
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
                SenderType = dto.SenderType ?? "User",
                SenderId = dto.SenderId,
                SenderName = dto.SenderName,
                RecipientType = dto.RecipientType ?? "User",
                RecipientId = dto.ReceiverId,
                RecipientDriverId = dto.RecipientDriverId,
                RecipientMarshalId = dto.RecipientMarshalId,
                TaxiRankId = dto.TaxiRankId,
                Subject = dto.Subject,
                Content = dto.Content,
                MessageType = dto.MessageType ?? "Info",
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
                    SenderId = m.SenderId ?? Guid.Empty,
                    ReceiverId = m.RecipientId,
                    SenderType = m.SenderType,
                    SenderName = m.SenderName,
                    RecipientType = m.RecipientType,
                    RecipientDriverId = m.RecipientDriverId,
                    RecipientMarshalId = m.RecipientMarshalId,
                    TaxiRankId = m.TaxiRankId,
                    Subject = m.Subject,
                    Content = m.Content,
                    MessageType = m.MessageType,
                    IsRead = m.IsRead,
                    CreatedAt = m.CreatedAt,
                    ReadAt = m.ReadAt,
                    ExpiresAt = m.ExpiresAt,
                    RelatedEntityType = m.RelatedEntityType,
                    RelatedEntityId = m.RelatedEntityId,
                    ParentMessageId = m.ParentMessageId,
                    SenderEmail = GetUserEmail(m.SenderId ?? Guid.Empty),
                    ReceiverName = GetUserName(m.RecipientId ?? m.RecipientDriverId ?? m.RecipientMarshalId ?? Guid.Empty),
                    ReceiverEmail = GetUserEmail(m.RecipientId ?? m.RecipientDriverId ?? m.RecipientMarshalId ?? Guid.Empty)
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
        public Guid? ReceiverId { get; set; }
        public string SenderType { get; set; } = string.Empty;
        public string SenderName { get; set; } = string.Empty;
        public string RecipientType { get; set; } = string.Empty;
        public Guid? RecipientDriverId { get; set; }
        public Guid? RecipientMarshalId { get; set; }
        public Guid? TaxiRankId { get; set; }
        public string Subject { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string MessageType { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ReadAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public string? RelatedEntityType { get; set; }
        public Guid? RelatedEntityId { get; set; }
        public Guid? ParentMessageId { get; set; }
        public string? SenderEmail { get; set; }
        public string? ReceiverName { get; set; }
        public string? ReceiverEmail { get; set; }
    }

    public class CreateMessageDto
    {
        public Guid SenderId { get; set; }
        public string SenderType { get; set; } = "User";
        public string SenderName { get; set; } = string.Empty;
        public Guid? ReceiverId { get; set; }
        public string RecipientType { get; set; } = "User";
        public Guid? RecipientDriverId { get; set; }
        public Guid? RecipientMarshalId { get; set; }
        public Guid? TaxiRankId { get; set; }
        public string Subject { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string MessageType { get; set; } = "Info";
        public DateTime? ExpiresAt { get; set; }
        public string? RelatedEntityType { get; set; }
        public Guid? RelatedEntityId { get; set; }
        public Guid? ParentMessageId { get; set; }
    }
}

