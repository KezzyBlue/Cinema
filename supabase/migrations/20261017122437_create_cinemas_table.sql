CREATE TABLE public.cinemas(
    cinemaId BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cinemaName TEXT NOT NULL,
    areaId BIGINT NOT NULL REFERENCEs public.areas(areaId),
    locate TEXT NOT NULL
)