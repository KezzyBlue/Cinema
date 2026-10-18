const supabase = require("../config/supabase");

async function getShowtimeById(showtimeId) {
  const { data, error } = await supabase
    .from("showtimes")
    .select("showtimeid, eventid, startat, endat, status")
    .eq("showtimeid", showtimeId)
    .maybeSingle();

  if (error) {
    console.error("Supabase query failed:", error);
    throw error;
  }

  return data;
}

async function getShowtimeSeats(showtimeId) {
  const { data: showtime, error: showtimeError } = await supabase
    .from("showtimes")
    .select("showtimeid, eventid")
    .eq("showtimeid", showtimeId)
    .maybeSingle();

  if (showtimeError) throw showtimeError;

  if (!showtime) return null;

  const { data: showtimeSeats, error: seatsError } = await supabase
    .from("showtime_seats")
    .select(`
      showtimeid,
      seatid,
      roomid,
      status,
      seats (
        rowlabel,
        seatnumber,
        seattype
      )
    `)
    .eq("showtimeid", showtimeId)
    .order("seatid", { ascending: true });

  if (seatsError) throw seatsError;

  return {
    eventId: showtime.eventid,
    showtimeId: showtime.showtimeid,
    roomId: showtimeSeats[0]?.roomid ?? null,
    seats: showtimeSeats.map((item) => ({
      seatId: item.seatid,
      rowLabel: item.seats?.rowlabel,
      seatNumber: item.seats?.seatnumber,
      seatType: item.seats?.seattype,
      status: item.status,
    })),
  };
}

module.exports = { 
    getShowtimeById,
    getShowtimeSeats
};