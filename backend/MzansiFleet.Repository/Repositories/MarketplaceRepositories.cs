using System;
using System.Collections.Generic;
using System.Linq;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Repository.Repositories
{
    public class MechanicalRequestRepository : IMechanicalRequestRepository
    {
        private readonly MzansiFleetDbContext _context;
        public MechanicalRequestRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<MechanicalRequest> GetAll() => _context.MechanicalRequests.ToList();
        public MechanicalRequest GetById(Guid id) => _context.MechanicalRequests.Find(id);
        public void Add(MechanicalRequest entity) { _context.MechanicalRequests.Add(entity); _context.SaveChanges(); }
        public void Update(MechanicalRequest entity) { _context.MechanicalRequests.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.MechanicalRequests.Find(id); if (entity != null) { _context.MechanicalRequests.Remove(entity); _context.SaveChanges(); } }
    }
    public class QuoteRepository : IQuoteRepository
    {
        private readonly MzansiFleetDbContext _context;
        public QuoteRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<Quote> GetAll() => _context.Quotes.ToList();
        public Quote GetById(Guid id) => _context.Quotes.Find(id);
        public void Add(Quote entity) { _context.Quotes.Add(entity); _context.SaveChanges(); }
        public void Update(Quote entity) { _context.Quotes.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.Quotes.Find(id); if (entity != null) { _context.Quotes.Remove(entity); _context.SaveChanges(); } }
    }
    public class ServiceBookingRepository : IServiceBookingRepository
    {
        private readonly MzansiFleetDbContext _context;
        public ServiceBookingRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<ServiceBooking> GetAll() => _context.ServiceBookings.ToList();
        public ServiceBooking GetById(Guid id) => _context.ServiceBookings.Find(id);
        public void Add(ServiceBooking entity) { _context.ServiceBookings.Add(entity); _context.SaveChanges(); }
        public void Update(ServiceBooking entity) { _context.ServiceBookings.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.ServiceBookings.Find(id); if (entity != null) { _context.ServiceBookings.Remove(entity); _context.SaveChanges(); } }
    }
    public class ProductRepository : IProductRepository
    {
        private readonly MzansiFleetDbContext _context;
        public ProductRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<Product> GetAll() => _context.Products.ToList();
        public Product GetById(Guid id) => _context.Products.Find(id);
        public void Add(Product entity) { _context.Products.Add(entity); _context.SaveChanges(); }
        public void Update(Product entity) { _context.Products.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.Products.Find(id); if (entity != null) { _context.Products.Remove(entity); _context.SaveChanges(); } }
    }
    public class InventoryRepository : IInventoryRepository
    {
        private readonly MzansiFleetDbContext _context;
        public InventoryRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<Inventory> GetAll() => _context.Inventories.ToList();
        public Inventory GetById(Guid id) => _context.Inventories.Find(id);
        public void Add(Inventory entity) { _context.Inventories.Add(entity); _context.SaveChanges(); }
        public void Update(Inventory entity) { _context.Inventories.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.Inventories.Find(id); if (entity != null) { _context.Inventories.Remove(entity); _context.SaveChanges(); } }
    }
    public class OrderRepository : IOrderRepository
    {
        private readonly MzansiFleetDbContext _context;
        public OrderRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<Order> GetAll() => _context.Orders.ToList();
        public Order GetById(Guid id) => _context.Orders.Find(id);
        public void Add(Order entity) { _context.Orders.Add(entity); _context.SaveChanges(); }
        public void Update(Order entity) { _context.Orders.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.Orders.Find(id); if (entity != null) { _context.Orders.Remove(entity); _context.SaveChanges(); } }
    }
    public class OrderItemRepository : IOrderItemRepository
    {
        private readonly MzansiFleetDbContext _context;
        public OrderItemRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<OrderItem> GetAll() => _context.OrderItems.ToList();
        public OrderItem GetById(Guid id) => _context.OrderItems.Find(id);
        public void Add(OrderItem entity) { _context.OrderItems.Add(entity); _context.SaveChanges(); }
        public void Update(OrderItem entity) { _context.OrderItems.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.OrderItems.Find(id); if (entity != null) { _context.OrderItems.Remove(entity); _context.SaveChanges(); } }
    }
}

