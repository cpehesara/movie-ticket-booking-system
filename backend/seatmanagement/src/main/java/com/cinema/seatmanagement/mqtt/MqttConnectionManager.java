package com.cinema.seatmanagement.mqtt;

import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * SINGLETON PATTERN (GoF — Creational)
 *
 * Intent: Ensure a class has only one instance and provide a global
 * point of access to it.
 *
 * Why Singleton here (domain requirement, not just Spring default):
 *   MQTT brokers reject duplicate client-ID connections. If BookingServiceImpl
 *   and CheckinServiceImpl each created their own MqttClient with the same
 *   clientId, the broker would forcefully disconnect the first connection
 *   when the second one arrives — causing silent LED command failures.
 *   One shared manager = one broker connection = correct behaviour.
 *
 * Spring's @Component is singleton-scoped by default, which enforces the
 * pattern at the container level. The AtomicBoolean guard prevents
 * re-initialisation if the bean's @PostConstruct fires more than once
 * (possible in certain proxy or refresh scenarios).
 *
 * @ConditionalOnProperty: during local development without a running broker,
 * set mqtt.enabled=false to skip this bean entirely. MqttPublisher handles
 * the null case gracefully and logs commands instead of sending them.
 */
@Component
@ConditionalOnProperty(name = "mqtt.enabled", havingValue = "true")
@Slf4j
public class MqttConnectionManager {

    @Value("${mqtt.broker-url:tcp://localhost:1883}")
    private String brokerUrl;

    @Value("${mqtt.client-id:cinema-backend}")
    private String clientId;

    @Value("${mqtt.username:}")
    private String username;

    @Value("${mqtt.password:}")
    private String password;

    private MqttClient client;
    private final AtomicBoolean connected = new AtomicBoolean(false);

    @PostConstruct
    public void connect() {
        if (!connected.compareAndSet(false, true)) {
            log.warn("[MQTT-Singleton] Already connected — skipping duplicate init.");
            return;
        }
        try {
            client = new MqttClient(brokerUrl, clientId, new MemoryPersistence());

            MqttConnectOptions opts = new MqttConnectOptions();
            opts.setServerURIs(new String[]{brokerUrl});
            opts.setAutomaticReconnect(true);
            opts.setCleanSession(true);
            opts.setConnectionTimeout(30);
            opts.setKeepAliveInterval(60);

            if (username != null && !username.isBlank()) {
                opts.setUserName(username);
                opts.setPassword(password.toCharArray());
            }

            client.connect(opts);
            log.info("[MQTT-Singleton] Connected → broker={} clientId={}", brokerUrl, clientId);

        } catch (MqttException e) {
            connected.set(false);
            log.error("[MQTT-Singleton] Connection failed: {}", e.getMessage(), e);
        }
    }

    @PreDestroy
    public void disconnect() {
        if (client != null && client.isConnected()) {
            try {
                client.disconnect();
                log.info("[MQTT-Singleton] Disconnected from broker.");
            } catch (MqttException e) {
                log.warn("[MQTT-Singleton] Disconnect error: {}", e.getMessage());
            }
        }
    }

    public MqttClient getClient()  { return client; }
    public boolean isConnected()   { return client != null && client.isConnected(); }
}