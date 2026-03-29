package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.User;
import com.cinema.seatmanagement.model.enums.UserRole;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByRole(UserRole role);

    List<User> findByRoleIn(List<UserRole> roles);

    List<User> findByIsActiveTrue();

    /**
     * Loads user with both profiles in a single query — used by UserMapper
     * to avoid lazy-load hits when building UserResponse for staff users.
     */
    @EntityGraph(value = "User.withProfiles")
    Optional<User> findWithProfilesById(Long id);

    @EntityGraph(value = "User.withProfiles")
    Optional<User> findWithProfilesByEmail(String email);

    /** Single-column deactivation — no need to load the full entity */
    @Modifying
    @Query("UPDATE User u SET u.isActive = false WHERE u.id = :id")
    void deactivateById(@Param("id") Long id);

    /** Used by admin dashboard: count of active customers */
    long countByRoleAndIsActiveTrue(UserRole role);
}