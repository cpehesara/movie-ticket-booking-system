package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.model.entity.Showtime;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.enums.ShowtimeStatus;
import com.cinema.seatmanagement.model.repository.BookingSeatRepository;
import com.cinema.seatmanagement.model.repository.MovieRepository;
import com.cinema.seatmanagement.model.repository.ScreenRepository;
import com.cinema.seatmanagement.model.repository.ShowtimeRepository;
import com.cinema.seatmanagement.model.service.interfaces.ShowtimeService;
import com.cinema.seatmanagement.view.dto.response.ShowtimeResponse;
import com.cinema.seatmanagement.view.mapper.ShowtimeMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShowtimeServiceImpl implements ShowtimeService {

    private final ShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;
    private final ScreenRepository screenRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final ShowtimeMapper showtimeMapper;

    @Override
    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getShowtimesByMovie(Long movieId) {
        return showtimeRepository.findByMovieId(movieId).stream()
                .map(this::mapWithAvailability)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getUpcomingShowtimesByMovie(Long movieId) {
        return showtimeRepository.findUpcomingByMovieId(movieId, LocalDateTime.now()).stream()
                .map(this::mapWithAvailability)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ShowtimeResponse getShowtimeById(Long id) {
        Showtime showtime = findShowtimeOrThrow(id);
        return mapWithAvailability(showtime);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getShowtimesByScreen(Long screenId) {
        return showtimeRepository.findByScreenId(screenId).stream()
                .map(this::mapWithAvailability)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ShowtimeResponse createShowtime(Showtime showtime) {
        if (!movieRepository.existsById(showtime.getMovie().getId())) {
            throw new EntityNotFoundException("Movie not found with id: " + showtime.getMovie().getId());
        }
        if (!screenRepository.existsById(showtime.getScreen().getId())) {
            throw new EntityNotFoundException("Screen not found with id: " + showtime.getScreen().getId());
        }

        showtime.setStatus(ShowtimeStatus.SCHEDULED);
        Showtime saved = showtimeRepository.save(showtime);
        return showtimeMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public ShowtimeResponse updateShowtime(Long id, Showtime updated) {
        Showtime existing = findShowtimeOrThrow(id);

        existing.setStartTime(updated.getStartTime());
        existing.setEndTime(updated.getEndTime());
        existing.setBasePrice(updated.getBasePrice());
        existing.setStatus(updated.getStatus());

        Showtime saved = showtimeRepository.save(existing);
        return mapWithAvailability(saved);
    }

    @Override
    @Transactional
    public void cancelShowtime(Long id) {
        Showtime showtime = findShowtimeOrThrow(id);
        showtime.setStatus(ShowtimeStatus.CANCELLED);
        showtimeRepository.save(showtime);
    }

    private Showtime findShowtimeOrThrow(Long id) {
        return showtimeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Showtime not found with id: " + id));
    }

    private ShowtimeResponse mapWithAvailability(Showtime showtime) {
        long bookedCount = bookingSeatRepository.findByShowtimeId(showtime.getId()).stream()
                .filter(bs -> bs.getSeatState() != SeatState.CANCELLED)
                .count();
        int available = showtime.getScreen().getTotalSeats() - (int) bookedCount;
        return showtimeMapper.toResponseWithAvailability(showtime, Math.max(available, 0));
    }
}