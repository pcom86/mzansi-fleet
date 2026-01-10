using System;
using System.Collections.Generic;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Domain.Interfaces.IRepositories
{
    public interface ITenantRepository
    {
        IEnumerable<Tenant> GetAll();
        Tenant? GetById(Guid id);
        void Add(Tenant entity);
        void Update(Tenant entity);
        void Delete(Guid id);
    }
    public interface IUserRepository
    {
        IEnumerable<User> GetAll();
        User? GetById(Guid id);
        void Add(User entity);
        void Update(User entity);
        void Delete(Guid id);
    }
    public interface IOwnerProfileRepository
    {
        IEnumerable<OwnerProfile> GetAll();
        OwnerProfile? GetById(Guid id);
        void Add(OwnerProfile entity);
        void Update(OwnerProfile entity);
        void Delete(Guid id);
    }
}

