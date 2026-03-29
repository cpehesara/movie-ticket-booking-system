package com.cinema.seatmanagement.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Dedicated thread pools for @Async tasks.
 *
 * Two executors are defined:
 *
 *  auditTaskExecutor  — used by AuditLogServiceImpl.record() (@Async, PROPAGATION_REQUIRES_NEW).
 *                       Every seat state change fires an async audit write. Pool must be large
 *                       enough to absorb bursts (e.g. 200 simultaneous check-ins at show start).
 *                       Queue depth = 500 so bursts absorb without dropping audit entries.
 *                       The @Async method in AuditLogServiceImpl catches and logs its own
 *                       exceptions, so rejected tasks would be silent — hence a large queue.
 *
 *  emailTaskExecutor  — used by AbstractEmailNotificationService subclasses.
 *                       Smaller pool; email throughput is lower than audit write throughput.
 *
 * Without this config, Spring falls back to SimpleAsyncTaskExecutor which
 * creates one new OS thread per task — catastrophic under peak cinema load.
 *
 * @EnableAsync must live here (or on a @SpringBootApplication class) to
 * activate @Async processing. Placing it on AsyncConfig is the cleaner choice.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * Primary executor used by AuditLogServiceImpl.
     * Named "auditTaskExecutor" — matches the @Async("auditTaskExecutor")
     * annotation that should be added to AuditLogServiceImpl.record().
     *
     * If @Async has no explicit executor name, Spring uses the bean named
     * "taskExecutor" as the default. Naming it explicitly prevents accidental
     * sharing of the email pool with audit writes.
     */
    @Bean(name = "auditTaskExecutor")
    public Executor auditTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(30);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("cinema-audit-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }

    /**
     * Email notification executor.
     * Bounded pool: a spike of 200 concurrent check-ins queues emails
     * rather than spawning 200 threads.
     */
    @Bean(name = "emailTaskExecutor")
    public Executor emailTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("cinema-email-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }
}