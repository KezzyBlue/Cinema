CREATE TABLE public.payments(
    paymentId BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bookingId BIGINT NOT NULL REFERENCES public.bookings(bookingId),
    method TEXT NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL
)