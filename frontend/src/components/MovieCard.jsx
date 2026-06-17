import { Link } from "react-router-dom";

export default function MovieCard({ movie }) {
  return (
    <Link to={`/movies/${movie._id}`} className="movie-card">
      <div className="poster">
        {movie.posterUrl ? (
          <img src={movie.posterUrl} alt={movie.title} loading="lazy" />
        ) : (
          <div className="poster-placeholder">{movie.title}</div>
        )}
        {movie.ratingCount > 0 && (
          <span className="rating-badge">★ {movie.ratingAverage}</span>
        )}
      </div>
      <div className="movie-card-body">
        <h3>{movie.title}</h3>
        <p className="muted">
          {movie.language} · {movie.genres?.slice(0, 2).join(", ")}
        </p>
      </div>
    </Link>
  );
}
