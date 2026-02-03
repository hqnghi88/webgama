package com.example.demo;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/simulation")
public class SimulationController {

    private static final double WORLD_SIZE = 500.0;
    private static final double INFECTION_RADIUS = 15.0;
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final GamlValidationService validationService = new GamlValidationService();

    @PostMapping("/validate")
    public GamlValidationResponse validateGaml(@RequestBody GamlValidationRequest request) {
        GamlValidationService.ValidationResult result = validationService.validate(request.code());
        return new GamlValidationResponse(result.valid(), result.errors());
    }

    @GetMapping("/stream")
    public SseEmitter streamSimulation(
            @RequestParam(defaultValue = "200") int populationSize,
            @RequestParam(defaultValue = "0.3") double transmissionRate,
            @RequestParam(defaultValue = "0.1") double recoveryRate,
            @RequestParam(defaultValue = "2.0") double movementSpeed) {

        // 10 minute timeout (600,000 ms) to prevent infinite zombie processes
        SseEmitter emitter = new SseEmitter(600_000L);
        
        // Atomic flag to control the loop
        java.util.concurrent.atomic.AtomicBoolean isRunning = new java.util.concurrent.atomic.AtomicBoolean(true);

        // Cleanup callbacks
        Runnable stop = () -> isRunning.set(false);
        emitter.onCompletion(stop);
        emitter.onTimeout(stop);
        emitter.onError((e) -> stop.run());

        executor.execute(() -> {
            try {
                List<Agent> agents = initializeAgents(populationSize);
                Random random = new Random();
                int step = 0;
                long startTime = System.currentTimeMillis();

                // Loop checks flag AND max duration
                while (isRunning.get() && (System.currentTimeMillis() - startTime < 600_000)) {
                    // 1. Move
                    for (Agent agent : agents) {
                        moveAgent(agent, movementSpeed, random);
                    }

                    // 2. Infect & Recover
                    for (Agent a : agents) {
                        if (a.status == 1) { // Infected
                            for (Agent neighbor : agents) {
                                if (neighbor.status == 0) { // Susceptible
                                    double dist = Math.sqrt(Math.pow(a.x - neighbor.x, 2) + Math.pow(a.y - neighbor.y, 2));
                                    if (dist < INFECTION_RADIUS) {
                                        if (random.nextDouble() < transmissionRate) {
                                            neighbor.nextStatus = 1;
                                        }
                                    }
                                }
                            }
                            if (random.nextDouble() < recoveryRate) {
                                a.nextStatus = 2;
                            }
                        }
                    }

                    // 3. Update & Stats
                    int countS = 0, countI = 0, countR = 0;
                    List<SimulationResult.AgentState> frameAgents = new ArrayList<>();

                    for (Agent agent : agents) {
                        if (agent.nextStatus != -1) {
                            agent.status = agent.nextStatus;
                            agent.nextStatus = -1;
                        }
                        if (agent.status == 0) countS++;
                        else if (agent.status == 1) countI++;
                        else countR++;

                        frameAgents.add(new SimulationResult.AgentState(agent.x, agent.y, agent.status));
                    }

                    // Send Frame
                    SimulationResult.Frame frame = new SimulationResult.Frame(step++, frameAgents);
                    SimulationResult.Stats stats = new SimulationResult.Stats(step, countS, countI, countR);
                    
                    try {
                        emitter.send(new StreamUpdate(frame, stats));
                    } catch (Exception e) {
                        // Client disconnected, break loop immediately
                        break;
                    }

                    // Throttle to 10 FPS (100ms) to save CPU
                    Thread.sleep(100);
                }
                
                // Final cleanup attempt (idempotent)
                try { emitter.complete(); } catch (Exception ignored) {}
                
            } catch (Exception e) {
                try { emitter.completeWithError(e); } catch (Exception ignored) {}
            }
        });

        return emitter;
    }

