package com.cinema.seatmanagement.model.entity;

import com.cinema.seatmanagement.model.enums.PaymentMethod;
import com.cinema.seatmanagement.model.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "payment",
        indexes = {
                @Index(name = "idx_payment_booking_id",       columnList = "booking_id"),
                @Index(name = "idx_payment_status",           columnList = "status"),
                @Index(name = "idx_payment_transaction_ref",  columnList = "transaction_ref")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    /**
     * Typed enum instead of raw String — prevents invalid values at the Java layer.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 30)
    private PaymentMethod paymentMethod;

    @Column(name = "transaction_ref", unique = true, length = 100)
    private String transactionRef;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "failure_reason", length = 255)
    private String failureReason;
}