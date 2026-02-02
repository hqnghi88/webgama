ARG VCS_REF

FROM eclipse-temurin:21-jre-alpine AS builder

RUN apk add --no-cache tar

COPY minigama/gama.product/target/products/gama.application-linux.gtk.x86_64.tar.gz /tmp/gama.tar.gz
RUN mkdir -p /tmp/gama && \
    tar -xzf /tmp/gama.tar.gz -C /tmp/gama && \
    rm /tmp/gama.tar.gz

RUN rm -rf /tmp/gama/p2

RUN find /tmp/gama -name "*.jar" -exec sh -c 'jar tf "$1" | grep -q "org/eclipse/swt\|org/eclipse/ui" && rm "$1"' _ {} \;

RUN rm -rf /tmp/gama/configuration/*.xml \
    /tmp/gama/configuration/*.ini \
    /tmp/gama/configuration/*.properties \
    /tmp/gama/configuration/org.eclipse.osgi* \
    /tmp/gama/configuration/org.eclipse.equinox* \
    /tmp/gama/configuration/org.eclipse.core* \
    /tmp/gama/configuration/.settings

RUN rm -rf /tmp/custom-jre && \
    mkdir -p /tmp && \
    /opt/java/openjdk/bin/jlink \
    --add-modules java.base,java.desktop,java.instrument,java.management,java.naming,java.prefs,java.rmi,java.sql,java.xml,java.net.http,jdk.unsupported \
    --strip-debug \
    --no-man-pages \
    --no-header-files \
    --compress=2 \
    --output /tmp/custom-jre

FROM alpine:latest

ARG VCS_REF

RUN apk add --no-cache bash libstdc++ libc6-compat fontconfig ttf-dejavu

COPY --from=builder /tmp/gama /opt/gama-platform
COPY --from=builder /tmp/custom-jre /opt/jre

RUN sed -i 's/$( dirname "${BASH_SOURCE\[0\]}" )/\/opt\/gama-platform\/headless/g' /opt/gama-platform/headless/gama-headless.sh && \
    chmod +x /opt/gama-platform/headless/gama-headless.sh && \
    ln -s /opt/gama-platform/headless/gama-headless.sh /usr/sbin/gama-headless

ENV JAVA_HOME=/opt/jre
ENV PATH=$JAVA_HOME/bin:$PATH

WORKDIR /opt/gama-platform/headless

ENTRYPOINT ["gama-headless"]
CMD ["-validate"]
