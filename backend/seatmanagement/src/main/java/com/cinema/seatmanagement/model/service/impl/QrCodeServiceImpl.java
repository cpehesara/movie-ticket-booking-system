package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.exception.InvalidQrCodeException;
import com.cinema.seatmanagement.model.service.interfaces.QrCodeService;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.EnumMap;
import java.util.Map;
import javax.imageio.ImageIO;

/**
 * QrCodeServiceImpl — HMAC-SHA256 signed QR codes via ZXing.
 *
 * BOOKING QR payload format:
 *   BOOKING:{bookingCode}:{showtimeId}:{userId}:{hmac}
 *
 * SEAT QR payload format:
 *   SEAT:{seatId}:{screenId}:{rowLabel}:{colNumber}:{hmac}
 *
 * HMAC is computed over everything before the last colon segment.
 * The signing key comes from application.properties: qr.hmac-secret
 *
 * WHY HMAC: prevents customers from forging QR codes for seats/bookings
 * they don't own by simply guessing the payload format.
 *
 * Dependencies to add to pom.xml:
 *   <dependency>
 *     <groupId>com.google.zxing</groupId>
 *     <artifactId>core</artifactId>
 *     <version>3.5.3</version>
 *   </dependency>
 *   <dependency>
 *     <groupId>com.google.zxing</groupId>
 *     <artifactId>javase</artifactId>
 *     <version>3.5.3</version>
 *   </dependency>
 */
@Service
public class QrCodeServiceImpl implements QrCodeService {

    private static final Logger log = LoggerFactory.getLogger(QrCodeServiceImpl.class);

    private static final String HMAC_ALGO     = "HmacSHA256";
    private static final int    QR_SIZE       = 300;   // pixels
    private static final int    QUIET_ZONE    = 10;
    private static final String QR_FORMAT     = "PNG";

    @Value("${qr.hmac-secret:cinema-qr-secret-change-in-production}")
    private String hmacSecret;

    // ── Public API ──────────────────────────────────────────────────────────

    @Override
    public String generateBookingQrCode(String bookingCode, Long showtimeId, Long userId) {
        String payload = buildBookingQrPayload(bookingCode, showtimeId, userId);
        return renderQrToBase64(payload);
    }

    @Override
    public String generateSeatQrCode(Long seatId, Long screenId, String rowLabel, Integer colNumber) {
        String payload = buildSeatQrPayload(seatId, screenId, rowLabel, colNumber);
        return renderQrToBase64(payload);
    }

    @Override
    public String buildBookingQrPayload(String bookingCode, Long showtimeId, Long userId) {
        String data = "BOOKING:" + bookingCode + ":" + showtimeId + ":" + userId;
        String hmac = computeHmac(data);
        return data + ":" + hmac;
    }

    @Override
    public String buildSeatQrPayload(Long seatId, Long screenId, String rowLabel, Integer colNumber) {
        String data = "SEAT:" + seatId + ":" + screenId + ":" + rowLabel + ":" + colNumber;
        String hmac = computeHmac(data);
        return data + ":" + hmac;
    }

    @Override
    public QrValidationResult validateQrPayload(String rawPayload) {
        if (rawPayload == null || rawPayload.isBlank()) {
            throw new InvalidQrCodeException("QR payload is empty");
        }

        String[] parts = rawPayload.split(":");
        if (parts.length < 2) {
            throw new InvalidQrCodeException("QR payload format unrecognised");
        }

        String type = parts[0];
        return switch (type) {
            case "BOOKING" -> parseAndValidateBookingQr(parts, rawPayload);
            case "SEAT"    -> parseAndValidateSeatQr(parts, rawPayload);
            default        -> throw new InvalidQrCodeException("Unknown QR type: " + type);
        };
    }

    // ── Private parsing helpers ─────────────────────────────────────────────

    private QrValidationResult parseAndValidateBookingQr(String[] parts, String raw) {
        // Expected: BOOKING:{bookingCode}:{showtimeId}:{userId}:{hmac}  → 5 parts
        if (parts.length != 5) {
            throw new InvalidQrCodeException("Malformed BOOKING QR: wrong segment count");
        }
        String bookingCode = parts[1];
        long   showtimeId;
        long   userId;
        String providedHmac = parts[4];

        try {
            showtimeId = Long.parseLong(parts[2]);
            userId     = Long.parseLong(parts[3]);
        } catch (NumberFormatException e) {
            throw new InvalidQrCodeException("BOOKING QR contains non-numeric IDs");
        }

        String data         = "BOOKING:" + bookingCode + ":" + showtimeId + ":" + userId;
        String expectedHmac = computeHmac(data);

        if (!constantTimeEquals(expectedHmac, providedHmac)) {
            throw new InvalidQrCodeException("BOOKING QR signature invalid — possible tampering");
        }

        return QrValidationResult.booking(bookingCode, showtimeId, userId);
    }

