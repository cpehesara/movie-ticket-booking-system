package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.StaffProfile;
import com.cinema.seatmanagement.model.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StaffProfileRepository extends JpaRepository<StaffProfile, Long> {

    Optional<StaffProfile> findByUserId(Long userId);

    List<StaffProfile> findByCinemaId(Long cinemaId);

    boolean existsByUserId(Long userId);

    /**
     * Filters by cinema AND role — used by AdminController.getStaffByCinema()
     * to show only MANAGER/OPERATOR for a given hall (not all ADMIN users).
     */
    @Query("""
        SELECT sp FROM StaffProfile sp
        WHERE sp.cinema.id = :cinemaId
          AND sp.user.role = :role
          AND sp.user.isActive = true
        """)
    List<StaffProfile> findByCinemaIdAndRole(
            @Param("cinemaId") Long cinemaId,
            @Param("role")     UserRole role
    );

    /** All active staff across all cinemas — used by super-admin view */
    @Query("""
        SELECT sp FROM StaffProfile sp
        WHERE sp.user.isActive = true
        ORDER BY sp.cinema.name, sp.user.fullName
        """)
    List<StaffProfile> findAllActiveStaff();
}