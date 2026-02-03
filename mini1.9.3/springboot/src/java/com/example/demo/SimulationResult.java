package com.example.demo;

import java.util.List;

public class SimulationResult {
    private String status;
    private List<Frame> frames;
    private List<Stats> aggregateStats;

    public SimulationResult(String status, List<Frame> frames, List<Stats> aggregateStats) {
        this.status = status;
        this.frames = frames;
        this.aggregateStats = aggregateStats;
    }

    public String getStatus() { return status; }
    public List<Frame> getFrames() { return frames; }
    public List<Stats> getAggregateStats() { return aggregateStats; }

    public static class Frame {
        private int step;
        private List<AgentState> agents;

        public Frame(int step, List<AgentState> agents) {
            this.step = step;
            this.agents = agents;
        }

        public int getStep() { return step; }
        public List<AgentState> getAgents() { return agents; }
    }

    public static class AgentState {
        private double x;
        private double y;
        private int status; // 0: Susceptible, 1: Infected, 2: Recovered

        public AgentState(double x, double y, int status) {
            this.x = x;
            this.y = y;
            this.status = status;
        }

        public double getX() { return x; }
        public double getY() { return y; }
        public int getStatus() { return status; }
    }

    public static class Stats {
        private int step;
        private int s;
        private int i;
        private int r;

        public Stats(int step, int s, int i, int r) {
            this.step = step;
            this.s = s;
            this.i = i;
            this.r = r;
        }

        public int getStep() { return step; }
        public int getS() { return s; }
        public int getI() { return i; }
        public int getR() { return r; }
    }
}