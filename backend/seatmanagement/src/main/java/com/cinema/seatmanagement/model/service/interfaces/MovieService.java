package com.cinema.seatmanagement.model.service.interfaces;

import com.cinema.seatmanagement.model.entity.Movie;
import com.cinema.seatmanagement.view.dto.response.MovieResponse;

import java.util.List;

public interface MovieService {

    List<MovieResponse> getAllMovies();

    MovieResponse getMovieById(Long id);

    List<MovieResponse> getMoviesByGenre(String genre);

    List<MovieResponse> getMoviesByLanguage(String language);

    List<MovieResponse> searchMovies(String keyword);

    MovieResponse createMovie(Movie movie);

    MovieResponse updateMovie(Long id, Movie movie);

    void deleteMovie(Long id);
}