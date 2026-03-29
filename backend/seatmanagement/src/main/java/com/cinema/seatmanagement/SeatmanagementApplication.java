package com.cinema.seatmanagement;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Application entry point.
 *
 * @EnableScheduling — drives the RESERVED→EXPIRED timeout job in BookingServiceImpl
 *                     and the showtime status advancement in ShowtimeServiceImpl
 *                     (both run every 60 s via @Scheduled).
 *
 * @EnableAsync and @EnableCaching are intentionally NOT here.
 * They are declared on their respective config classes:
 *   AsyncConfig  → @EnableAsync
 *   CacheConfig  → @EnableCaching
 * Declaring them here as well would be harmless but redundant. Keeping the
 * annotations co-located with their configuration classes makes it clear
 * which @Bean definitions each annotation activates.
 */
@SpringBootApplication
@EnableScheduling
public class SeatmanagementApplication {

    public static void main(String[] args) {
        SpringApplication.run(SeatmanagementApplication.class, args);
    }
}