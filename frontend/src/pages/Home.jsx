import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import MovieCard from "../components/MovieCard.jsx";

/**
 * Landing page: lists movies with a debounced search box.
 * Demonstrates API integration + UI state management.
 */
export default function Home() {
  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      api
        .get("/movies", { params: { search: search || undefined, limit: 24 } })
        .then((res) => setMovies(res.data.data))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 300); // debounce
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <section>
      <div className="page-header">
        <h1>Now Showing</h1>
        <input
          className="search"
          placeholder="Search movies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <div className="loader">Loading movies...</div>
      ) : movies.length === 0 ? (
        <p className="muted">No movies found.</p>
      ) : (
        <div className="movie-grid">
          {movies.map((m) => (
            <MovieCard key={m._id} movie={m} />
          ))}
        </div>
      )}
    </section>
  );
}
