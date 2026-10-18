
const supabase = require("../config/supabase");

async function getShowtimeById(showtimeId) {
  const { data, error } = await supabase
    .from("showtimes")
    .select("showtimeid, eventid, roomid, startat, endat, status")
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
    .select("showtimeid, eventid, roomid")
    .eq("showtimeid", showtimeId)
    .maybeSingle();

  if (showtimeError) {
    throw showtimeError;
  }

  if (!showtime) {
    return null;
  }

  const { data: seats, error: seatsError } = await supabase
    .from("seats")
    .select("seatid, rowlabel, seatnumber, seattype")
    .order("rowlabel")
    .order("seatnumber");

  if (seatsError) {
    throw seatsError;
  }

  const { data: states, error: statesError } = await supabase
    .from("showtime_seats")
    .select("seatid, status, holdexpiresat")
    .eq("showtimeid", showtimeId);

  if (statesError) {
    throw statesError;
  }

  const stateMap = new Map(
    states.map((item) => [item.seatid, item])
  );

  return {
    eventId: showtime.eventid,
    showtimeId: showtime.showtimeid,
    roomId: showtime.roomid,

    seats: seats.map((seat) => {
      const state = stateMap.get(seat.seatid);

      const isExpired =
        state?.status === "holding" &&
        state.holdexpiresat &&
        new Date(state.holdexpiresat) <= new Date();

      return {
        seatId: seat.seatid,
        rowLabel: seat.rowlabel,
        seatNumber: seat.seatnumber,
        seatType: seat.seattype,
        status: !state || isExpired
          ? "available"
          : state.status,
      };
    }),
  };
}

module.exports = {
  getShowtimeById,
  getShowtimeSeats,
};
