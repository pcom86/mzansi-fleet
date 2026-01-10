using System;
using System.Collections.Generic;
using System.Linq;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Repository.Repositories
{
    public class PaymentIntentRepository : IPaymentIntentRepository
    {
        private readonly MzansiFleetDbContext _context;
        public PaymentIntentRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<PaymentIntent> GetAll() => _context.PaymentIntents.ToList();
        public PaymentIntent GetById(Guid id) => _context.PaymentIntents.Find(id);
        public void Add(PaymentIntent entity) { _context.PaymentIntents.Add(entity); _context.SaveChanges(); }
        public void Update(PaymentIntent entity) { _context.PaymentIntents.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.PaymentIntents.Find(id); if (entity != null) { _context.PaymentIntents.Remove(entity); _context.SaveChanges(); } }
    }
    public class PaymentTransactionRepository : IPaymentTransactionRepository
    {
        private readonly MzansiFleetDbContext _context;
        public PaymentTransactionRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<PaymentTransaction> GetAll() => _context.PaymentTransactions.ToList();
        public PaymentTransaction GetById(Guid id) => _context.PaymentTransactions.Find(id);
        public void Add(PaymentTransaction entity) { _context.PaymentTransactions.Add(entity); _context.SaveChanges(); }
        public void Update(PaymentTransaction entity) { _context.PaymentTransactions.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.PaymentTransactions.Find(id); if (entity != null) { _context.PaymentTransactions.Remove(entity); _context.SaveChanges(); } }
    }
    public class LedgerEntryRepository : ILedgerEntryRepository
    {
        private readonly MzansiFleetDbContext _context;
        public LedgerEntryRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<LedgerEntry> GetAll() => _context.LedgerEntries.ToList();
        public LedgerEntry GetById(Guid id) => _context.LedgerEntries.Find(id);
        public void Add(LedgerEntry entity) { _context.LedgerEntries.Add(entity); _context.SaveChanges(); }
        public void Update(LedgerEntry entity) { _context.LedgerEntries.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.LedgerEntries.Find(id); if (entity != null) { _context.LedgerEntries.Remove(entity); _context.SaveChanges(); } }
    }
    public class PayoutBatchRepository : IPayoutBatchRepository
    {
        private readonly MzansiFleetDbContext _context;
        public PayoutBatchRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<PayoutBatch> GetAll() => _context.PayoutBatches.ToList();
        public PayoutBatch GetById(Guid id) => _context.PayoutBatches.Find(id);
        public void Add(PayoutBatch entity) { _context.PayoutBatches.Add(entity); _context.SaveChanges(); }
        public void Update(PayoutBatch entity) { _context.PayoutBatches.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.PayoutBatches.Find(id); if (entity != null) { _context.PayoutBatches.Remove(entity); _context.SaveChanges(); } }
    }
    public class PayoutItemRepository : IPayoutItemRepository
    {
        private readonly MzansiFleetDbContext _context;
        public PayoutItemRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<PayoutItem> GetAll() => _context.PayoutItems.ToList();
        public PayoutItem GetById(Guid id) => _context.PayoutItems.Find(id);
        public void Add(PayoutItem entity) { _context.PayoutItems.Add(entity); _context.SaveChanges(); }
        public void Update(PayoutItem entity) { _context.PayoutItems.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.PayoutItems.Find(id); if (entity != null) { _context.PayoutItems.Remove(entity); _context.SaveChanges(); } }
    }
    public class DisputeCaseRepository : IDisputeCaseRepository
    {
        private readonly MzansiFleetDbContext _context;
        public DisputeCaseRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<DisputeCase> GetAll() => _context.DisputeCases.ToList();
        public DisputeCase GetById(Guid id) => _context.DisputeCases.Find(id);
        public void Add(DisputeCase entity) { _context.DisputeCases.Add(entity); _context.SaveChanges(); }
        public void Update(DisputeCase entity) { _context.DisputeCases.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.DisputeCases.Find(id); if (entity != null) { _context.DisputeCases.Remove(entity); _context.SaveChanges(); } }
    }
}

