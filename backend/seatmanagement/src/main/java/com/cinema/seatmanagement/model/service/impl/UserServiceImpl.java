package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.model.entity.CustomerProfile;
import com.cinema.seatmanagement.model.entity.User;
import com.cinema.seatmanagement.model.enums.UserRole;
import com.cinema.seatmanagement.model.repository.CustomerProfileRepository;
import com.cinema.seatmanagement.model.repository.StaffProfileRepository;
import com.cinema.seatmanagement.model.repository.UserRepository;
import com.cinema.seatmanagement.model.service.interfaces.UserService;
import com.cinema.seatmanagement.view.dto.request.UpdateProfileRequest;
import com.cinema.seatmanagement.view.dto.response.UserResponse;
import com.cinema.seatmanagement.view.mapper.UserMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository            userRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final StaffProfileRepository    staffProfileRepository;
    private final UserMapper                userMapper;

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(Long userId) {
        // Entity graph: loads profiles in one query — no lazy hits in UserMapper
        User user = userRepository.findWithProfilesById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + userId));
        return userMapper.toResponse(user);
    }

    @Override
    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + userId));

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName());
        }
        userRepository.save(user);

        if (user.getRole() == UserRole.CUSTOMER && request.getPhone() != null) {
            CustomerProfile profile = customerProfileRepository.findByUserId(userId)
                    .orElseGet(() -> CustomerProfile.builder()
                            .user(user)
                            .loyaltyPoints(0)
                            .build());
            profile.setPhone(request.getPhone());
            customerProfileRepository.save(profile);
        }

        return userMapper.toResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getAllStaff() {
        // Original bug: only returned ADMIN — MANAGER and OPERATOR were silently excluded.
        // Fixed: findByRoleIn covers all three staff roles.
        return userRepository.findByRoleIn(List.of(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR))
                .stream()
                .map(userMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getStaffByCinema(Long cinemaId) {
        return staffProfileRepository.findByCinemaId(cinemaId).stream()
                .map(sp -> userMapper.toResponse(sp.getUser()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deactivateUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new EntityNotFoundException("User not found with id: " + userId);
        }
        // Bulk UPDATE — no need to load the full User entity just to flip one boolean
        userRepository.deactivateById(userId);
    }
}