CREATE TABLE reliability_reviews (
    id SERIAL PRIMARY KEY,

    booking_id INTEGER NOT NULL REFERENCES bookings(id),

    power_stable BOOLEAN NOT NULL,

    internet_as_described BOOLEAN NOT NULL
);
