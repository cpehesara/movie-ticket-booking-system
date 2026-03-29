package com.cinema.seatmanagement.view.mapper;

import com.cinema.seatmanagement.model.entity.CustomerProfile;
import com.cinema.seatmanagement.model.entity.StaffProfile;
import com.cinema.seatmanagement.model.entity.User;
import com.cinema.seatmanagement.model.enums.UserRole;
import com.cinema.seatmanagement.view.dto.response.UserResponse;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    /**
     * Safe to call without triggering lazy loads ONLY when the caller used
     * userRepository.findWithProfilesById() / findWithProfilesByEmail()
     * (which load profiles via @EntityGraph in one JOIN).
     *
     * If called with a plain findById() result, the getCustomerProfile() /
     * getStaffProfile() calls below will trigger lazy loads — one extra query
     * each. The @EntityGraph methods in UserRepository exist precisely to
     * prevent this in the hot paths (login, getCurrentUser).
     */
    public UserResponse toResponse(User user) {
        UserResponse.UserResponseBuilder builder = UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .isActive(user.getIsActive())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);

        if (user.getRole() == UserRole.CUSTOMER && user.getCustomerProfile() != null) {
            CustomerProfile profile = user.getCustomerProfile();
            builder.phone(profile.getPhone());
            builder.loyaltyPoints(profile.getLoyaltyPoints());
        }

        if (user.getRole() != UserRole.CUSTOMER && user.getStaffProfile() != null) {
            StaffProfile profile = user.getStaffProfile();
            builder.cinemaId(profile.getCinema().getId());
            builder.cinemaName(profile.getCinema().getName());
        }

        return builder.build();
    }
}