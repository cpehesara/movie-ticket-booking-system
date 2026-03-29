package com.cinema.seatmanagement.notification;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * TEMPLATE METHOD — Concrete subclass: Booking Confirmation Email.
 *
 * Triggered by: PaymentServiceImpl after payment succeeds (CONFIRMED status).
 * Contains:     movie details, seat list, QR code image (Base64 inline), booking code.
 *
 * Only overrides buildSubject() and buildHtmlBody() — the send/dispatch/error
 * skeleton in AbstractEmailNotificationService stays unchanged.
 */
@Service
public class BookingConfirmationEmailService extends AbstractEmailNotificationService {

    public BookingConfirmationEmailService(JavaMailSender mailSender) {
        super(mailSender);
    }

    @Override
    protected String buildSubject(NotificationContext ctx) {
        return "✅ Booking Confirmed — " + ctx.getMovieTitle() + " [" + ctx.getBookingCode() + "]";
    }

    @Override
    protected String buildHtmlBody(NotificationContext ctx) {
        String seats = String.join(", ", ctx.getSeatLabels());

        String qrSection = "";
        if (ctx.getQrCodeBase64() != null && !ctx.getQrCodeBase64().isBlank()) {
            qrSection = """
                    <div style="text-align:center;margin:32px 0;">
                      <p style="color:#888;font-size:13px;margin-bottom:12px;">
                        Scan at the kiosk entrance
                      </p>
                      <img src="data:image/png;base64,%s"
                           alt="QR Code"
                           style="width:200px;height:200px;border:4px solid #e50914;
                                  border-radius:12px;background:#fff;padding:8px;" />
                    </div>
                    """.formatted(ctx.getQrCodeBase64());
        }

        String body = """
                <h2 style="color:#fff;font-size:22px;margin:0 0 8px;">Your booking is confirmed! 🎉</h2>
                <p style="color:#aaa;font-size:15px;margin:0 0 28px;">
                  Hi %s, enjoy the show.
                </p>
                <div style="background:#111;border-radius:8px;padding:24px;
                            border-left:4px solid #e50914;margin-bottom:24px;">
                  <table width="100%%" cellpadding="0" cellspacing="0">
                    %s%s%s%s%s%s
                  </table>
                </div>
                %s
                <div style="text-align:center;margin-top:16px;">
                  <div style="display:inline-block;background:#e50914;color:#fff;
                              padding:14px 32px;border-radius:8px;font-size:16px;font-weight:700;">
                    %s
                  </div>
                </div>
                <p style="color:#555;font-size:12px;margin-top:20px;text-align:center;">
                  ⚠ Reservation expires if payment is not completed within 7 minutes.
                </p>
                """.formatted(
                ctx.getRecipientName(),
                infoRow("🎬 Movie",     ctx.getMovieTitle()),
                infoRow("🏛️ Cinema",    ctx.getCinemaName()),
                infoRow("🎭 Screen",    ctx.getScreenName()),
                infoRow("🕐 Showtime",  ctx.getStartTime()),
                infoRow("💺 Seats",     seats),
                infoRow("💰 Total",     "LKR " + ctx.getTotalAmount()),
                qrSection,
                ctx.getBookingCode()
        );

        return wrapInLayout("Booking Confirmed — CinePlex", body);
    }
}