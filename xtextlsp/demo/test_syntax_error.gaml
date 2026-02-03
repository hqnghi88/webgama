model test_model

global {
	// Global variables
	int number_of_agents <- 10;
	string model_name <- "Test GAML Model";
	
	init {
		write "Model " + model_name + " initialized";
	}
}

species test_agent
	// Missing opening brace - syntax error!
	float energy <- rnd(100);
	point location <- {rnd(100), rnd(100)};
	
	// Reflex that runs every step
	reflex move when: energy > 0 {
		location <- location + {rnd(2) - 1, rnd(2) - 1};
		energy <- energy - 0.1;
	}
	
	// Agent aspect for visualization
	aspect base {
		draw circle(1) color: #blue;
	}
}

exp eriment main_experiment {
	output {
		display map_display {
			species test_agent aspect: base;
		}
	}
}