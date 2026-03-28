package com.cinema.seatmanagement.model.service.interfaces;

import com.cinema.seatmanagement.view.dto.request.CheckinRequest;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;

public interface CheckinService {

    BookingResponse checkin(CheckinRequest request);
}