package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.service.interfaces.CheckinService;
import com.cinema.seatmanagement.view.dto.request.CheckinRequest;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/checkin")
@RequiredArgsConstructor
public class CheckinController {

    private final CheckinService checkinService;

    @PostMapping
    public ResponseEntity<BookingResponse> checkin(@Valid @RequestBody CheckinRequest request) {
        BookingResponse response = checkinService.checkin(request);
        return ResponseEntity.ok(response);
    }
}