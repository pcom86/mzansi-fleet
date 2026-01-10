using System;
using System.Collections.Generic;
using System.Linq;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Repository.Repositories
{
    public class ReviewRepository : IReviewRepository
    {
        private readonly MzansiFleetDbContext _context;
        public ReviewRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<Review> GetAll() => _context.Reviews.ToList();
        public Review GetById(Guid id) => _context.Reviews.Find(id);
        public void Add(Review entity) { _context.Reviews.Add(entity); _context.SaveChanges(); }
        public void Update(Review entity) { _context.Reviews.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.Reviews.Find(id); if (entity != null) { _context.Reviews.Remove(entity); _context.SaveChanges(); } }
    }
}

