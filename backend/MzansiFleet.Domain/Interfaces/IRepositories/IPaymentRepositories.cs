using System;
using System.Collections.Generic;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Domain.Interfaces.IRepositories
{
    public interface IPaymentIntentRepository
    {
        IEnumerable<PaymentIntent> GetAll();
        PaymentIntent? GetById(Guid id);
        void Add(PaymentIntent entity);
        void Update(PaymentIntent entity);
        void Delete(Guid id);
    }
    public interface IPaymentTransactionRepository
    {
        IEnumerable<PaymentTransaction> GetAll();
        PaymentTransaction? GetById(Guid id);
        void Add(PaymentTransaction entity);
        void Update(PaymentTransaction entity);
        void Delete(Guid id);
    }
    public interface ILedgerEntryRepository
    {
        IEnumerable<LedgerEntry> GetAll();
        LedgerEntry? GetById(Guid id);
        void Add(LedgerEntry entity);
        void Update(LedgerEntry entity);
        void Delete(Guid id);
    }
    public interface IPayoutBatchRepository
    {
        IEnumerable<PayoutBatch> GetAll();
        PayoutBatch? GetById(Guid id);
        void Add(PayoutBatch entity);
        void Update(PayoutBatch entity);
        void Delete(Guid id);
    }
    public interface IPayoutItemRepository
    {
        IEnumerable<PayoutItem> GetAll();
        PayoutItem? GetById(Guid id);
        void Add(PayoutItem entity);
        void Update(PayoutItem entity);
        void Delete(Guid id);
    }
    public interface IDisputeCaseRepository
    {
        IEnumerable<DisputeCase> GetAll();
        DisputeCase? GetById(Guid id);
        void Add(DisputeCase entity);
        void Update(DisputeCase entity);
        void Delete(Guid id);
    }
}

