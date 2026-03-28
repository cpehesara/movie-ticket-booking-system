package com.cinema.seatmanagement.view.mapper;

import com.cinema.seatmanagement.model.entity.Showtime;
import com.cinema.seatmanagement.view.dto.response.ShowtimeResponse;
import org.springframework.stereotype.Component;

@Component
public class ShowtimeMapper {

    public ShowtimeResponse toResponse(Showtime showtime) {
        return ShowtimeResponse.builder()
                .id(showtime.getId())
                .movieId(showtime.getMovie().getId())
                .movieTitle(showtime.getMovie().getTitle())
                .screenId(showtime.getScreen().getId())
                .screenName(showtime.getScreen().getName())
                .cinemaName(showtime.getScreen().getCinema().getName())
                .startTime(showtime.getStartTime().toString())
                .endTime(showtime.getEndTime().toString())
                .basePrice(showtime.getBasePrice())
                .status(showtime.getStatus().name())
                .totalSeats(showtime.getScreen().getTotalSeats())
                .build();
    }

    public ShowtimeResponse toResponseWithAvailability(Showtime showtime, Integer availableSeats) {
        ShowtimeResponse response = toResponse(showtime);
        response.setAvailableSeats(availableSeats);
        return response;
    }
}