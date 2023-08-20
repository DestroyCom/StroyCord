FROM node:lts-alpine

RUN mkdir -p /stroycord_app
RUN mkdir -p /stroycord_app/logs

WORKDIR /stroycord_app

COPY package.json /stroycord_app
RUN npm cache clean --force
RUN apk update && apk add python3 make g++
RUN npm install

COPY . /stroycord_app

CMD ["npm", "start"]