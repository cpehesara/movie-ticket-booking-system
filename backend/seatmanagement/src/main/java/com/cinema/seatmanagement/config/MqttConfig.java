package com.cinema.seatmanagement.config;

import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.mqtt.core.DefaultMqttPahoClientFactory;
import org.springframework.integration.mqtt.core.MqttPahoClientFactory;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.integration.mqtt.outbound.MqttPahoMessageHandler;
import org.springframework.integration.mqtt.support.DefaultPahoMessageConverter;
import org.springframework.messaging.MessageChannel;

@Configuration
@ConditionalOnProperty(name = "mqtt.enabled", havingValue = "true", matchIfMissing = false)
public class MqttConfig {

    @Value("${mqtt.broker-url:tcp://localhost:1883}")
    private String brokerUrl;

    @Value("${mqtt.client-id:cinema-backend}")
    private String clientId;

    @Bean
    public MqttPahoClientFactory mqttClientFactory() {
        DefaultMqttPahoClientFactory factory = new DefaultMqttPahoClientFactory();
        MqttConnectOptions options = new MqttConnectOptions();
        options.setServerURIs(new String[]{brokerUrl});
        options.setAutomaticReconnect(true);
        options.setCleanSession(true);
        options.setConnectionTimeout(30);
        options.setKeepAliveInterval(60);
        factory.setConnectionOptions(options);
        return factory;
    }

    @Bean
    public MessageChannel mqttInputChannel() {
        return new DirectChannel();
    }

    @Bean
    public MqttPahoMessageDrivenChannelAdapter inboundAdapter(
            MqttPahoClientFactory mqttClientFactory
    ) {
        MqttPahoMessageDrivenChannelAdapter adapter =
                new MqttPahoMessageDrivenChannelAdapter(
                        clientId + "-inbound",
                        mqttClientFactory,
                        "cinema/+/seat/status",
                        "cinema/+/heartbeat"
                );
        adapter.setCompletionTimeout(5000);
        adapter.setConverter(new DefaultPahoMessageConverter());
        adapter.setQos(1);
        adapter.setOutputChannel(mqttInputChannel());
        return adapter;
    }

    @Bean
    public MessageChannel mqttOutputChannel() {
        return new DirectChannel();
    }

    @Bean
    public MqttPahoMessageHandler mqttOutboundHandler(MqttPahoClientFactory mqttClientFactory) {
        MqttPahoMessageHandler handler =
                new MqttPahoMessageHandler(clientId + "-outbound", mqttClientFactory);
        handler.setAsync(true);
        handler.setDefaultQos(1);
        return handler;
    }
}