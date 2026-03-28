package com.cinema.seatmanagement.model.service.interfaces;

import com.cinema.seatmanagement.view.dto.request.CreateBookingRequest;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;

import java.util.List;

public interface BookingService {

    BookingResponse createBooking(Long userId, CreateBookingRequest request);

    BookingResponse getBookingByCode(String bookingCode);

    BookingResponse getBookingById(Long id);

    List<BookingResponse> getBookingsByUser(Long userId);

    List<BookingResponse> getBookingsByShowtime(Long showtimeId);

    List<BookingResponse> getAllBookings();

    BookingResponse cancelBooking(Long bookingId, Long userId);

    void releaseExpiredReservations();
}