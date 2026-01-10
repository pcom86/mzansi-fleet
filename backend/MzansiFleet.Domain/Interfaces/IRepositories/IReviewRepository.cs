using System;
using System.Collections.Generic;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Domain.Interfaces.IRepositories
{
    public interface IReviewRepository
    {
        IEnumerable<Review> GetAll();
        Review? GetById(Guid id);
        void Add(Review entity);
        void Update(Review entity);
        void Delete(Guid id);
    }
}

