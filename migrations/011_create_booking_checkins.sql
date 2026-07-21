CREATE TABLE booking_checkins (
    id SERIAL PRIMARY KEY,

    booking_id INTEGER NOT NULL REFERENCES bookings(id),

    checked_in_at TIMESTAMP NOT NULL,

    method VARCHAR(50) NOT NULL
);