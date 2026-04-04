package com.cinema.seatmanagement.model.service.interfaces;

import com.cinema.seatmanagement.view.dto.request.UpdateProfileRequest;
import com.cinema.seatmanagement.view.dto.response.UserResponse;

import java.util.List;

public interface UserService {

    UserResponse getCurrentUser(Long userId);

    UserResponse updateProfile(Long userId, UpdateProfileRequest request);

    List<UserResponse> getAllStaff();

    List<UserResponse> getStaffByCinema(Long cinemaId);

    UserResponse updateRole(Long userId, String role);

    void deactivateUser(Long userId);
}