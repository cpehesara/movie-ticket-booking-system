package com.cinema.seatmanagement.notification;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;

/**
 * TEMPLATE METHOD PATTERN (GoF — Behavioural)
 *
 * Intent: Define the skeleton of an algorithm in a base class, deferring
 * specific steps to subclasses. Subclasses redefine certain steps without
 * changing the algorithm's structure.
 *
 * THE TEMPLATE METHOD is sendNotification() — declared final so subclasses
 * cannot alter the skeleton. It always runs:
 *   shouldSend() → buildSubject() → buildHtmlBody() → dispatch() → afterSend()
 *
 * Abstract steps (MUST override):
 *   buildSubject(ctx)   — return the email subject line
 *   buildHtmlBody(ctx)  — return full HTML body string
 *
 * Hook steps (MAY override):
 *   shouldSend(ctx)     — veto sending (e.g. user opted out)
 *   afterSend(ctx)      — post-send audit logging
 *
 * Concrete subclasses (each in this package):
 *   BookingConfirmationEmailService  — booking confirmed + QR code
 *   CheckinEmailService              — check-in success + seat directions
 *   BookingCancellationEmailService  — booking cancelled + refund notice
 *   ReservationExpiryEmailService    — reservation timed out
 *
 * @Async("emailTaskExecutor") — all sends run on the dedicated email thread pool
 * so HTTP response / scheduler thread is never blocked by SMTP latency.
 */
@Slf4j
public abstract class AbstractEmailNotificationService {

    private final JavaMailSender mailSender;

    @Value("${notification.email.from-address:noreply@cinema.com}")
    private String fromAddress;

    @Value("${notification.email.from-name:CinePlex Cinema}")
    private String fromName;

    @Value("${notification.email.enabled:true}")
    private boolean emailEnabled;

    protected AbstractEmailNotificationService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  THE TEMPLATE METHOD — final; defines invariant send algorithm
    // ══════════════════════════════════════════════════════════════════════

    @Async("emailTaskExecutor")
    public final void sendNotification(NotificationContext context) {
        if (!shouldSend(context)) {
            log.debug("[Email] Vetoed — type={} recipient={}",
                    getClass().getSimpleName(), context.getRecipientEmail());
            return;
        }
        try {
            String subject  = buildSubject(context);
            String htmlBody = buildHtmlBody(context);
            dispatch(context.getRecipientEmail(), subject, htmlBody);
            afterSend(context);
            log.info("[Email] Sent '{}' → {}", subject, context.getRecipientEmail());
        } catch (Exception e) {
            // Email failure must NEVER roll back a booking transaction
            log.error("[Email] Failed — type={} recipient={} error={}",
                    getClass().getSimpleName(), context.getRecipientEmail(), e.getMessage(), e);
        }
    }

    // ── Abstract steps ────────────────────────────────────────────────────

    protected abstract String buildSubject(NotificationContext context);

    protected abstract String buildHtmlBody(NotificationContext context);

    // ── Hook steps ────────────────────────────────────────────────────────

    protected boolean shouldSend(NotificationContext context) {
        if (!emailEnabled) return false;
        if (context.getRecipientEmail() == null || context.getRecipientEmail().isBlank()) {
            log.warn("[Email] No recipient address — skipping.");
            return false;
        }
        return true;
    }

    protected void afterSend(NotificationContext context) {
        // no-op hook — override to write email_log record if needed
    }

    // ── Fixed infrastructure step ─────────────────────────────────────────

    private void dispatch(String to, String subject, String html)
            throws MessagingException, java.io.UnsupportedEncodingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(fromAddress, fromName);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(html, true);
        mailSender.send(message);
    }

    // ── Shared HTML helpers available to all subclasses ───────────────────

    protected String wrapInLayout(String title, String bodyContent) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width,initial-scale=1.0">
                  <title>%s</title>
                </head>
                <body style="margin:0;padding:0;background:#0f0f0f;font-family:'Segoe UI',Arial,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 0;">
                    <tr><td align="center">
                      <table width="600" cellpadding="0" cellspacing="0"
                             style="background:#1a1a1a;border-radius:12px;overflow:hidden;
                                    border:1px solid #2a2a2a;">
                        <tr>
                          <td style="background:linear-gradient(135deg,#e50914,#b0060f);
                                     padding:32px;text-align:center;">
                            <h1 style="margin:0;color:#fff;font-size:26px;letter-spacing:2px;
                                       font-weight:700;text-transform:uppercase;">🎬 CinePlex</h1>
                            <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">
                              Cinema Seat Management System
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:40px 48px;color:#e0e0e0;">%s</td>
                        </tr>
                        <tr>
                          <td style="background:#111;padding:24px 48px;text-align:center;
                                     border-top:1px solid #2a2a2a;">
                            <p style="margin:0;color:#555;font-size:12px;">
                              This is an automated message from CinePlex Cinema.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(title, bodyContent);
    }

    protected String infoRow(String label, String value) {
        return """
               <tr>
                 <td style="padding:8px 0;color:#888;font-size:14px;width:40%%;">%s</td>
                 <td style="padding:8px 0;color:#e0e0e0;font-size:14px;font-weight:600;">%s</td>
               </tr>
               """.formatted(label, value);
    }
}