package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.model.entity.Booking;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;

import jakarta.mail.internet.MimeMessage;

/**
 * AbstractEmailNotificationService — Template Method Pattern (GoF Behavioural #10).
 *
 * WHY THIS CLASS EXISTS:
 * Every email notification in CinePlex follows the same pipeline:
 *   1. Determine recipient address
 *   2. Build subject line
 *   3. Build HTML body
 *   4. Dispatch via JavaMailSender (SMTP)
 *
 * Steps 1-3 differ per notification type (booking confirmation, check-in reminder,
 * cancellation notice, etc.). Step 4 is always identical.
 *
 * The Template Method pattern freezes the algorithm skeleton in the base class
 * (send()) and lets concrete subclasses override only the parts that vary.
 * This satisfies OCP (Open/Closed Principle): adding a new notification type
 * means creating a new subclass, not modifying this class.
 *
 * SOLID MAPPING:
 *   S — This class is responsible ONLY for the email dispatch pipeline.
 *   O — New notification types are added via new subclasses, never here.
 *   L — Any subclass can substitute this class without breaking the caller.
 *   D — Callers depend on this abstraction, not JavaMailSender directly.
 *
 * @Async("emailTaskExecutor") — dispatch runs on the dedicated email thread pool
 * defined in AsyncConfig. Never blocks the booking transaction thread.
 */
@Slf4j
@RequiredArgsConstructor
public abstract class AbstractEmailNotificationService {

    protected final JavaMailSender mailSender;

    @Value("${notification.email.from-address:noreply@cinema.com}")
    protected String fromAddress;

    @Value("${notification.email.from-name:CinePlex Cinema}")
    protected String fromName;

    @Value("${notification.email.enabled:true}")
    private boolean emailEnabled;

    // ── Template Method (frozen algorithm) ──────────────────────────────────

    /**
     * The TEMPLATE METHOD. Callers invoke this; they never call the abstract
     * steps directly. The order of steps is locked in here.
     */
    @Async("emailTaskExecutor")
    public final void send(Booking booking, String qrCodeBase64) {
        if (!emailEnabled) {
            log.info("Email disabled. Skipping notification for booking: {}", booking.getBookingCode());
            return;
        }

        try {
            String to      = buildRecipient(booking);
            String subject = buildSubject(booking);
            String html    = buildHtmlBody(booking, qrCodeBase64);

            dispatch(to, subject, html);

            log.info("Email sent successfully to {} for booking {}", to, booking.getBookingCode());

        } catch (Exception e) {
            // Email failures MUST NOT roll back the booking transaction.
            // Log the error and continue — the customer already has the booking.
            log.error("Failed to send email for booking {}: {}",
                    booking.getBookingCode(), e.getMessage(), e);
        }
    }

    // ── Abstract Steps (variable parts — subclasses override) ───────────────

    /** Extract or derive the recipient email address from the booking. */
    protected abstract String buildRecipient(Booking booking);

    /** Build the email subject line. */
    protected abstract String buildSubject(Booking booking);

    /**
     * Build the full HTML body.
     * @param qrCodeBase64 base64-encoded PNG QR code image, or null if not applicable.
     */
    protected abstract String buildHtmlBody(Booking booking, String qrCodeBase64);

    // ── Concrete dispatch (frozen — subclasses cannot override) ─────────────

    private void dispatch(String to, String subject, String html) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromAddress, fromName);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(html, true); // true = isHtml

        mailSender.send(message);
    }
}