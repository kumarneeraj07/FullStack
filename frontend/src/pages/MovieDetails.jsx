import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Movie details: poster + info, list of upcoming shows (click to book),
 * and a reviews section where a logged-in user can rate the movie.
 */
export default function MovieDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  function loadReviews() {
    api.get(`/movies/${id}/reviews`).then((res) => setReviews(res.data.data));
  }

  useEffect(() => {
    api.get(`/movies/${id}`).then((res) => setMovie(res.data.data)).catch((e) => setError(e.message));
    api.get("/shows", { params: { movie: id } }).then((res) => setShows(res.data.data));
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submitReview(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/movies/${id}/reviews`, { rating: Number(rating), comment });
      setComment("");
      loadReviews();
      const res = await api.get(`/movies/${id}`);
      setMovie(res.data.data);
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!movie) return <div className="loader">Loading...</div>;

  return (
    <article className="movie-details">
      <div className="details-hero">
        <div className="poster lg">
          {movie.posterUrl ? (
            <img src={movie.posterUrl} alt={movie.title} />
          ) : (
            <div className="poster-placeholder">{movie.title}</div>
          )}
        </div>
        <div>
          <h1>{movie.title}</h1>
          <p className="muted">
            {movie.language} · {movie.durationMinutes} min · {movie.certification}
          </p>
          <p className="tags">{movie.genres?.join(" · ")}</p>
          {movie.ratingCount > 0 && (
            <p className="rating-line">★ {movie.ratingAverage} ({movie.ratingCount} reviews)</p>
          )}
          <p>{movie.description}</p>
        </div>
      </div>

      <section>
        <h2>Showtimes</h2>
        {shows.length === 0 ? (
          <p className="muted">No upcoming shows.</p>
        ) : (
          <div className="show-list">
            {shows.map((s) => (
              <button
                key={s._id}
                className="show-chip"
                onClick={() => navigate(`/shows/${s._id}/book`)}
              >
                <strong>
                  {new Date(s.startTime).toLocaleString([], {
                    weekday: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
                <span>{s.theatre?.name} · {s.format}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>Reviews</h2>
        {user ? (
          <form className="review-form" onSubmit={submitReview}>
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} ★
                </option>
              ))}
            </select>
            <input
              placeholder="Share your thoughts..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button className="btn btn-primary">Submit</button>
          </form>
        ) : (
          <p className="muted">
            <Link to="/login">Login</Link> to leave a review.
          </p>
        )}

        <ul className="review-list">
          {reviews.map((r) => (
            <li key={r._id}>
              <strong>{r.user?.name || "User"}</strong> · ★ {r.rating}
              {r.comment && <p>{r.comment}</p>}
            </li>
          ))}
          {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
        </ul>
      </section>
    </article>
  );
}
