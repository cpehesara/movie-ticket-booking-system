package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.model.entity.Movie;
import com.cinema.seatmanagement.model.repository.MovieRepository;
import com.cinema.seatmanagement.model.repository.ReviewRepository;
import com.cinema.seatmanagement.model.service.interfaces.MovieService;
import com.cinema.seatmanagement.view.dto.response.MovieResponse;
import com.cinema.seatmanagement.view.mapper.MovieMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MovieServiceImpl implements MovieService {

    private final MovieRepository  movieRepository;
    private final ReviewRepository reviewRepository;
    private final MovieMapper      movieMapper;

    @Override
    @Transactional(readOnly = true)
    public List<MovieResponse> getAllMovies() {
        return movieRepository.findByIsActiveTrueOrderByReleaseDateDesc().stream()
                .map(this::mapWithRating)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public MovieResponse getMovieById(Long id) {
        Movie movie = movieRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new EntityNotFoundException("Movie not found with id: " + id));
        return mapWithRating(movie);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MovieResponse> getMoviesByGenre(String genre) {
        return movieRepository.findByGenreAndIsActiveTrue(genre).stream()
                .map(this::mapWithRating)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MovieResponse> getMoviesByLanguage(String language) {
        return movieRepository.findByLanguageAndIsActiveTrue(language).stream()
                .map(this::mapWithRating)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MovieResponse> getMoviesByGenreAndLanguage(String genre, String language) {
        return movieRepository.findByGenreAndLanguageAndIsActiveTrue(genre, language).stream()
                .map(this::mapWithRating)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MovieResponse> searchMovies(String keyword) {
        return movieRepository.searchByTitleActive(keyword).stream()
                .map(this::mapWithRating)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public MovieResponse createMovie(Movie movie) {
        movie.setIsActive(true);
        return movieMapper.toResponse(movieRepository.save(movie));
    }

    @Override
    @Transactional
    public MovieResponse updateMovie(Long id, Movie updated) {
        Movie existing = findMovieOrThrow(id);

        existing.setTitle(updated.getTitle());
        existing.setDescription(updated.getDescription());
        existing.setDurationMins(updated.getDurationMins());
        existing.setGenre(updated.getGenre());
        existing.setLanguage(updated.getLanguage());
        existing.setRating(updated.getRating());
        existing.setPosterUrl(updated.getPosterUrl());
        existing.setTrailerUrl(updated.getTrailerUrl());
        existing.setReleaseDate(updated.getReleaseDate());

        return mapWithRating(movieRepository.save(existing));
    }

    @Override
    @Transactional
    public void deleteMovie(Long id) {
        Movie movie = findMovieOrThrow(id);
        movie.setIsActive(false);  // Soft delete — preserves booking history
        movieRepository.save(movie);
    }

    private Movie findMovieOrThrow(Long id) {
        return movieRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Movie not found with id: " + id));
    }

    private MovieResponse mapWithRating(Movie movie) {
        Double avgRating = reviewRepository.findAverageRatingByMovieId(movie.getId());
        return movieMapper.toResponseWithRating(movie, avgRating);
    }
}