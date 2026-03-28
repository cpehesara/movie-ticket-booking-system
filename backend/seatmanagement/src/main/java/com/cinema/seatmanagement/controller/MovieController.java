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

    @GetMapping
    public ResponseEntity<List<MovieResponse>> getAllMovies(
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String search
    ) {
        List<MovieResponse> movies;

        if (search != null && !search.isBlank()) {
            movies = movieService.searchMovies(search);
        } else if (genre != null && !genre.isBlank()) {
            movies = movieService.getMoviesByGenre(genre);
        } else if (language != null && !language.isBlank()) {
            movies = movieService.getMoviesByLanguage(language);
        } else {
            movies = movieService.getAllMovies();
        }

        return ResponseEntity.ok(movies);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MovieResponse> getMovieById(@PathVariable Long id) {
        MovieResponse movie = movieService.getMovieById(id);
        return ResponseEntity.ok(movie);
    }
}