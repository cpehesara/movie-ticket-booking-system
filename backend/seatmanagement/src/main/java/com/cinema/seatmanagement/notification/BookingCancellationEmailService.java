package com.cinema.seatmanagement.notification;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * TEMPLATE METHOD — Concrete subclass: Booking Cancellation Email.
 *
 * Triggered by: BookingServiceImpl.cancelBooking() after status → CANCELLED.
 */
@Service
public class BookingCancellationEmailService extends AbstractEmailNotificationService {

    public BookingCancellationEmailService(JavaMailSender mailSender) {
        super(mailSender);
    }

    @Override
    protected String buildSubject(NotificationContext ctx) {
        return "❌ Booking Cancelled — " + ctx.getBookingCode();
    }

    @Override
    protected String buildHtmlBody(NotificationContext ctx) {
        String seats  = String.join(", ", ctx.getSeatLabels());
        String reason = ctx.getCancellationReason() != null
                ? ctx.getCancellationReason() : "Customer request";

        String body = """
                <h2 style="color:#fff;font-size:22px;margin:0 0 8px;">Booking Cancelled</h2>
                <p style="color:#aaa;font-size:15px;margin:0 0 28px;">
                  Hi %s, your booking has been cancelled.
                </p>
                <div style="background:#111;border-radius:8px;padding:24px;
                            border-left:4px solid #ef4444;margin-bottom:24px;">
                  <table width="100%%" cellpadding="0" cellspacing="0">
                    %s%s%s%s%s
                  </table>
                </div>
                <div style="background:#1a1a1a;border-radius:8px;padding:20px;
                            text-align:center;border:1px dashed #ef4444;">
                  <p style="color:#ef4444;font-size:12px;margin:0 0 4px;font-weight:700;
                            text-transform:uppercase;letter-spacing:1px;">Reason</p>
                  <p style="color:#ccc;font-size:15px;margin:0;">%s</p>
                </div>
                <p style="color:#555;font-size:13px;margin-top:20px;text-align:center;">
                  Refunds (if applicable) are processed within 5–7 business days.
                </p>
                """.formatted(
                ctx.getRecipientName(),
                infoRow("📋 Booking Code", ctx.getBookingCode()),
                infoRow("🎬 Movie",        ctx.getMovieTitle()),
                infoRow("🕐 Was Scheduled",ctx.getStartTime()),
                infoRow("💺 Seats",        seats),
                infoRow("💰 Amount",       "LKR " + ctx.getTotalAmount()),
                reason
        );

        return wrapInLayout("Booking Cancelled — CinePlex", body);
    }
}