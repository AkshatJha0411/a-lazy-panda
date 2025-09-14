import express from 'express';
import { supabase } from './db.js';

const app = express();
const PORT = 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Simple request logger middleware to see every incoming request
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Received ${req.method} request for ${req.originalUrl}`);
    next();
});

// --- HELPER FUNCTIONS & MIDDLEWARE ---

/**
 * Retrieves a user's ID from their username.
 * If the user does not exist, it creates a new user record.
 * @param {string} username - The full name of the user (e.g., "user1").
 * @returns {Promise<string>} The UUID of the user.
 */
async function getUserId(username) {
  console.log(`Getting/creating user ID for: ${username}`);

  // 1. Check if user exists
  let { data: user, error: selectError } = await supabase
    .from('users')
    .select('id')
    .eq('full_name', username)
    .single();

  // `PGRST116` is the code for "No rows found", which is expected if the user is new.
  if (selectError && selectError.code !== 'PGRST116') {
    console.error('Error fetching user:', selectError);
    throw selectError;
  }

  // 2. If user exists, return their ID
  if (user) {
    console.log(`Found existing user with ID: ${user.id}`);
    return user.id;
  }

  // 3. If not, create a new user and return the new ID
  console.log('User not found, creating new user...');
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({ full_name: username })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error creating user:', insertError);
    throw insertError;
  }

  console.log(`Created new user with ID: ${newUser.id}`);
  return newUser.id;
}

/**
 * Middleware to protect admin-only routes.
 * It checks for a specific username in the request body.
 */
const adminAuth = (req, res, next) => {
  const { user } = req.body;
  if (user !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required.' });
  }
  next();
};

// --- PUBLIC API ENDPOINTS ---

/**
 * GET /api/events
 * Retrieves a list of all upcoming events.
 */
app.get('/api/events', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gt('start_time', new Date().toISOString()) // Filter for events that haven't started yet
      .order('start_time', { ascending: true });

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching events:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

/**
 * GET /api/events/:id
 * Retrieves details for a specific event.
 */
app.get('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // If no event is found, Supabase returns an error.
      return res.status(404).json({ message: 'Event not found.' });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error(`Error fetching event ${req.params.id}:`, error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// --- USER BOOKING ENDPOINTS ---

/**
 * POST /api/bookings
 * Creates a new booking for an event.
 */
app.post('/api/bookings', async (req, res) => {
  try {
    const { user, event_id, tickets_to_book } = req.body;

    if (!user || !event_id || !tickets_to_book) {
      return res.status(400).json({ message: 'Bad Request: Missing user, event_id, or tickets_to_book.' });
    }

    const userId = await getUserId(user);

    // Call the database function to handle the booking atomically.
    const { error } = await supabase.rpc('book_tickets_atomic', {
      p_user_id: userId,
      p_event_id: event_id,
      p_tickets_to_book: tickets_to_book
    });

    if (error) {
      // The trigger raises a custom exception with SQLSTATE 'P0001'.
      // We check for this to provide a specific "Conflict" error.
      if (error.code === 'P0001' && error.message.includes('Not enough tickets available')) {
        return res.status(409).json({ message: 'Conflict: Not enough tickets available or event is sold out.' });
      }
      // Handle other potential database errors (e.g., invalid event_id)
      return res.status(400).json({ message: 'Booking failed.', error: error.message });
    }

    res.status(201).json({ message: 'Booking created successfully.' });
  } catch (error) {
    console.error('Error creating booking:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

/**
 * GET /api/bookings/:user
 * Retrieves the booking history for a specific user.
 */
app.get('/api/bookings/:user', async (req, res) => {
  try {
    const { user } = req.params;
    const userId = await getUserId(user);

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        created_at,
        tickets_booked,
        event:events (
          id,
          name,
          venue,
          start_time
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error(`Error fetching bookings for user ${req.params.user}:`, error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

/**
 * POST /api/bookings/cancel
 * Cancels a specific booking by setting its tickets to 0.
 * The request body must contain the user and booking_id.
 */
app.post('/api/bookings/cancel', async (req, res) => {
  try {
    const { booking_id, user } = req.body;

    if (!booking_id || !user) {
      return res.status(400).json({ message: 'Bad Request: Missing booking_id or user in request body.' });
    }

    const userId = await getUserId(user);

    // Call the new atomic function to cancel the booking and update tickets to 0.
    const { data, error } = await supabase.rpc('cancel_booking_by_post', {
      p_booking_id: booking_id,
      p_user_id: userId
    });

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Booking not found or not owned by user.' });
      }
      return res.status(400).json({ message: 'Booking cancellation failed.', error: error.message });
    }

    res.status(200).json({ message: 'Booking cancelled successfully.' });
  } catch (error) {
    console.error(`Error cancelling booking:`, error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});


// --- ADMIN API ENDPOINTS ---

/**
 * POST /api/admin/events
 * Creates a new event (Admin only).
 */
app.post('/api/admin/events', adminAuth, async (req, res) => {
  try {
    const { name, venue, start_time, end_time, capacity } = req.body;

    if (!name || !venue || !start_time || !end_time || capacity === undefined) {
      return res.status(400).json({ message: 'Bad Request: Missing required event fields.' });
    }

    const { data, error } = await supabase
      .from('events')
      .insert({ name, venue, start_time, end_time, capacity })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating event:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

/**
 * PUT /api/admin/events/:id
 * Updates an existing event (Admin only).
 */
app.put('/api/admin/events/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, venue, start_time, end_time, capacity } = req.body;

    // Construct an update object with only the provided fields
    const updateFields = {};
    if (name) updateFields.name = name;
    if (venue) updateFields.venue = venue;
    if (start_time) updateFields.start_time = start_time;
    if (end_time) updateFields.end_time = end_time;
    if (capacity !== undefined) updateFields.capacity = capacity;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'Bad Request: No fields to update.' });
    }

    const { data, error } = await supabase
      .from('events')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // Handle case where the event to update doesn't exist
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Event not found.' });
      }
      throw error;
    }

    res.status(200).json(data);
  } catch (error) {
    console.error(`Error updating event ${req.params.id}:`, error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

/**
 * GET /api/admin/analytics
 * Gets booking analytics (Admin only).
 */
app.get('/api/admin/analytics', adminAuth, async (req, res) => {
  try {
    // For this simplified system, we assume the user in the body is 'admin'
    // In a real system, this would come from a secure session/token.
    const { data, error } = await supabase
      .from('events')
      .select('id, name, capacity, tickets_sold');

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching analytics:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// --- SERVER START ---

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
