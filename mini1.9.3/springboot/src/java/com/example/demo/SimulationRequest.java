package com.example.demo;

public class SimulationRequest {
    private int populationSize;
    private int duration;
    private double transmissionRate;
    private double recoveryRate;
    private double movementSpeed;

    // Defaults
    public SimulationRequest() {
        this.populationSize = 200;
        this.duration = 100;
        this.transmissionRate = 0.3;
        this.recoveryRate = 0.1;
        this.movementSpeed = 2.0;
    }

    public int getPopulationSize() { return populationSize; }
    public void setPopulationSize(int populationSize) { this.populationSize = populationSize; }
    public int getDuration() { return duration; }
    public void setDuration(int duration) { this.duration = duration; }
    public double getTransmissionRate() { return transmissionRate; }
    public void setTransmissionRate(double transmissionRate) { this.transmissionRate = transmissionRate; }
    public double getRecoveryRate() { return recoveryRate; }
    public void setRecoveryRate(double recoveryRate) { this.recoveryRate = recoveryRate; }
    public double getMovementSpeed() { return movementSpeed; }
    public void setMovementSpeed(double movementSpeed) { this.movementSpeed = movementSpeed; }
}