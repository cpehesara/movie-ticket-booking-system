package com.cinema.seatmanagement.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.cache.annotation.EnableCaching;

import java.util.concurrent.TimeUnit;

/**
 * Caffeine cache configuration — used by CachedMovieServiceImpl (Proxy pattern).
 *
 * ORIGINAL PROBLEM: One shared Caffeine spec for all caches meant movies and
 * showtimes expired at the same rate (10 min). This is wrong:
 *
 *   movies     → change at most a few times per day → 10-minute TTL is fine
 *   showtimes  → seat availability changes every few seconds → 2-minute TTL maximum
 *
 * FIX: CaffeineCacheManager supports per-cache specs via registerCustomCache().
 * Each cache gets its own Caffeine builder with an appropriate TTL and max size.
 *
 * Cache names must exactly match the value= attribute of @Cacheable / @CacheEvict
 * annotations in CachedMovieServiceImpl.
 *
 * recordStats() is kept on both — emits hit/miss metrics visible via
 * Spring Boot Actuator at /actuator/caches when Micrometer is on the classpath.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.setAllowNullValues(false);

        // movies — title, description, poster URL rarely change
        manager.registerCustomCache("movies",
                Caffeine.newBuilder()
                        .maximumSize(500)
                        .expireAfterWrite(10, TimeUnit.MINUTES)
                        .recordStats()
                        .build());

        // showtimes — seat availability changes constantly; short TTL
        manager.registerCustomCache("showtimes",
                Caffeine.newBuilder()
                        .maximumSize(200)
                        .expireAfterWrite(2, TimeUnit.MINUTES)
                        .recordStats()
                        .build());

        // seat-maps — live view; very short TTL (WebSocket pushes real-time updates,
        // but REST poll fallback should not be more than 30 seconds stale)
        manager.registerCustomCache("seat-maps",
                Caffeine.newBuilder()
                        .maximumSize(100)
                        .expireAfterWrite(30, TimeUnit.SECONDS)
                        .recordStats()
                        .build());

        return manager;
    }
}