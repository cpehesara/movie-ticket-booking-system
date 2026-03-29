package com.cinema.seatmanagement.notification;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * TEMPLATE METHOD — Concrete subclass: Check-In Success Email.
 *
 * Triggered by: CheckinServiceImpl after QR scan → CHECKED_IN status.
 * Contains:     seat location ("B-5, B-6"), movie start time, LED direction note.
 * Runs @Async so the kiosk screen shows confirmation instantly.
 */
@Service
public class CheckinEmailService extends AbstractEmailNotificationService {

    public CheckinEmailService(JavaMailSender mailSender) {
        super(mailSender);
    }

    @Override
    protected String buildSubject(NotificationContext ctx) {
        return "🎬 You're checked in! Enjoy " + ctx.getMovieTitle();
    }

    @Override
    protected String buildHtmlBody(NotificationContext ctx) {
        String seats = String.join(", ", ctx.getSeatLabels());
        String checkedInAt = ctx.getCheckedInAt() != null
                ? ctx.getCheckedInAt().toString() : "Just now";

        String body = """
                <h2 style="color:#fff;font-size:22px;margin:0 0 8px;">You're checked in! 🍿</h2>
                <p style="color:#aaa;font-size:15px;margin:0 0 28px;">
                  Hi %s, your seats are ready.
                </p>
                <div style="background:linear-gradient(135deg,#1a472a,#2d8a4e);
                            border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
                  <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0 0 6px;
                            text-transform:uppercase;letter-spacing:2px;">Your Seats</p>
                  <p style="color:#fff;font-size:38px;font-weight:700;margin:0;letter-spacing:4px;">%s</p>
                  <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:8px 0 0;">
                    Look for the <strong style="color:#4ade80;">GREEN LEDs</strong> above your seats
                  </p>
                </div>
                <div style="background:#111;border-radius:8px;padding:24px;
                            border-left:4px solid #22c55e;margin-bottom:24px;">
                  <table width="100%%" cellpadding="0" cellspacing="0">
                    %s%s%s%s
                  </table>
                </div>
                """.formatted(
                ctx.getRecipientName(),
                seats,
                infoRow("🎬 Movie",     ctx.getMovieTitle()),
                infoRow("🏛️ Screen",   ctx.getScreenName()),
                infoRow("🕐 Starts",    ctx.getStartTime()),
                infoRow("✅ Checked In", checkedInAt)
        );

        return wrapInLayout("Checked In — CinePlex", body);
    }
}