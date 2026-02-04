model test_valid_model

global {
	int number_of_agents <- 10;
	string model_name <- "Test Valid GAML Model";
	
	init {
		write "Model " + model_name + " initialized";
	}
}

species test_agent {
	float energy <- rnd(100);
	point location <- {rnd(100), rnd(100)};
	
	reflex move when: energy > 0 {
		location <- location + {rnd(2) - 1, rnd(2) - 1};
		energy <- energy - 0.1;
	}
	
	aspect base {
		draw circle(1) color: #blue;
	}
}

experiment main_experiment {
	output {
		display map_display {
			species test_agent aspect: base;
		}
	}
}