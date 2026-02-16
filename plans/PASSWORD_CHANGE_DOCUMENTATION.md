# Password Change Functionality Documentation

## Overview
This document describes the password change functionality that allows users to update their passwords through the Owner Profile detail page.

## Backend Implementation

### Files Created/Modified

1. **ChangePasswordCommand.cs** (`backend/MzansiFleet.Application/Commands/`)
   - Command class for password change requests
   - Properties: `UserId`, `CurrentPassword`, `NewPassword`

2. **ChangePasswordCommandHandler.cs** (`backend/MzansiFleet.Application/Handlers/`)
   - Handler that processes password change requests
   - Validates current password by comparing hashes
   - Hashes new password using SHA256
   - Updates user password in database
   - Returns `Task<bool>` indicating success/failure

3. **IdentityController.cs** (Modified)
   - Added `ChangePasswordCommandHandler` dependency injection
   - Added `POST /api/Identity/users/{id}/password` endpoint
   - Endpoint validates request and returns appropriate error messages

4. **Program.cs** (Modified)
   - Registered `ChangePasswordCommandHandler` as scoped service

### API Endpoint

**POST** `/api/Identity/users/{userId}/password`

**Request Body:**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Success Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Response (400):**
```json
{
  "message": "Current password is incorrect"
}
```

### Security Features
- Current password must be verified before allowing change
- Passwords are hashed using SHA256 algorithm
- Password hashes are never exposed in responses
- Validation ensures current password is correct before update

## Frontend Implementation

### Files Modified

1. **identity.service.ts** (Modified)
   - Added `changePassword(userId, currentPassword, newPassword)` method
   - Returns Observable with success message

2. **owner-profile-detail.component.ts** (Modified)
   - Added "Change Password" button in user information section
   - Added modal dialog for password change form
   - Form includes: Current Password, New Password, Confirm Password
   - Client-side validation:
     - Current password required
     - New password minimum 6 characters
     - New password must match confirmation
   - Success message displayed for 2 seconds before closing dialog
   - Error handling with appropriate user feedback

### User Interface

The password change dialog appears when clicking the "Change Password" button on the Owner Profile detail page. It includes:

- **Form Fields:**
  - Current Password (password input)
  - New Password (password input, min 6 characters)
  - Confirm New Password (password input)

- **Validation:**
  - All fields required
  - New password must be at least 6 characters
  - Confirmation must match new password
  - Submit button disabled until validation passes

- **User Feedback:**
  - Loading state during password change
  - Success message on successful change
  - Error message on failure (e.g., incorrect current password)
  - Dialog auto-closes after successful change

## Usage

1. Navigate to an Owner Profile detail page
2. Scroll to the "Associated User Information" section
3. Click the "Change Password" button
4. Enter current password
5. Enter new password (minimum 6 characters)
6. Confirm new password
7. Click "Change Password" to submit
8. Success message appears and dialog closes automatically
9. User can now log in with the new password

## Testing

To test the password change functionality:

1. **Valid Password Change:**
   - Enter correct current password
   - Enter new password (6+ characters)
   - Confirm matches new password
   - Expect: Success message and password updated

2. **Invalid Current Password:**
   - Enter incorrect current password
   - Enter new password
   - Expect: Error message "Current password is incorrect"

3. **Password Mismatch:**
   - Enter correct current password
   - Enter new password
   - Enter different confirmation password
   - Expect: Submit button disabled, validation message

4. **Short Password:**
   - Enter new password less than 6 characters
   - Expect: Submit button disabled

## Security Considerations

1. **Password Hashing:**
   - All passwords stored as SHA256 hashes
   - Original passwords never stored or logged

2. **Validation:**
   - Current password must be verified before change
   - Server-side validation prevents unauthorized changes

3. **HTTPS:**
   - Should be used in production to encrypt password transmission

4. **Error Messages:**
   - Generic error messages to prevent information disclosure
   - Specific validation only shown to authenticated users

## Future Enhancements

1. **Password Strength Requirements:**
   - Add complexity requirements (uppercase, lowercase, numbers, special characters)
   - Display password strength indicator

2. **Password History:**
   - Prevent reuse of recent passwords
   - Store password history with timestamps

3. **Password Reset:**
   - Add "Forgot Password" functionality
   - Email-based password reset flow

4. **Multi-Factor Authentication:**
   - Add 2FA requirement for password changes
   - SMS or authenticator app verification

5. **Audit Logging:**
   - Log all password change attempts
   - Track successful and failed attempts
   - Include IP address and timestamp

## Related Files

- Backend:
  - `/backend/MzansiFleet.Application/Commands/ChangePasswordCommand.cs`
  - `/backend/MzansiFleet.Application/Handlers/ChangePasswordCommandHandler.cs`
  - `/backend/MzansiFleet.Api/Controllers/IdentityController.cs`
  - `/backend/MzansiFleet.Api/Program.cs`
  - `/backend/PasswordHasher.cs`

- Frontend:
  - `/frontend/src/app/services/identity.service.ts`
  - `/frontend/src/app/components/owner-profiles/owner-profile-detail.component.ts`
