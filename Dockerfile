FROM node:lts-alpine
RUN mkdir -p /stroycord-app
WORKDIR /stroycord-app
COPY package.json /stroycord-app
RUN npm install
COPY . /stroycord-app
CMD ["npm", "start"]
