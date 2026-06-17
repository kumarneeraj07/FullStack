import { User } from "./User.js";
import { Movie } from "./Movie.js";
import { Theatre } from "./Theatre.js";
import { Screen } from "./Screen.js";
import { Show } from "./Show.js";
import { Booking } from "./Booking.js";
import { Review } from "./Review.js";
import { SeatLock } from "./SeatLock.js";

// ---- Associations ----

// Theatre <-> Screen
Theatre.hasMany(Screen, { foreignKey: "theatreId" });
Screen.belongsTo(Theatre, { foreignKey: "theatreId" });

// Movie <-> Show
Movie.hasMany(Show, { foreignKey: "movieId" });
Show.belongsTo(Movie, { foreignKey: "movieId" });

// Theatre <-> Show
Theatre.hasMany(Show, { foreignKey: "theatreId" });
Show.belongsTo(Theatre, { foreignKey: "theatreId" });

// Screen <-> Show
Screen.hasMany(Show, { foreignKey: "screenId" });
Show.belongsTo(Screen, { foreignKey: "screenId" });

// User <-> Booking
User.hasMany(Booking, { foreignKey: "userId" });
Booking.belongsTo(User, { foreignKey: "userId" });

// Show <-> Booking
Show.hasMany(Booking, { foreignKey: "showId" });
Booking.belongsTo(Show, { foreignKey: "showId" });

// Movie <-> Review
Movie.hasMany(Review, { foreignKey: "movieId" });
Review.belongsTo(Movie, { foreignKey: "movieId" });

// User <-> Review
User.hasMany(Review, { foreignKey: "userId" });
Review.belongsTo(User, { foreignKey: "userId" });

// Show <-> SeatLock
Show.hasMany(SeatLock, { foreignKey: "showId" });
SeatLock.belongsTo(Show, { foreignKey: "showId" });

// User <-> SeatLock
User.hasMany(SeatLock, { foreignKey: "userId" });
SeatLock.belongsTo(User, { foreignKey: "userId" });

export { User, Movie, Theatre, Screen, Show, Booking, Review, SeatLock };
