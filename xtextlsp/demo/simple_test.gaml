model simple_test
import "test.gaml"
global {  
	int test_var <- 42; 
	 
	init {
		write "Simple test model initialized";
		create test_agent;  
		ask test_agent {
			do toto;  
		}    
	} 
}  

species test_species skills:[moving3D]{
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