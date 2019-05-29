FROM node:current-alpine
WORKDIR /app

RUN apk add zip
RUN npm install -g pm2

COPY ziplink-server/. /app

EXPOSE 3006

ENV NAME ziplink-server

CMD ["pm2", "start", "ziplink-server.js", "--no-daemon"]
