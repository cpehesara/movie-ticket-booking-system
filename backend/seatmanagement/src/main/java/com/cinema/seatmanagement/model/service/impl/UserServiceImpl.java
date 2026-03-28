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

    private final UserRepository userRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final UserMapper userMapper;

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(Long userId) {
        User user = findUserOrThrow(userId);
        return userMapper.toResponse(user);
    }

    @Override
    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = findUserOrThrow(userId);

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName());
        }
        userRepository.save(user);

        if (user.getRole() == UserRole.CUSTOMER && request.getPhone() != null) {
            CustomerProfile profile = customerProfileRepository.findByUserId(userId)
                    .orElseGet(() -> CustomerProfile.builder().user(user).build());
            profile.setPhone(request.getPhone());
            customerProfileRepository.save(profile);
        }

        return userMapper.toResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getAllStaff() {
        return userRepository.findByRole(UserRole.ADMIN).stream()
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
        User user = findUserOrThrow(userId);
        user.setIsActive(false);
        userRepository.save(user);
    }

    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + userId));
    }
}