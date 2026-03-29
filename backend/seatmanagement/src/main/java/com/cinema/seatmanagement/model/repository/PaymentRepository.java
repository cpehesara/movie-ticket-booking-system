package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.Payment;
import com.cinema.seatmanagement.model.enums.PaymentMethod;
import com.cinema.seatmanagement.model.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByBookingId(Long bookingId);

    List<Payment> findByStatus(PaymentStatus status);

    Optional<Payment> findByTransactionRef(String transactionRef);

    List<Payment> findByPaymentMethod(PaymentMethod method);

    /** Revenue reporting — total confirmed payments in a date range */
    @Query("""
        SELECT COALESCE(SUM(p.amount), 0) FROM Payment p
        WHERE p.status    = 'COMPLETED'
          AND p.paidAt BETWEEN :from AND :to
        """)
    BigDecimal sumCompletedPaymentsBetween(
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to
    );
}