package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.exception.AuthenticationFailedException;
import com.cinema.seatmanagement.exception.TokenRefreshException;
import com.cinema.seatmanagement.model.entity.CustomerProfile;
import com.cinema.seatmanagement.model.entity.RefreshToken;
import com.cinema.seatmanagement.model.entity.StaffProfile;
import com.cinema.seatmanagement.model.entity.User;
import com.cinema.seatmanagement.model.enums.UserRole;
import com.cinema.seatmanagement.model.repository.CinemaRepository;
import com.cinema.seatmanagement.model.repository.CustomerProfileRepository;
import com.cinema.seatmanagement.model.repository.RefreshTokenRepository;
import com.cinema.seatmanagement.model.repository.StaffProfileRepository;
import com.cinema.seatmanagement.model.repository.UserRepository;
import com.cinema.seatmanagement.model.service.interfaces.AuthService;
import com.cinema.seatmanagement.security.JwtTokenProvider;
import com.cinema.seatmanagement.view.dto.request.LoginRequest;
import com.cinema.seatmanagement.view.dto.request.RefreshTokenRequest;
import com.cinema.seatmanagement.view.dto.request.RegisterRequest;
import com.cinema.seatmanagement.view.dto.response.AuthResponse;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final CinemaRepository cinemaRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${jwt.refresh-expiration-days:7}")
    private int refreshExpirationDays;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalStateException("Email already registered");
        }
        
        boolean hasUsers = userRepository.count() > 0;

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(!hasUsers ? UserRole.ADMIN : UserRole.CUSTOMER)
                .isActive(true)
                .build();
        user = userRepository.save(user);

        CustomerProfile profile = CustomerProfile.builder()
                .user(user)
                .loyaltyPoints(0)
                .build();
        customerProfileRepository.save(profile);

        return buildAuthResponse(user);
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AuthenticationFailedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new AuthenticationFailedException("Invalid email or password");
        }

        if (!user.getIsActive()) {
            throw new AuthenticationFailedException("Account is deactivated");
        }

        return buildAuthResponse(user);
    }

    @Override
    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        RefreshToken storedToken = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(() -> new TokenRefreshException("Invalid refresh token"));

        if (storedToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(storedToken);
            throw new TokenRefreshException("Refresh token has expired");
        }

        User user = storedToken.getUser();
        refreshTokenRepository.delete(storedToken);

        return buildAuthResponse(user);
    }

    @Override
    @Transactional
    public void logout(String refreshToken) {
        refreshTokenRepository.findByToken(refreshToken)
                .ifPresent(refreshTokenRepository::delete);
    }

    @Override
    @Transactional
    public AuthResponse registerStaff(RegisterRequest request, UserRole role, Long cinemaId) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalStateException("Email already registered");
        }

        // Role is already the correct enum type — no valueOf conversion needed.
        // Validation that it is a staff role (not CUSTOMER) is enforced here.
        if (role == UserRole.CUSTOMER) {
            throw new IllegalArgumentException("Cannot register a staff member with CUSTOMER role");
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(role)
                .isActive(true)
                .build();
        user = userRepository.save(user);

        StaffProfile profile = StaffProfile.builder()
                .user(user)
                .cinema(cinemaRepository.findById(cinemaId)
                        .orElseThrow(() -> new EntityNotFoundException(
                                "Cinema not found with id: " + cinemaId)))
                .build();
        staffProfileRepository.save(profile);

        return buildAuthResponse(user);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private AuthResponse buildAuthResponse(User user) {
        String accessToken  = jwtTokenProvider.generateToken(user);
        String refreshToken = createRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .role(user.getRole().name())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .userId(user.getId())
                .build();
    }

    private String createRefreshToken(User user) {
        String token = UUID.randomUUID().toString();

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(token)
                .expiresAt(LocalDateTime.now().plusDays(refreshExpirationDays))
                .build();
        refreshTokenRepository.save(refreshToken);

        return token;
    }
}
