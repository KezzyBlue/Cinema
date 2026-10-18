CREATE TABLE public.showtime_seats(
    showtimeId BIGINT NOT NULL REFERENCES public.showtimes(showtimeId),
    seatId BIGINT NOT NULL REFERENCES public.seats(seatId),
    roomId BIGINT NOT NULL REFERENCES public.rooms(roomId),
    status TEXT NOT NULL,
    holdToken TEXT NOT NULL UNIQUE,
    holdExpiresAt TIMESTAMPTZ NOT NULL,
    bookingId BIGINT NOT NULL REFERENCES public.bookings(bookingId)
)