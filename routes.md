# Aura API Routes Documentation

## Base Information

**Base URL:** `http://localhost:3000`

**Content-Type:** `application/json`

**Authentication:** Most routes require JWT authentication via HttpOnly cookies. The authentication is handled automatically by the browser after login.

**CSRF Protection:** All state-changing requests (POST, PUT, PATCH, DELETE) require a CSRF token in the `x-csrf-token` header.

---

## Getting Started

### 1. Get CSRF Token (Required for state-changing operations)

```http
GET /api/csrf-token
```

**Response:**
```json
{
  "csrfToken": "token_value_here"
}
```

Include this token in the `x-csrf-token` header for all POST, PUT, PATCH, DELETE requests.

---

## Authentication Routes

Base path: `/api/auth`

### Register

Create a new user account.

```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"  // optional
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number
- At least one special character (!@#$%^&* etc.)

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "isEmailVerified": false
  },
  "message": "Registration successful. Please check your email to verify your account."
}
```

**Note:** Sets authentication cookies automatically.

---

### Login

Authenticate a user and receive auth cookies.

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "isEmailVerified": true
  }
}
```

**Note:** Sets authentication cookies automatically.

---

### Verify Email

Verify user's email address.

```http
GET /api/auth/verify-email?token=verification_token_here
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

### Refresh Token

Refresh the access token using the refresh token cookie.

```http
POST /api/auth/refresh
```

**Authentication:** Requires refresh token cookie.

**Response (Success):**
```json
{
  "success": true,
  "message": "Token refreshed"
}
```

**Note:** Updates authentication cookies automatically.

---

### Logout

Logout the current user.

```http
POST /api/auth/logout
```

**Authentication:** Required

**Response (Success):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Note:** Clears authentication cookies.

---

### Forgot Password

Request a password reset email.

```http
POST /api/auth/forgot-password
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

### Reset Password

Reset password using the token from email.

```http
POST /api/auth/reset-password
```

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePass123!"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

### Change Password

Change password for authenticated user.

```http
PATCH /api/auth/change-password
```

**Authentication:** Required

**Request Body:**
```json
{
  "oldPassword": "OldSecurePass123!",
  "newPassword": "NewSecurePass123!"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### Link Telegram Account

Link a Telegram account to the user.

```http
POST /api/auth/telegram/link
```

**Request Body:**
```json
{
  "code": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Telegram account linked"
}
```

---

### Unlink Telegram Account

Unlink Telegram account from the user.

```http
POST /api/auth/telegram/unlink
```

**Authentication:** Required

**Response (Success):**
```json
{
  "success": true,
  "message": "Telegram account unlinked"
}
```

---

## Task Routes

Base path: `/api/tasks`

**Authentication:** All task routes require authentication.

### Get Tasks

Retrieve tasks for the authenticated user.

```http
GET /api/tasks?from=2025-01-01&to=2025-01-31&page=1&limit=10
```

**Query Parameters:**
- `from` (optional): ISO date string (start date filter)
- `to` (optional): ISO date string (end date filter)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (Success):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Complete project documentation",
      "description": "Write comprehensive API documentation",
      "startTime": "2025-01-15T09:00:00.000Z",
      "endTime": "2025-01-15T11:00:00.000Z",
      "isAllDay": false,
      "category": "Work",
      "priority": "high",
      "status": "in_progress",
      "userId": 1,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-10T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

---

### Create Task

Create a new task.

```http
POST /api/tasks
```

**Request Body:**
```json
{
  "title": "Complete project documentation",
  "description": "Write comprehensive API documentation",
  "startTime": "2025-01-15T09:00:00.000Z",  // optional, ISO datetime
  "endTime": "2025-01-15T11:00:00.000Z",    // optional, ISO datetime
  "isAllDay": false,                         // optional, default: false
  "category": "Work",                        // optional
  "priority": "high",                        // optional: "low", "normal", "high" (default: "normal")
  "status": "pending"                        // optional: "pending", "in_progress", "completed" (default: "pending")
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Complete project documentation",
    "description": "Write comprehensive API documentation",
    "startTime": "2025-01-15T09:00:00.000Z",
    "endTime": "2025-01-15T11:00:00.000Z",
    "isAllDay": false,
    "category": "Work",
    "priority": "high",
    "status": "pending",
    "userId": 1,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### Update Task

Update an existing task.

```http
PATCH /api/tasks/:id
```

**URL Parameters:**
- `id`: Task ID (integer)

**Request Body:** (all fields optional)
```json
{
  "title": "Updated task title",
  "description": "Updated description",
  "startTime": "2025-01-15T10:00:00.000Z",
  "endTime": "2025-01-15T12:00:00.000Z",
  "isAllDay": false,
  "category": "Personal",
  "priority": "normal",
  "status": "in_progress"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Updated task title",
    // ... other fields
  }
}
```

---

### Move Task

Move a task to a different time slot.

```http
PATCH /api/tasks/:id/move
```

**URL Parameters:**
- `id`: Task ID (integer)

**Request Body:**
```json
{
  "startTime": "2025-01-16T09:00:00.000Z",
  "endTime": "2025-01-16T11:00:00.000Z"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "startTime": "2025-01-16T09:00:00.000Z",
    "endTime": "2025-01-16T11:00:00.000Z",
    // ... other fields
  }
}
```

---

### Complete Task

Mark a task as completed.

```http
POST /api/tasks/:id/complete
```

**URL Parameters:**
- `id`: Task ID (integer)

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "message": "Task completed"
  }
}
```

