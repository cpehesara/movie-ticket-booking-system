package com.cinema.seatmanagement.view.mapper;

import com.cinema.seatmanagement.model.entity.Movie;
import com.cinema.seatmanagement.view.dto.response.MovieResponse;
import org.springframework.stereotype.Component;

@Component
public class MovieMapper {

    public MovieResponse toResponse(Movie movie) {
        return MovieResponse.builder()
                .id(movie.getId())
                .title(movie.getTitle())
                .description(movie.getDescription())
                .durationMins(movie.getDurationMins())
                .genre(movie.getGenre())
                .language(movie.getLanguage())
                .rating(movie.getRating())
                .posterUrl(movie.getPosterUrl())
                .releaseDate(movie.getReleaseDate() != null ? movie.getReleaseDate().toString() : null)
                .reviewCount(movie.getReviews() != null ? movie.getReviews().size() : 0)
                .build();
    }

    public MovieResponse toResponseWithRating(Movie movie, Double averageRating) {
        MovieResponse response = toResponse(movie);
        response.setAverageRating(averageRating);
        return response;
    }
}