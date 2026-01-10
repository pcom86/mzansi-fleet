using System;
using System.Collections.Generic;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Domain.Interfaces.IRepositories
{
    public interface IMechanicalRequestRepository
    {
        IEnumerable<MechanicalRequest> GetAll();
        MechanicalRequest? GetById(Guid id);
        void Add(MechanicalRequest entity);
        void Update(MechanicalRequest entity);
        void Delete(Guid id);
    }
    public interface IQuoteRepository
    {
        IEnumerable<Quote> GetAll();
        Quote? GetById(Guid id);
        void Add(Quote entity);
        void Update(Quote entity);
        void Delete(Guid id);
    }
    public interface IServiceBookingRepository
    {
        IEnumerable<ServiceBooking> GetAll();
        ServiceBooking? GetById(Guid id);
        void Add(ServiceBooking entity);
        void Update(ServiceBooking entity);
        void Delete(Guid id);
    }
    public interface IProductRepository
    {
        IEnumerable<Product> GetAll();
        Product? GetById(Guid id);
        void Add(Product entity);
        void Update(Product entity);
        void Delete(Guid id);
    }
    public interface IInventoryRepository
    {
        IEnumerable<Inventory> GetAll();
        Inventory? GetById(Guid id);
        void Add(Inventory entity);
        void Update(Inventory entity);
        void Delete(Guid id);
    }
    public interface IOrderRepository
    {
        IEnumerable<Order> GetAll();
        Order? GetById(Guid id);
        void Add(Order entity);
        void Update(Order entity);
        void Delete(Guid id);
    }
    public interface IOrderItemRepository
    {
        IEnumerable<OrderItem> GetAll();
        OrderItem? GetById(Guid id);
        void Add(OrderItem entity);
        void Update(OrderItem entity);
        void Delete(Guid id);
    }
}

