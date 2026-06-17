/**
 * Renders the seat layout grid. Each seat is a button whose appearance
 * depends on its status (available/booked/locked) and whether the current
 * user has selected it. Booked and locked seats are not clickable.
 */
export default function SeatMap({ layout, selected, onToggle }) {
  return (
    <div className="seatmap">
      <div className="screen-indicator">SCREEN THIS WAY</div>
      {layout.map((row) => (
        <div key={row.label} className="seat-row">
          <span className="row-label">{row.label}</span>
          <div className="seats">
            {row.seats.map((seat) => {
              const isSelected = selected.includes(seat.id);
              const unavailable = seat.status === "booked" || seat.status === "locked";
              const cls = [
                "seat",
                seat.status,
                isSelected ? "selected" : "",
                `type-${seat.seatType}`,
              ].join(" ");
              return (
                <button
                  key={seat.id}
                  className={cls}
                  disabled={unavailable}
                  title={`${seat.id} · ₹${seat.price} · ${seat.seatType}`}
                  onClick={() => onToggle(seat)}
                >
                  {seat.id.replace(row.label, "")}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="legend">
        <span><i className="box available" /> Available</span>
        <span><i className="box selected" /> Selected</span>
        <span><i className="box booked" /> Booked</span>
        <span><i className="box locked" /> Held</span>
      </div>
    </div>
  );
}
