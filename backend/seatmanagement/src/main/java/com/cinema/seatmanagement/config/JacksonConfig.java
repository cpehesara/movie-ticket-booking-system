package com.cinema.seatmanagement.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoField;

/**
 * JacksonConfig — fixes LocalDateTime deserialization.
 *
 * WHY THIS IS NEEDED:
 * The HTML datetime-local input sends "2026-04-03T11:54" (no seconds).
 * Java's default LocalDateTime parser requires "2026-04-03T11:54:00".
 * This config creates a flexible formatter that accepts BOTH formats,
 * preventing the 500 Internal Server Error on showtime creation.
 */
@Configuration
public class JacksonConfig {

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        //Build a formatter that accepts datetime WITH or WITHOUT seconds
        DateTimeFormatter flexibleFormatter = new DateTimeFormatterBuilder()
                .appendPattern("yyyy-MM-dd'T'HH:mm")
                // Seconds are OPTIONAL — defaults to 0 if missing
                .optionalStart()
                .appendPattern(":ss")
                .optionalEnd()
                .parseDefaulting(ChronoField.SECOND_OF_MINUTE, 0)
                .toFormatter();

        JavaTimeModule javaTimeModule = new JavaTimeModule();
        // Replace the default strict deserializer with our flexible one
        javaTimeModule.addDeserializer(
                LocalDateTime.class,
                new LocalDateTimeDeserializer(flexibleFormatter)
        );

        return new ObjectMapper()
                .registerModule(javaTimeModule)
                // Write dates as strings (not timestamps)
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }
}