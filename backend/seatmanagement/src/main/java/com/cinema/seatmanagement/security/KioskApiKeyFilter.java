package com.cinema.seatmanagement.security;

import com.cinema.seatmanagement.model.entity.Kiosk;
import com.cinema.seatmanagement.model.repository.KioskRepository;
import com.cinema.seatmanagement.util.AppConstants;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class KioskApiKeyFilter extends OncePerRequestFilter {

    private final KioskRepository kioskRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String apiKey = request.getHeader(AppConstants.API_KEY_HEADER);

        if (apiKey == null || apiKey.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        Optional<Kiosk> kioskOpt = kioskRepository.findByApiKey(apiKey);

        if (kioskOpt.isEmpty() || !kioskOpt.get().getIsActive()) {
            writeUnauthorized(response, "INVALID_API_KEY", "Invalid or inactive kiosk API key");
            return;
        }

        Kiosk kiosk = kioskOpt.get();

        /**
         * Stamp lastSeenAt on every authenticated kiosk request — not just heartbeats.
         * Check-in calls are proof the kiosk is alive; the admin dashboard "offline" alert
         * should not fire if check-ins are flowing. Single-column UPDATE via the repository
         * — no entity load required.
         */
        kioskRepository.updateLastSeenAt(kiosk.getId(), LocalDateTime.now());

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        kiosk.getId(),
                        kiosk.getScreen().getId(),
                        Collections.singletonList(
                                new SimpleGrantedAuthority(AppConstants.ROLE_KIOSK))
                );
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Only intercept requests that carry the API key header — skip everything else
        return request.getHeader(AppConstants.API_KEY_HEADER) == null;
    }

    private void writeUnauthorized(HttpServletResponse response,
                                   String code, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
                "{\"code\":\"" + code + "\",\"message\":\"" + message + "\"}"
        );
    }
}