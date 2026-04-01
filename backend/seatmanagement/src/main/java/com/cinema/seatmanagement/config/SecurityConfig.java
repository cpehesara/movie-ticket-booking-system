package com.cinema.seatmanagement.config;

import com.cinema.seatmanagement.security.JwtAuthenticationFilter;
import com.cinema.seatmanagement.security.KioskApiKeyFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final KioskApiKeyFilter kioskApiKeyFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(org.springframework.security.config.Customizer.withDefaults())
                .csrf(org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // ── Public auth ──────────────────────────────────
                        .requestMatchers("/api/auth/**").permitAll()

                        // ── Public read (movies, showtimes, seat maps) ───
                        .requestMatchers(HttpMethod.GET, "/api/movies/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/showtimes/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/seats/**").permitAll()

                        // ── WebSocket ────────────────────────────────────
                        .requestMatchers("/ws/**").permitAll()

                        // ── Swagger ──────────────────────────────────────
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()

                        // ── Kiosk endpoints (API Key auth, not JWT) ──────
                        //    KioskApiKeyFilter authenticates these via X-API-Key header
                        .requestMatchers("/api/checkin/**").permitAll()
                        .requestMatchers("/api/seat-arrival/**").permitAll()  // ← IoT Step 2

                        // ── Admin ────────────────────────────────────────
                        .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "MANAGER")

                        // ── Everything else requires auth ────────────────
                        .anyRequest().authenticated()
                )
                // Kiosk API Key filter runs before JWT filter so X-API-Key takes precedence
                .addFilterBefore(kioskApiKeyFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
