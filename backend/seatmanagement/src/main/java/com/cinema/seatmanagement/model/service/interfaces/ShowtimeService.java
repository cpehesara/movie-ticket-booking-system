package com.cinema.seatmanagement.model.service.interfaces;

import com.cinema.seatmanagement.model.entity.Showtime;
import com.cinema.seatmanagement.view.dto.response.ShowtimeResponse;

import java.util.List;

public interface ShowtimeService {

    List<ShowtimeResponse> getShowtimesByMovie(Long movieId);

    List<ShowtimeResponse> getUpcomingShowtimesByMovie(Long movieId);

    ShowtimeResponse getShowtimeById(Long id);

    List<ShowtimeResponse> getShowtimesByScreen(Long screenId);

    ShowtimeResponse createShowtime(Showtime showtime);

    ShowtimeResponse updateShowtime(Long id, Showtime showtime);

    void cancelShowtime(Long id);
}