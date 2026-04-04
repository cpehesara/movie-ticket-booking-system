package com.cinema.seatmanagement.model.service.interfaces;

import com.cinema.seatmanagement.model.entity.Showtime;
import com.cinema.seatmanagement.view.dto.response.ShowtimeResponse;
import com.cinema.seatmanagement.view.dto.request.ShowtimeRequest;

import java.util.List;

public interface ShowtimeService {

    List<ShowtimeResponse> getShowtimesByMovie(Long movieId);

    List<ShowtimeResponse> getUpcomingShowtimesByMovie(Long movieId);

    ShowtimeResponse getShowtimeById(Long id);

    List<ShowtimeResponse> getShowtimesByScreen(Long screenId);

    ShowtimeResponse createShowtime(ShowtimeRequest request);

    ShowtimeResponse updateShowtime(Long id, ShowtimeRequest request);

    void cancelShowtime(Long id);

    /**
     * Called by ShowtimeScheduler every minute.
     * Advances SCHEDULED → IN_PROGRESS and IN_PROGRESS → COMPLETED
     * based on start/end times. Triggers seat release on completion.
     */
    void advanceShowtimeStatuses();
}