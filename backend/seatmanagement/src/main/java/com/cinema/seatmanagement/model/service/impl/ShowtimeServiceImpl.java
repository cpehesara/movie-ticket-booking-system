package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.model.entity.Showtime;
import com.cinema.seatmanagement.model.enums.AuditAction;
import com.cinema.seatmanagement.model.enums.ShowtimeStatus;
import com.cinema.seatmanagement.model.repository.BookingSeatRepository;
import com.cinema.seatmanagement.model.repository.MovieRepository;
import com.cinema.seatmanagement.model.repository.ScreenRepository;
import com.cinema.seatmanagement.model.repository.ShowtimeRepository;
import com.cinema.seatmanagement.model.service.interfaces.AuditLogService;
import com.cinema.seatmanagement.model.service.interfaces.ShowtimeService;
import com.cinema.seatmanagement.view.dto.response.ShowtimeResponse;
import com.cinema.seatmanagement.view.mapper.ShowtimeMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShowtimeServiceImpl implements ShowtimeService {

    private final ShowtimeRepository    showtimeRepository;
    private final MovieRepository       movieRepository;
    private final ScreenRepository      screenRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final ShowtimeMapper        showtimeMapper;
    private final AuditLogService       auditLogService;

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
        return mapWithAvailability(findShowtimeOrThrow(id));
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
            throw new EntityNotFoundException(
                    "Movie not found with id: " + showtime.getMovie().getId());
        }
        if (!screenRepository.existsById(showtime.getScreen().getId())) {
            throw new EntityNotFoundException(
                    "Screen not found with id: " + showtime.getScreen().getId());
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

        return mapWithAvailability(showtimeRepository.save(existing));
    }

    @Override
    @Transactional
    public void cancelShowtime(Long id) {
        Showtime showtime = findShowtimeOrThrow(id);
        showtime.setStatus(ShowtimeStatus.CANCELLED);
        showtimeRepository.save(showtime);

        auditLogService.record(
                null, id, null,
                null, "SYSTEM",
                AuditAction.SHOWTIME_CANCELLED, null, null,
                "Showtime cancelled by admin"
        );
    }

    /**
     * TEMPLATE METHOD applied at the scheduler level:
     * advanceShowtimeStatuses() defines the invariant algorithm:
     *   1. Find showtimes whose startTime has passed  → advance to IN_PROGRESS
     *   2. Find showtimes whose endTime has passed    → advance to COMPLETED + release seats
     *
     * The two helpers (advanceToInProgress, completeAndReleaseSeats) are the
     * "template steps" — they can be overridden in a subclass or replaced with
     * alternative implementations without changing the outer algorithm.
     *
     * Runs every 60 seconds via @Scheduled — keeps showtime status current
     * without any admin intervention.
     */
    @Override
    @Transactional
    @Scheduled(fixedRateString = "${showtime.status-check-interval-ms:60000}")
    public void advanceShowtimeStatuses() {
        LocalDateTime now = LocalDateTime.now();

        // Step 1 — SCHEDULED → IN_PROGRESS
        List<Showtime> started = showtimeRepository.findScheduledShowtimesThatHaveStarted(now);
        for (Showtime st : started) {
            advanceToInProgress(st);
        }

        // Step 2 — IN_PROGRESS → COMPLETED + release all OCCUPIED seats
        List<Showtime> ended = showtimeRepository.findInProgressShowtimesThatHaveEnded(now);
        for (Showtime st : ended) {
            completeAndReleaseSeats(st);
        }

        if (!started.isEmpty() || !ended.isEmpty()) {
            log.info("Showtime scheduler: {} started, {} completed", started.size(), ended.size());
        }
    }

    // ── Private template steps ────────────────────────────────────────────

    private void advanceToInProgress(Showtime showtime) {
        showtimeRepository.updateStatus(showtime.getId(), ShowtimeStatus.IN_PROGRESS);

        auditLogService.record(
                null, showtime.getId(), null,
                null, "SYSTEM",
                AuditAction.SHOWTIME_STARTED, null, null,
                "Showtime auto-advanced to IN_PROGRESS at " + LocalDateTime.now()
        );
    }

    private void completeAndReleaseSeats(Showtime showtime) {
        showtimeRepository.updateStatus(showtime.getId(), ShowtimeStatus.COMPLETED);

        // Bulk UPDATE — one SQL statement for all OCCUPIED seats in this showtime
        int released = bookingSeatRepository.releaseOccupiedSeatsForShowtime(
                showtime.getId(), LocalDateTime.now());

        auditLogService.record(
                null, showtime.getId(), null,
                null, "SYSTEM",
                AuditAction.SHOWTIME_COMPLETED, null, null,
                released + " occupied seats released post-show"
        );

        log.info("Showtime {} completed: {} seats released", showtime.getId(), released);
    }

    // ── Private helper ────────────────────────────────────────────────────

    private Showtime findShowtimeOrThrow(Long id) {
        return showtimeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Showtime not found with id: " + id));
    }

    private ShowtimeResponse mapWithAvailability(Showtime showtime) {
        // Uses findActiveByShowtimeId() — covered by composite index (showtime_id, seat_state)
        // Replaces the old stream().filter() which loaded ALL BookingSeat rows into memory
        long bookedCount = bookingSeatRepository.findActiveByShowtimeId(showtime.getId()).size();
        int  available   = Math.max(showtime.getScreen().getTotalSeats() - (int) bookedCount, 0);
        return showtimeMapper.toResponseWithAvailability(showtime, available);
    }
}