import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api/client.js";

export default function MyBookings() {
  const location = useLocation();
  const justBooked = location.state?.justBooked;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    api
      .get("/bookings/me")
      .then((res) => setBookings(res.data.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function cancel(id) {
    if (!confirm("Cancel this booking?")) return;
    try {
      await api.delete(`/bookings/${id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="loader">Loading...</div>;

  return (
    <section>
      <h1>My Bookings</h1>
      {justBooked && <p className="success">Booking confirmed! Reference: {justBooked}</p>}
      {error && <p className="error">{error}</p>}

      {bookings.length === 0 ? (
        <p className="muted">You have no bookings yet.</p>
      ) : (
        <ul className="booking-list">
          {bookings.map((b) => (
            <li key={b._id} className={`booking-item ${b.status}`}>
              <div className="poster sm">
                {b.show?.movie?.posterUrl ? (
                  <img src={b.show.movie.posterUrl} alt={b.show.movie.title} />
                ) : (
                  <div className="poster-placeholder">{b.show?.movie?.title}</div>
                )}
              </div>
              <div className="booking-info">
                <h3>{b.show?.movie?.title}</h3>
                <p className="muted">
                  {b.show?.theatre?.name} ·{" "}
                  {b.show?.startTime && new Date(b.show.startTime).toLocaleString()}
                </p>
                <p>Seats: {b.seats.join(", ")}</p>
                <p>
                  Ref: {b.reference} · ₹{b.totalAmount} ·{" "}
                  <span className={`status-tag ${b.status}`}>{b.status}</span>
                </p>
              </div>
              {b.status === "confirmed" && (
                <button className="btn btn-ghost" onClick={() => cancel(b._id)}>
                  Cancel
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
