package com.cinema.seatmanagement.util;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Component
@Slf4j
public class QrCodeGenerator {

    private static final int QR_WIDTH = 300;
    private static final int QR_HEIGHT = 300;

    public String generateQrCodeBase64(String content) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();

            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.MARGIN, 2);

            BitMatrix bitMatrix = qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, QR_WIDTH, QR_HEIGHT, hints);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);

            byte[] qrBytes = outputStream.toByteArray();
            return Base64.getEncoder().encodeToString(qrBytes);

        } catch (WriterException | IOException e) {
            log.error("Failed to generate QR code for content: {}", content, e);
            throw new RuntimeException("QR code generation failed", e);
        }
    }

    public byte[] generateQrCodeBytes(String content) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();

            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.MARGIN, 2);

            BitMatrix bitMatrix = qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, QR_WIDTH, QR_HEIGHT, hints);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);

            return outputStream.toByteArray();

        } catch (WriterException | IOException e) {
            log.error("Failed to generate QR code bytes for content: {}", content, e);
            throw new RuntimeException("QR code generation failed", e);
        }
    }
}