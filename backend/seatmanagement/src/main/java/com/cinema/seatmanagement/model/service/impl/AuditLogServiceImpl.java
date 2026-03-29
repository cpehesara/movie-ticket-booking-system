package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.model.entity.AuditLog;
import com.cinema.seatmanagement.model.entity.Booking;
import com.cinema.seatmanagement.model.entity.Seat;
import com.cinema.seatmanagement.model.entity.Showtime;
import com.cinema.seatmanagement.model.enums.AuditAction;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.repository.AuditLogRepository;
import com.cinema.seatmanagement.model.repository.BookingRepository;
import com.cinema.seatmanagement.model.repository.SeatRepository;
import com.cinema.seatmanagement.model.repository.ShowtimeRepository;
import com.cinema.seatmanagement.model.service.interfaces.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final SeatRepository     seatRepository;
    private final ShowtimeRepository  showtimeRepository;
    private final BookingRepository   bookingRepository;

    /**
     * PROPAGATION_REQUIRES_NEW — audit writes always commit independently.
     *
     * Why: if the caller's transaction rolls back (e.g. payment fails), the
     * audit entry for the attempt still needs to land in the DB. Without this,
     * a failed booking would leave no trace at all — impossible to debug.
     *
     * @Async — fire-and-forget so the main booking/checkin transaction is not
     * held open waiting for the audit insert. The audit write is non-blocking
     * from the HTTP handler's perspective.
     */
    @Async
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(
            Long seatId,
            Long showtimeId,
            Long bookingId,
            Long actorId,
            String actorType,
            AuditAction action,
            SeatState fromState,
            SeatState toState,
            String notes
    ) {
        try {
            Seat seat           = seatId     != null ? seatRepository.getReferenceById(seatId)         : null;
            Showtime showtime   = showtimeId != null ? showtimeRepository.getReferenceById(showtimeId)  : null;
            Booking booking     = bookingId  != null ? bookingRepository.getReferenceById(bookingId)    : null;

            AuditLog entry = AuditLog.builder()
                    .seat(seat)
                    .showtime(showtime)
                    .booking(booking)
                    .actorId(actorId)
                    .actorType(actorType)
                    .action(action)
                    .fromState(fromState)
                    .toState(toState)
                    .notes(notes)
                    .build();

            auditLogRepository.save(entry);

        } catch (Exception e) {
            // Audit must never crash the main flow.
            log.error("Failed to write audit log: action={}, seatId={}, showtimeId={}, error={}",
                    action, seatId, showtimeId, e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLog> getHistoryForSeat(Long seatId) {
        return auditLogRepository.findBySeatIdOrderByCreatedAtDesc(seatId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLog> getHistoryForShowtime(Long showtimeId) {
        return auditLogRepository.findByShowtimeIdOrderByCreatedAtAsc(showtimeId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLog> getHistoryForBooking(Long bookingId) {
        return auditLogRepository.findByBookingIdOrderByCreatedAtAsc(bookingId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLog> getPagedHistoryForShowtime(Long showtimeId, Pageable pageable) {
        return auditLogRepository.findByShowtimeIdOrderByCreatedAtDesc(showtimeId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLog> getSeatStateEventsForShowtime(Long showtimeId) {
        return auditLogRepository.findSeatStateEventsForShowtime(showtimeId);
    }

    @Override
    @Transactional(readOnly = true)
    public long countAction(AuditAction action, LocalDateTime from, LocalDateTime to) {
        return auditLogRepository.countByActionAndCreatedAtBetween(action, from, to);
    }
}