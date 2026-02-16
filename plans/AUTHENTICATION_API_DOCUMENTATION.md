# Authentication API Documentation

## Overview
The MzansiFleet API now includes authentication endpoints for user login and logout functionality using JWT (JSON Web Tokens).

## Base URL
```
http://localhost:5000/api/Identity
```

## Authentication Endpoints

### 1. Login
Authenticates a user and returns a JWT token.

**Endpoint:** `POST /api/Identity/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email": "user@example.com",
  "role": "Admin",
  "tenantId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "expiresAt": "2026-01-04T12:00:00Z"
}
```

**Error Responses:**

*401 Unauthorized - Invalid credentials:*
```json
{
  "message": "Invalid email or password"
}
```

*401 Unauthorized - Inactive user:*
```json
{
  "message": "User account is inactive"
}
```

*500 Internal Server Error:*
```json
{
  "message": "An error occurred during login",
  "detail": "Error details..."
}
```

### 2. Logout
Logs out the current user (invalidates the token).

**Endpoint:** `POST /api/Identity/logout`

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "message": "An error occurred during logout",
  "detail": "Error details..."
}
```

## JWT Token Details

### Token Expiration
- Default expiration: **1440 minutes (24 hours)**
- Configurable in `appsettings.json`

### Token Claims
The JWT token includes the following claims:
- `sub`: User ID (GUID)
- `email`: User's email address
- `role`: User's role (Admin, Driver, Owner, Passenger, Staff)
- `tenant_id`: Tenant ID the user belongs to
- `jti`: Unique token identifier

### Token Configuration
Located in `appsettings.json`:
```json
{
  "JwtSettings": {
    "SecretKey": "MzansiFleet-Super-Secret-Key-For-JWT-Token-Generation-2026",
    "Issuer": "MzansiFleet",
    "Audience": "MzansiFleetUsers",
    "ExpirationMinutes": 1440
  }
}
```

## Using the Token

### Authorization Header
Include the token in the Authorization header for protected endpoints:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Example Request (Using curl):
```bash
curl -X GET "http://localhost:5000/api/Identity/users" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Example Request (Using JavaScript):
```javascript
fetch('http://localhost:5000/api/Identity/users', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

## Password Hashing

**Current Implementation:**
- Uses SHA256 hashing for simplicity
- Password is hashed before comparison

**For Production:**
Consider using:
- BCrypt
- ASP.NET Core Identity
- Argon2

### Creating a User with Hashed Password

To create a user, you need to hash the password first. Here's a C# example:

```csharp
using System.Security.Cryptography;
using System.Text;

string HashPassword(string password)
{
    using (var sha256 = SHA256.Create())
    {
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }
}

