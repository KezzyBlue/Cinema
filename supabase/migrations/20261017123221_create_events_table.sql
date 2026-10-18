CREATE TABLE public.events(
    eventId BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    eventName TEXT NOT NULL,
    directors TEXT[],
    types TEXT[],
    poster TEXT NOT NULL,
    duration INT,
    languages TEXT[],
    startAt DATE,
    endAt DATE
)