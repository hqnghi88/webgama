# goal
- integrate the springboot server from `mini1.9.3/springboot` into the `mini1.9.3/Dockerfile`

# constraints/assumptions
- base image is `eclipse-temurin:21-jdk-alpine`
- springboot project uses Maven
- gama platform is built and available at `minigama/gama.product/target/products/gama.application-linux.gtk.x86_64.tar.gz`

# key decisions
- use a multi-stage build to compile Spring Boot
- keep the image size optimized
- entrypoint will likely be the Spring Boot application

# state
- done: initial analysis
- now: updating Dockerfile to build and include Spring Boot
- next: verify integration

# open questions (unconfirmed if needed)
- does gama headless require any jdk-specific features (e.g. compiler)? [unconfirmed - assuming JRE is enough for runtime]

# working set
- [Dockerfile](file:///Users/hqnghi/git/webgama/mini1.9.3/Dockerfile)
