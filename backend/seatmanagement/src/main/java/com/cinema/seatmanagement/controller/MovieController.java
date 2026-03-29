package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.service.interfaces.MovieService;
import com.cinema.seatmanagement.view.dto.response.MovieResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/movies")
@RequiredArgsConstructor
public class MovieController {

    private final MovieService movieService;

    /**
     * Supports four filter combinations:
     *   ?search=inception              → title search
     *   ?genre=ACTION                  → by genre
     *   ?language=English              → by language
     *   ?genre=ACTION&language=English → both (most specific)
     *   (none)                         → all active movies
     *
     * Priority: search > genre+language > genre > language > all.
     * The original didn't support the genre+language combo — added here.
     */
    @GetMapping
    public ResponseEntity<List<MovieResponse>> getAllMovies(
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String search
    ) {
        boolean hasSearch   = search   != null && !search.isBlank();
        boolean hasGenre    = genre    != null && !genre.isBlank();
        boolean hasLanguage = language != null && !language.isBlank();

        List<MovieResponse> movies;

        if (hasSearch) {
            movies = movieService.searchMovies(search);
        } else if (hasGenre && hasLanguage) {
            movies = movieService.getMoviesByGenreAndLanguage(genre, language);
        } else if (hasGenre) {
            movies = movieService.getMoviesByGenre(genre);
        } else if (hasLanguage) {
            movies = movieService.getMoviesByLanguage(language);
        } else {
            movies = movieService.getAllMovies();
        }

        return ResponseEntity.ok(movies);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MovieResponse> getMovieById(@PathVariable Long id) {
        return ResponseEntity.ok(movieService.getMovieById(id));
    }
}