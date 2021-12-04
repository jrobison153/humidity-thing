FROM ubuntu:20.04

RUN apt update
RUN apt install -y wget bash python3

SHELL ["/bin/bash", "--login", "-c"]

RUN mkdir /usr/local/nvm

ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 16.13.2
ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules

RUN wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash \
    && source $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

RUN npm install -g yarn@1.22.x

RUN mkdir /usr/local/app
WORKDIR /usr/local/app

COPY ./bin/ bin
COPY ./src/ src
COPY ./test-acceptance/ test-acceptance
COPY ./test-doubles/ test-doubles
COPY jest.config.json .
COPY package.json .
COPY yarn.lock .

RUN yarn
RUN yarn test:acceptance
