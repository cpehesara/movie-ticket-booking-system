package com.cinema.seatmanagement;

import com.cinema.seatmanagement.security.JwtTokenProvider;
import com.cinema.seatmanagement.model.repository.UserRepository;
import com.cinema.seatmanagement.model.entity.User;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

@Component
class TestTokenRunner {
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    public TestTokenRunner(JwtTokenProvider jwtTokenProvider, UserRepository userRepository) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
    }

    @PostConstruct
    public void run() {
        User user = userRepository.findById(1L).orElseThrow();
        String token = jwtTokenProvider.generateToken(user);
        System.out.println("--- START TOKEN ---");
        System.out.println(token);
        System.out.println("--- END TOKEN ---");
    }
}
