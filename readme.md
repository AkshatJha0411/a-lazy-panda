## EVE-NT-LY: A Simple Event Booking Backend

This is the backend service for a simple event booking application, built with Express.js and Supabase. It provides API endpoints for managing events, user bookings, and administrative tasks.

#### Prerequisites

To run this project locally, you need the following installed on your machine:

  - **Node.js** (version 18 or higher recommended)
  - **npm**
  - A **Supabase** project with the necessary tables (`users`, `events`, `bookings`) and a `book_tickets_atomic` database function.
  - A **`.env`** file at the project root with your Supabase credentials:
    ```
    SUPABASE_URL=YOUR_SUPABASE_URL
    SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    ```

#### Local Setup & Running the Application

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd EVE-NT-LY
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Run the development server:**

    ```bash
    npm run dev
    ```

    The server will start and be accessible at `http://localhost:3000`.

#### API Endpoints

All endpoints are prefixed with `/api`. The base URL is `http://localhost:3000`.

-----

#### Public Endpoints

These endpoints are accessible by any user without specific authentication.

##### `GET /api/events`

  * **Description**: Retrieves a list of all upcoming events, ordered by start time.
  * **Response**: `200 OK` with an array of events.
    ```json
    [
      {
        "id": "e4d7a8c0-f3b1-4d9e-8c4d-9e3f1b0a7c6d",
        "created_at": "2025-09-13T10:00:00Z",
        "name": "Tech Conference 2025",
        "venue": "Convention Center",
        "start_time": "2025-10-20T09:00:00Z",
        "end_time": "2025-10-20T17:00:00Z",
        "capacity": 500,
        "tickets_sold": 150
      }
    ]
    ```

##### `GET /api/events/:id`

  * **Description**: Retrieves details for a specific event by its ID.
  * **Response**: `200 OK` with the event object or `404 Not Found` if the event does not exist.
    ```json
    {
      "id": "e4d7a8c0-f3b1-4d9e-8c4d-9e3f1b0a7c6d",
      "created_at": "2025-09-13T10:00:00Z",
      "name": "Tech Conference 2025",
      "venue": "Convention Center",
      "start_time": "2025-10-20T09:00:00Z",
      "end_time": "2025-10-20T17:00:00Z",
      "capacity": 500,
      "tickets_sold": 150
    }
    ```

-----

#### User Booking Endpoints

These endpoints require a `user` key in the request body to identify the user.

##### `POST /api/bookings`

  * **Description**: Creates a new booking for a user.
  * **Request Body**:
    ```json
    {
      "user": "Akshat Jha",
      "event_id": "e4d7a8c0-f3b1-4d9e-8c4d-9e3f1b0a7c6d",
      "tickets_to_book": 2
    }
    ```
  * **Response**: `201 Created` on success.
    ```json
    {
      "message": "Booking created successfully."
    }
    ```
  * **Error Responses**: `400 Bad Request` for missing fields, `409 Conflict` if not enough tickets are available.

##### `GET /api/bookings/:user`

  * **Description**: Retrieves a user's booking history, including event details. The `:user` parameter is the username (e.g., `Akshat%20Jha`).
  * **Response**: `200 OK` with an array of booking objects.
    ```json
    [
      {
        "id": "f5e8b4a9-2d1c-4f3e-8a9d-1c2f3e4b5a6c",
        "created_at": "2025-09-13T10:30:00Z",
        "tickets_booked": 2,
        "event": {
          "id": "e4d7a8c0-f3b1-4d9e-8c4d-9e3f1b0a7c6d",
          "name": "Tech Conference 2025",
          "venue": "Convention Center",
          "start_time": "2025-10-20T09:00:00Z"
        }
      }
    ]
    ```

##### `DELETE /api/bookings/:id`

  * **Description**: Cancels a specific booking by its ID. Requires the `user` to be included in the body for authorization.
  * **Request Body**:
    ```json
    {
      "user": "Akshat Jha"
    }
    ```
  * **Response**: `200 OK` on successful cancellation.
    ```json
    {
      "message": "Booking cancelled successfully."
    }
    ```
  * **Error Responses**: `403 Forbidden` if the user doesn't own the booking, `404 Not Found` if the booking ID is invalid.

-----

#### Admin Endpoints

These endpoints require the `user` key in the request body to be `admin`. In a production environment, this would be replaced with proper token-based authentication.

##### `POST /api/admin/events`

  * **Description**: Creates a new event. Admin access is required.
  * **Request Body**:
    ```json
    {
      "user": "admin",
      "name": "AI in Robotics Workshop",
      "venue": "IIT Mandi Auditorium",
      "start_time": "2025-11-01T14:00:00Z",
      "end_time": "2025-11-01T17:00:00Z",
      "capacity": 100
    }
    ```
  * **Response**: `201 Created` with the newly created event object.
    ```json
    {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "created_at": "2025-09-13T10:45:00Z",
      "name": "AI in Robotics Workshop",
      "venue": "IIT Mandi Auditorium",
      "start_time": "2025-11-01T14:00:00Z",
      "end_time": "2025-11-01T17:00:00Z",
      "capacity": 100,
      "tickets_sold": 0
    }
    ```

##### `PUT /api/admin/events/:id`

  * **Description**: Updates an existing event. Admin access is required.
  * **Request Body**:
    ```json
    {
      "user": "admin",
      "name": "Updated Conference Name",
      "venue": "New Venue Hall"
    }
    ```
    *Note: Only provide the fields you want to update.*
  * **Response**: `200 OK` with the updated event object.
    ```json
    {
      "id": "e4d7a8c0-f3b1-4d9e-8c4d-9e3f1b0a7c6d",
      "created_at": "2025-09-13T10:00:00Z",
      "name": "Updated Conference Name",
      "venue": "New Venue Hall",
      "start_time": "2025-10-20T09:00:00Z",
      "end_time": "2025-10-20T17:00:00Z",
      "capacity": 500,
      "tickets_sold": 150
    }
    ```

##### `GET /api/admin/analytics`

  * **Description**: Retrieves a list of all events with their capacity and current tickets sold. Admin access is required.
  * **Request Body**:
    ```json
    {
      "user": "admin"
    }
    ```
  * **Response**: `200 OK` with an array of event analytics.
    ```json
    [
      {
        "id": "e4d7a8c0-f3b1-4d9e-8c4d-9e3f1b0a7c6d",
        "name": "Tech Conference 2025",
        "capacity": 500,
        "tickets_sold": 150
      },
      {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "AI in Robotics Workshop",
        "capacity": 100,
        "tickets_sold": 0
      }
    ]
    ```