    private QrValidationResult parseAndValidateSeatQr(String[] parts, String raw) {
        // Accept legacy format SEAT:{seatId} (2 parts, no HMAC) — produced by V3 migration
        // and by physical stickers printed before HMAC signing was introduced.
        if (parts.length == 2) {
            try {
                long seatId = Long.parseLong(parts[1]);
                log.debug("[QR] Legacy seat QR accepted: SEAT:{}", seatId);
                return QrValidationResult.seat(seatId, null, null, null);
            } catch (NumberFormatException e) {
                throw new InvalidQrCodeException("Legacy SEAT QR has non-numeric id");
            }
        }

        // Expected: SEAT:{seatId}:{screenId}:{rowLabel}:{colNumber}:{hmac}  → 6 parts
        if (parts.length != 6) {
            throw new InvalidQrCodeException("Malformed SEAT QR: wrong segment count");
        }
        long    seatId;
        long    screenId;
        String  rowLabel    = parts[3];
        int     colNumber;
        String  providedHmac = parts[5];

        try {
            seatId    = Long.parseLong(parts[1]);
            screenId  = Long.parseLong(parts[2]);
            colNumber = Integer.parseInt(parts[4]);
        } catch (NumberFormatException e) {
            throw new InvalidQrCodeException("SEAT QR contains non-numeric IDs");
        }

        String data         = "SEAT:" + seatId + ":" + screenId + ":" + rowLabel + ":" + colNumber;
        String expectedHmac = computeHmac(data);

        if (!constantTimeEquals(expectedHmac, providedHmac)) {
            throw new InvalidQrCodeException("SEAT QR signature invalid — possible tampering");
        }

        return QrValidationResult.seat(seatId, screenId, rowLabel, colNumber);
    }

    // ── ZXing rendering ─────────────────────────────────────────────────────

    private String renderQrToBase64(String payload) {
        try {
            Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.H);
            hints.put(EncodeHintType.MARGIN, QUIET_ZONE);
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");

            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix matrix = writer.encode(payload, BarcodeFormat.QR_CODE, QR_SIZE, QR_SIZE, hints);

            BufferedImage qrImage = MatrixToImageWriter.toBufferedImage(matrix);

            // Add cinema branding — white background, black QR
            BufferedImage branded = addBranding(qrImage);

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            ImageIO.write(branded, QR_FORMAT, bos);
            return Base64.getEncoder().encodeToString(bos.toByteArray());

        } catch (WriterException | java.io.IOException e) {
            log.error("Failed to generate QR code for payload starting with: {}",
                    payload.substring(0, Math.min(20, payload.length())), e);
            throw new RuntimeException("QR code generation failed", e);
        }
    }

    /**
     * Adds a minimal cinema-branded wrapper around the raw QR matrix image.
     * White background + small "CinePlex" label beneath the QR.
     */
    private BufferedImage addBranding(BufferedImage qrImage) {
        int padding   = 16;
        int labelH    = 24;
        int totalW    = QR_SIZE + padding * 2;
        int totalH    = QR_SIZE + padding * 2 + labelH;

        BufferedImage out = new BufferedImage(totalW, totalH, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        // White background
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, totalW, totalH);

        // Draw QR image
        g.drawImage(qrImage, padding, padding, null);

        // Label
        g.setColor(new Color(0x1a1a1a));
        g.setFont(new Font("SansSerif", Font.BOLD, 11));
        FontMetrics fm = g.getFontMetrics();
        String label = "CinePlex — Scan at door or seat";
        int labelX = (totalW - fm.stringWidth(label)) / 2;
        g.drawString(label, labelX, QR_SIZE + padding * 2 + 10);

        g.dispose();
        return out;
    }

    // ── HMAC ────────────────────────────────────────────────────────────────

    private String computeHmac(String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            SecretKeySpec keySpec = new SecretKeySpec(hmacSecret.getBytes(), HMAC_ALGO);
            mac.init(keySpec);
            byte[] rawHmac = mac.doFinal(data.getBytes());
            // Use URL-safe Base64 without padding to keep the payload compact
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
        } catch (Exception e) {
            throw new RuntimeException("HMAC computation failed", e);
        }
    }

    /**
     * Constant-time string comparison — prevents timing attacks on the HMAC.
     * Do NOT replace with String.equals().
     */
    private boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }
}