// Usage:
string passwordHash = HashPassword("mypassword");
```

### Testing Login

1. **Create a test user** first:
```json
POST /api/Identity/users
{
  "tenantId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email": "test@mzansifleet.com",
  "phone": "+27821234567",
  "passwordHash": "XohImNooBHFR0OVvjcYpJ3NgPQ1qq73WKhHvch0VQtg=",
  "role": "Admin",
  "isActive": true
}
```
Note: The passwordHash above is SHA256 hash of "password123"

2. **Test the login**:
```json
POST /api/Identity/login
{
  "email": "test@mzansifleet.com",
  "password": "password123"
}
```

## Swagger UI

Access the interactive API documentation at:
```
http://localhost:5000/swagger
```

You can test the login and logout endpoints directly from Swagger.

## Security Considerations

### Production Recommendations:

1. **HTTPS Only**: Always use HTTPS in production
2. **Strong Secret Key**: Use a cryptographically secure random key (at least 256 bits)
3. **Password Hashing**: Implement BCrypt or Argon2
4. **Token Blacklist**: Implement token blacklisting for logout
5. **Refresh Tokens**: Add refresh token mechanism
6. **Rate Limiting**: Implement rate limiting on authentication endpoints
7. **Account Lockout**: Lock accounts after failed login attempts
8. **Two-Factor Authentication**: Consider adding 2FA
9. **Audit Logging**: Log all authentication attempts
10. **CORS**: Configure appropriate CORS policies

### Token Storage (Client-Side):

**Recommended:**
- HTTP-only cookies (most secure)
- SessionStorage for single-tab usage
- LocalStorage for persistent login (less secure)

**Not Recommended:**
- Plain cookies (vulnerable to XSS)
- URL parameters

## Error Handling

### Common Error Scenarios:

1. **Invalid Credentials**: User provides wrong email/password
2. **Inactive Account**: User account is disabled
3. **Missing User**: Email doesn't exist in database
4. **Expired Token**: Token has exceeded expiration time
5. **Invalid Token**: Token signature doesn't match

## Frontend Integration Example

### Login Flow:

```typescript
// Angular Service Example
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/api/Identity';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap((response: any) => {
          // Store token
          localStorage.setItem('token', response.token);
          localStorage.setItem('userId', response.userId);
          localStorage.setItem('role', response.role);
        })
      );
  }

  logout(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, { token })
      .pipe(
        tap(() => {
          // Remove token
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          localStorage.removeItem('role');
        })
      );
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
```

### HTTP Interceptor for Token:

```typescript
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = this.authService.getToken();
    
    if (token) {
      const cloned = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(cloned);
    }
    
    return next.handle(req);
  }
}
```

## Testing with Postman

1. **Login Request:**
   - Method: POST
   - URL: `http://localhost:5000/api/Identity/login`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):
     ```json
     {
       "email": "test@mzansifleet.com",
       "password": "password123"
     }
     ```

2. **Copy the token from response**

3. **Use token for authenticated requests:**
   - Method: GET
   - URL: `http://localhost:5000/api/Identity/users`
   - Headers: 
     - `Authorization: Bearer YOUR_TOKEN`
     - `Content-Type: application/json`

4. **Logout Request:**
   - Method: POST
   - URL: `http://localhost:5000/api/Identity/logout`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):
     ```json
     {
       "token": "YOUR_TOKEN"
     }
     ```

## Database Schema

No changes to database schema required. The authentication uses existing User table with:
- `Id` (Guid)
- `TenantId` (Guid)
- `Email` (string)
- `PasswordHash` (string)
- `Role` (string)
- `IsActive` (boolean)

## Files Modified/Created

### Created Files:
1. `MzansiFleet.Application/Commands/AuthenticationCommands.cs`
2. `MzansiFleet.Application/Handlers/AuthenticationHandlers.cs`

### Modified Files:
1. `MzansiFleet.Domain/DTOs/IdentityDtos.cs` - Added LoginRequestDto, LoginResponseDto, LogoutRequestDto
2. `MzansiFleet.Api/Controllers/IdentityController.cs` - Added Login and Logout endpoints
3. `MzansiFleet.Api/appsettings.json` - Added JwtSettings
4. `MzansiFleet.Api/MzansiFleet.Api.csproj` - Added JWT packages
5. `MzansiFleet.Application/MzansiFleet.Application.csproj` - Added JWT packages
6. `MzansiFleet.Api/Startup.cs` - Registered authentication handlers

## Next Steps

1. **Add JWT Authentication Middleware** to protect endpoints
2. **Implement Refresh Tokens** for better security
3. **Add Password Reset** functionality
4. **Implement Account Lockout** after failed attempts
5. **Add Email Verification** for new accounts
6. **Create Role-Based Authorization** policies
7. **Add Audit Logging** for security events
8. **Implement Token Blacklist** for revoked tokens
9. **Add Two-Factor Authentication**
10. **Create Password Strength Requirements**

## Support

For issues or questions, check:
- Swagger UI: http://localhost:5000/swagger
- Application logs
- Database user records
- JWT token validation at https://jwt.io

## Version
- API Version: 1.0
- JWT Implementation: System.IdentityModel.Tokens.Jwt 8.14.0
- .NET Version: 10.0
