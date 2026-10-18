CREATE TABLE public.bookings(
    bookingId BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bookingToken TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    price BIGINT NOT NULL,
    userName TEXT NOT NULL,
    userPhone TEXT NOT NULL,
    userEmail TEXT NOT NULL
)