---

### Delete Task

Delete a task.

```http
DELETE /api/tasks/:id
```

**URL Parameters:**
- `id`: Task ID (integer)

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "message": "Task deleted"
  }
}
```

---

## Habit Routes

Base path: `/api/habits`

**Authentication:** All habit routes require authentication.

### Get Habits

Retrieve habits for the authenticated user.

```http
GET /api/habits
```

**Response (Success):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Morning Exercise",
      "frequency": "daily",
      "reminderTime": "07:00",
      "userId": 1,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z",
      "completions": [
        {
          "id": 1,
          "habitId": 1,
          "completedAt": "2025-01-15T07:30:00.000Z"
        }
      ]
    }
  ]
}
```

---

### Create Habit

Create a new habit.

```http
POST /api/habits
```

**Request Body:**
```json
{
  "title": "Morning Exercise",
  "frequency": "daily",        // optional: "daily", "weekly", "monthly" (default: "daily")
  "reminderTime": "07:00"      // optional, format: HH:MM (24-hour)
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Morning Exercise",
    "frequency": "daily",
    "reminderTime": "07:00",
    "userId": 1,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### Toggle Habit Completion

Toggle habit completion status for today.

```http
POST /api/habits/:id/toggle
```

**URL Parameters:**
- `id`: Habit ID (integer)

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "message": "Habit toggled",
    "completed": true
  }
}
```

---

### Update Habit

Update an existing habit.

```http
PATCH /api/habits/:id
```

**URL Parameters:**
- `id`: Habit ID (integer)

**Request Body:** (all fields optional)
```json
{
  "title": "Evening Exercise",
  "frequency": "weekly",
  "reminderTime": "18:00"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Evening Exercise",
    "frequency": "weekly",
    "reminderTime": "18:00",
    // ... other fields
  }
}
```

---

### Delete Habit

Delete a habit.

```http
DELETE /api/habits/:id
```

**URL Parameters:**
- `id`: Habit ID (integer)

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "message": "Habit deleted"
  }
}
```

---

## Pomodoro Routes

Base path: `/api/pomodoro`

**Authentication:** All pomodoro routes require authentication.

### Start Pomodoro Session

Start a new pomodoro timer session.

```http
POST /api/pomodoro/start
```

**Request Body:**
```json
{
  "duration": 25,              // duration in minutes
  "type": "work"               // "work", "short_break", or "long_break"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "startTime": "2025-01-15T10:00:00.000Z",
    "duration": 25,
    "type": "work",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### Finish Pomodoro Session

Mark the current pomodoro session as finished.

```http
POST /api/pomodoro/finish
```

**Request Body:**
```json
{
  "sessionId": 1
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "startTime": "2025-01-15T10:00:00.000Z",
    "endTime": "2025-01-15T10:25:00.000Z",
    "duration": 25,
    "type": "work",
    "completed": true
  }
}
```

---

### Get Pomodoro Statistics

Get pomodoro statistics for the user.

```http
GET /api/pomodoro/stats?from=2025-01-01&to=2025-01-31
```

**Query Parameters:**
- `from` (optional): ISO date string (start date)
- `to` (optional): ISO date string (end date)

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "totalSessions": 45,
    "completedSessions": 40,
    "totalMinutes": 1000,
    "workSessions": 30,
    "breakSessions": 10,
    "sessions": [
      {
        "id": 1,
        "startTime": "2025-01-15T10:00:00.000Z",
        "endTime": "2025-01-15T10:25:00.000Z",
        "duration": 25,
        "type": "work",
        "completed": true
      }
    ]
  }
}
```

---

### Delete Pomodoro Session

Delete a pomodoro session.

```http
DELETE /api/pomodoro/:id
```

**URL Parameters:**
- `id`: Session ID (integer)

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "message": "Session deleted"
  }
}
```

---

## Report Routes

Base path: `/api/reports`

**Authentication:** All report routes require authentication.

### Get Today's Report

Get the report for today.

