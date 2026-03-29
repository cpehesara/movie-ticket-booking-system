package com.cinema.seatmanagement.view.mapper;

import com.cinema.seatmanagement.model.entity.Movie;
import com.cinema.seatmanagement.model.repository.ReviewRepository;
import com.cinema.seatmanagement.view.dto.response.MovieResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MovieMapper {

    private final ReviewRepository reviewRepository;

    /**
     * Original bug: movie.getReviews().size() — triggers a lazy load of ALL
     * Review entities (with comment TEXT columns) into memory just to count them.
     * On a popular movie with 10 000 reviews this is catastrophic.
     *
     * Fixed: reviewRepository.countByMovieId() issues a single COUNT(*) query.
     * The ReviewRepository index on movie_id covers this perfectly.
     *
     * Returns Long to match countByMovieId() return type — no lossy int cast.
     */
    public MovieResponse toResponse(Movie movie) {
        long reviewCount = reviewRepository.countByMovieId(movie.getId());

        return MovieResponse.builder()
                .id(movie.getId())
                .title(movie.getTitle())
                .description(movie.getDescription())
                .durationMins(movie.getDurationMins())
                .genre(movie.getGenre())
                .language(movie.getLanguage())
                .rating(movie.getRating())
                .posterUrl(movie.getPosterUrl())
                .trailerUrl(movie.getTrailerUrl())
                .releaseDate(movie.getReleaseDate() != null ? movie.getReleaseDate().toString() : null)
                .reviewCount(reviewCount)
                .isActive(movie.getIsActive())
                .build();
    }

    public MovieResponse toResponseWithRating(Movie movie, Double averageRating) {
        MovieResponse response = toResponse(movie);
        response.setAverageRating(averageRating);
        return response;
    }
}