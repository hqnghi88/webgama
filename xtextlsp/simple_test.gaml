model simple_test

global {
	int test_var <- 42;
	
	init {
		write "Simple test model initialized";
	}
}

species test_species {
	float energy <- 100.0;
	
	aspect basic {
		draw circle(5) color: #red;
	}
}

experiment main_exp {
	output {
		display main_display {
			species test_species aspect: basic;
		}
	}
}