package com.cinema.seatmanagement.notification;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * TEMPLATE METHOD — Concrete subclass: Reservation Expiry Email.
 *
 * Triggered by: the @Scheduled job in BookingServiceImpl when a PENDING
 * booking exceeds the 7-minute TTL and transitions to EXPIRED.
 *
 * Runs @Async — the scheduler thread is freed immediately; SMTP happens
 * in background on emailTaskExecutor.
 */
@Service
public class ReservationExpiryEmailService extends AbstractEmailNotificationService {

    public ReservationExpiryEmailService(JavaMailSender mailSender) {
        super(mailSender);
    }

    @Override
    protected String buildSubject(NotificationContext ctx) {
        return "⏰ Your reservation expired — " + ctx.getBookingCode();
    }

    @Override
    protected String buildHtmlBody(NotificationContext ctx) {
        String seats = String.join(", ", ctx.getSeatLabels());
        String bookAgainUrl = ctx.getBookingUrl() != null
                ? ctx.getBookingUrl() : "http://localhost:3000/movies";

        String body = """
                <h2 style="color:#fff;font-size:22px;margin:0 0 8px;">Your reservation has expired</h2>
                <p style="color:#aaa;font-size:15px;margin:0 0 28px;">
                  Hi %s, your 7-minute payment window passed and your seats
                  have been released back to the pool.
                </p>
                <div style="text-align:center;margin-bottom:28px;">
                  <div style="display:inline-block;width:72px;height:72px;border-radius:50%%;
                              background:#1a1a1a;border:3px solid #f59e0b;
                              line-height:72px;font-size:32px;">⏰</div>
                </div>
                <div style="background:#111;border-radius:8px;padding:24px;
                            border-left:4px solid #f59e0b;margin-bottom:24px;">
                  <table width="100%%" cellpadding="0" cellspacing="0">
                    %s%s%s%s
                  </table>
                </div>
                <div style="text-align:center;margin-top:24px;">
                  <p style="color:#888;font-size:14px;margin-bottom:16px;">
                    Seats may still be available:
                  </p>
                  <a href="%s"
                     style="display:inline-block;background:#e50914;color:#fff;
                            padding:14px 32px;border-radius:8px;font-size:15px;
                            font-weight:700;text-decoration:none;">
                    Book Again →
                  </a>
                </div>
                """.formatted(
                ctx.getRecipientName(),
                infoRow("📋 Expired Code", ctx.getBookingCode()),
                infoRow("🎬 Movie",        ctx.getMovieTitle()),
                infoRow("🕐 Showtime",     ctx.getStartTime()),
                infoRow("💺 Seats Were",   seats),
                bookAgainUrl
        );

        return wrapInLayout("Reservation Expired — CinePlex", body);
    }
}