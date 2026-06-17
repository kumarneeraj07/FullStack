import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import SeatMap from "../components/SeatMap.jsx";

/**
 * The end-to-end booking workflow:
 *   1. Load the show + live seat map.
 *   2. User selects available seats (UI state).
 *   3. "Hold seats" -> POST /bookings/lock (temporary hold + countdown).
 *   4. "Pay & Confirm" -> POST /bookings/confirm -> ticket.
 * Demonstrates seat selection, locking, and lifecycle handling on the UI.
 */
export default function Booking() {
  const { showId } = useParams();
  const navigate = useNavigate();

  const [show, setShow] = useState(null);
  const [selected, setSelected] = useState([]);
  const [held, setHeld] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function loadShow() {
    return api.get(`/shows/${showId}`).then((res) => setShow(res.data.data));
  }

  useEffect(() => {
    loadShow().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId]);

  // Countdown timer for the seat hold.
  useEffect(() => {
    if (!held || secondsLeft <= 0) return undefined;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [held, secondsLeft]);

  useEffect(() => {
    if (held && secondsLeft === 0) {
      setHeld(false);
      setError("Your seat hold expired. Please select again.");
      setSelected([]);
      loadShow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, held]);

  const flatSeats = useMemo(
    () => (show?.seatLayout || []).flatMap((r) => r.seats),
    [show]
  );

  const total = useMemo(
    () =>
      selected.reduce((sum, id) => {
        const seat = flatSeats.find((s) => s.id === id);
        return sum + (seat?.price || 0);
      }, 0),
    [selected, flatSeats]
  );

  function toggleSeat(seat) {
    if (held) return; // can't change selection while holding
    setSelected((prev) =>
      prev.includes(seat.id) ? prev.filter((s) => s !== seat.id) : [...prev, seat.id]
    );
  }

  async function holdSeats() {
    if (selected.length === 0) return;
    setError("");
    setBusy(true);
    try {
      const res = await api.post("/bookings/lock", { showId, seats: selected });
      const expiresAt = new Date(res.data.data.expiresAt).getTime();
      setSecondsLeft(Math.max(1, Math.round((expiresAt - Date.now()) / 1000)));
      setHeld(true);
    } catch (err) {
      setError(err.message);
      await loadShow(); // refresh in case seats were taken
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setError("");
    setBusy(true);
    try {
      const res = await api.post("/bookings/confirm", { showId, seats: selected });
      navigate("/my-bookings", { state: { justBooked: res.data.data.reference } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelHold() {
    try {
      await api.post("/bookings/release", { showId, seats: selected });
    } catch {
      /* ignore */
    }
    setHeld(false);
    setSelected([]);
    loadShow();
  }

  if (error && !show) return <p className="error">{error}</p>;
  if (!show) return <div className="loader">Loading seats...</div>;

  return (
    <div className="booking">
      <header className="booking-head">
        <h1>{show.movie?.title}</h1>
        <p className="muted">
          {show.theatre?.name} · {show.screenName} ·{" "}
          {new Date(show.startTime).toLocaleString()} · {show.format}
        </p>
      </header>

      {error && <p className="error">{error}</p>}

      <SeatMap layout={show.seatLayout} selected={selected} onToggle={toggleSeat} />

      <div className="checkout-bar">
        <div>
          <strong>{selected.length}</strong> seat(s) · ₹<strong>{total}</strong>
          {selected.length > 0 && <span className="muted"> ({selected.join(", ")})</span>}
        </div>

        {held ? (
          <div className="hold-actions">
            <span className="timer">Hold expires in {secondsLeft}s</span>
            <button className="btn btn-ghost" onClick={cancelHold} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={confirm} disabled={busy}>
              {busy ? "Processing..." : `Pay & Confirm ₹${total}`}
            </button>
          </div>
        ) : (
          <button
            className="btn btn-primary"
            onClick={holdSeats}
            disabled={busy || selected.length === 0}
          >
            {busy ? "Holding..." : "Hold seats"}
          </button>
        )}
      </div>
    </div>
  );
}