```http
GET /api/reports/today
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "date": "2025-01-15",
    "tasks": {
      "total": 10,
      "completed": 7,
      "pending": 2,
      "in_progress": 1
    },
    "habits": {
      "total": 5,
      "completed": 3
    },
    "pomodoro": {
      "sessions": 8,
      "minutes": 200
    }
  }
}
```

---

### Save Daily Report

Save a daily report.

```http
POST /api/reports/daily
```

**Request Body:**
```json
{
  "date": "2025-01-15",
  "summary": "Productive day with 7 completed tasks"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "date": "2025-01-15",
    "summary": "Productive day with 7 completed tasks",
    "createdAt": "2025-01-15T23:00:00.000Z"
  }
}
```

---

### Run Daily Job (Admin/Testing)

Manually trigger the daily report job.

```http
POST /api/reports/daily/run
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "message": "Daily job executed"
  }
}
```

---

## Telegram Routes

Base path: `/api/telegram`

**Authentication:** All telegram routes require authentication.

### Send Telegram Notification

Send a custom notification to the user's Telegram.

```http
POST /api/telegram/notify
```

**Request Body:**
```json
{
  "message": "Custom notification message"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "message": "Notification sent"
  }
}
```

---

### Link Telegram Account

Link Telegram account (alternative endpoint).

```http
POST /api/telegram/link
```

**Request Body:**
```json
{
  "chatId": "123456789",
  "code": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "message": "Telegram linked successfully"
  }
}
```

---

### Send Daily Report to Telegram

Send today's report to Telegram.

```http
POST /api/telegram/report
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "message": "Report sent to Telegram"
  }
}
```

---

## User Routes

Base path: `/api/users`

**Authentication:** All user routes require authentication.

### Get Current User

Get the authenticated user's profile.

```http
GET /api/users/me
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "isEmailVerified": true,
    "telegramChatId": "123456789",
    "telegramCode": "123456",
    "preferences": {
      "theme": "dark",
      "pomodoro": {
        "work": 25,
        "shortBreak": 5,
        "longBreak": 15
      }
    },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-15T00:00:00.000Z"
  }
}
```

---

### Update Current User

Update the authenticated user's profile or preferences.

```http
PATCH /api/users/me
```

**Request Body:** (all fields optional)
```json
{
  "name": "John Smith",
  "preferences": {
    "theme": "light",
    "pomodoro": {
      "work": 30,
      "shortBreak": 5,
      "longBreak": 20
    }
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Smith",
    "preferences": {
      "theme": "light",
      "pomodoro": {
        "work": 30,
        "shortBreak": 5,
        "longBreak": 20
      }
    },
    // ... other fields
  }
}
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation errors, invalid data)
- `401` - Unauthorized (authentication required or invalid token)
- `403` - Forbidden (CSRF token invalid or missing)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

---

## Example Usage with Fetch API

### Login Example

```javascript
// Get CSRF token first
const csrfResponse = await fetch('http://localhost:3000/api/csrf-token', {
  credentials: 'include'
});
const { csrfToken } = await csrfResponse.json();

// Login
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken
  },
  credentials: 'include',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!'
  })
});

const data = await response.json();
console.log(data);
```

### Create Task Example

```javascript
// CSRF token is already fetched and stored
const response = await fetch('http://localhost:3000/api/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken
  },
  credentials: 'include',
  body: JSON.stringify({
    title: 'New Task',
    description: 'Task description',
    priority: 'high',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString()
  })
});

const data = await response.json();
console.log(data);
```

---

## Example Usage with Axios

The frontend is already configured with Axios in `/api/index.js`. It automatically:
- Handles CSRF tokens
- Includes credentials (cookies)
- Refreshes tokens when they expire

```javascript
import api from '@/api';

// Login
const response = await api.post('/api/auth/login', {
  email: 'user@example.com',
  password: 'SecurePass123!'
});

// Create task
const task = await api.post('/api/tasks', {
  title: 'New Task',
  priority: 'high'
});

// Get tasks
const tasks = await api.get('/api/tasks?from=2025-01-01&to=2025-01-31');
```

---

## Notes

1. **Authentication Cookies:** The API uses HttpOnly cookies for JWT tokens. These are set automatically on login and cleared on logout.

2. **CSRF Protection:** All state-changing requests require a CSRF token. The frontend automatically fetches and includes this token.

3. **Date Formats:** All dates should be in ISO 8601 format (e.g., `2025-01-15T10:00:00.000Z`).

4. **Pagination:** List endpoints support pagination via `page` and `limit` query parameters.

5. **CORS:** The API is configured to accept requests from `http://localhost:5173` (frontend).

6. **Rate Limiting:**
   - Authentication endpoints: 5 requests per 15 minutes
   - Password reset emails: 3 requests per hour