    // DTO for streaming updates
    public static class StreamUpdate {
        public SimulationResult.Frame frame;
        public SimulationResult.Stats stats;
        public StreamUpdate(SimulationResult.Frame frame, SimulationResult.Stats stats) {
            this.frame = frame;
            this.stats = stats;
        }
    }

    @PostMapping("/run")
    public SimulationResult runSimulation(@RequestBody SimulationRequest request) {
        List<Agent> agents = initializeAgents(request.getPopulationSize());
        List<SimulationResult.Frame> frames = new ArrayList<>();
        List<SimulationResult.Stats> stats = new ArrayList<>();
        Random random = new Random();

        // Run simulation steps
        for (int t = 0; t < request.getDuration(); t++) {
            // 1. Move Agents
            for (Agent agent : agents) {
                moveAgent(agent, request.getMovementSpeed(), random);
            }

            // 2. Infection Spread
            // Naive O(N^2) for simplicity - acceptable for small populationSize (< 500)
            for (Agent a : agents) {
                if (a.status == 1) { // Infected
                    for (Agent neighbor : agents) {
                        if (neighbor.status == 0) { // Susceptible
                            double dist = Math.sqrt(Math.pow(a.x - neighbor.x, 2) + Math.pow(a.y - neighbor.y, 2));
                            if (dist < INFECTION_RADIUS) {
                                if (random.nextDouble() < request.getTransmissionRate()) {
                                    neighbor.nextStatus = 1; // Mark for infection next step
                                }
                            }
                        }
                    }
                    // Recovery chance
                    if (random.nextDouble() < request.getRecoveryRate()) {
                        a.nextStatus = 2;
                    }
                }
            }

            // 3. Update Status and Record Stats
            int countS = 0, countI = 0, countR = 0;
            List<SimulationResult.AgentState> frameAgents = new ArrayList<>();
            
            for (Agent agent : agents) {
                if (agent.nextStatus != -1) {
                    agent.status = agent.nextStatus;
                    agent.nextStatus = -1;
                }
                
                if (agent.status == 0) countS++;
                else if (agent.status == 1) countI++;
                else countR++;

                frameAgents.add(new SimulationResult.AgentState(agent.x, agent.y, agent.status));
            }

            frames.add(new SimulationResult.Frame(t, frameAgents));
            stats.add(new SimulationResult.Stats(t, countS, countI, countR));
        }

        return new SimulationResult("Success", frames, stats);
    }

    private List<Agent> initializeAgents(int count) {
        List<Agent> agents = new ArrayList<>();
        Random random = new Random();
        for (int i = 0; i < count; i++) {
            double x = random.nextDouble() * WORLD_SIZE;
            double y = random.nextDouble() * WORLD_SIZE;
            // First 3 agents are infected
            int status = (i < 3) ? 1 : 0;
            agents.add(new Agent(x, y, status));
        }
        return agents;
    }

    private void moveAgent(Agent agent, double speed, Random random) {
        double angle = random.nextDouble() * 2 * Math.PI;
        agent.x += Math.cos(angle) * speed;
        agent.y += Math.sin(angle) * speed;

        // Bounce off walls
        if (agent.x < 0) agent.x = 0;
        if (agent.x > WORLD_SIZE) agent.x = WORLD_SIZE;
        if (agent.y < 0) agent.y = 0;
        if (agent.y > WORLD_SIZE) agent.y = WORLD_SIZE;
    }

    // Internal Agent Helper Class
    private static class Agent {
        double x, y;
        int status; // 0: S, 1: I, 2: R
        int nextStatus = -1;

        public Agent(double x, double y, int status) {
            this.x = x;
            this.y = y;
            this.status = status;
        }
    }
    
    @GetMapping("/health")
    public String health() {
        return "SIR Simulator Backend is running";
    }

    public record GamlValidationRequest(String code) {}
    public record GamlValidationResponse(boolean valid, java.util.List<String> errors) {}
}