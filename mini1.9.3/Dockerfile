ARG VCS_REF

FROM eclipse-temurin:21-jre-alpine AS builder

RUN apk add --no-cache tar

COPY minigama/gama.product/target/products/gama.application-linux.gtk.x86_64.tar.gz /tmp/gama.tar.gz
RUN mkdir -p /tmp/gama && \
	tar -xzf /tmp/gama.tar.gz -C /tmp/gama && \
	rm /tmp/gama.tar.gz

RUN sed -i 's/$( dirname "${BASH_SOURCE\[0\]}" )/\/opt\/gama-platform\/headless/g' /tmp/gama/headless/gama-headless.sh && \
	chmod +x /tmp/gama/headless/gama-headless.sh

FROM eclipse-temurin:21-jre-alpine

ARG VCS_REF

LABEL org.label-schema.name="GAMA Headless Docker (1.9.3 Compact)" \
	org.label-schema.description="Docker image of GAMA headless (built from source)" \
	org.label-schema.url="http://gama-platform.org" \
	org.label-schema.vcs-ref=$VCS_REF \
	org.label-schema.vcs-url="https://github.com/gama-platform/gama.docker" \
	org.label-schema.vendor="GAMA Platform" \
	org.label-schema.license="GPL-3.0"

RUN apk add --no-cache bash libstdc++ libc6-compat

COPY --from=builder /tmp/gama /opt/gama-platform

RUN ln -s /opt/gama-platform/headless/gama-headless.sh /usr/sbin/gama-headless

WORKDIR /opt/gama-platform/headless

ENTRYPOINT ["gama-headless"]
CMD ["-validate"]
