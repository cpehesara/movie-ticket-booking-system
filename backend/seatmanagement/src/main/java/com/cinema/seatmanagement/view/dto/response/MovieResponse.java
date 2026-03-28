package com.cinema.seatmanagement.view.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovieResponse {

    private Long id;
    private String title;
    private String description;
    private Integer durationMins;
    private String genre;
    private String language;
    private String rating;
    private String posterUrl;
    private String releaseDate;
    private Double averageRating;
    private Integer reviewCount;
}