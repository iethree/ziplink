FROM node:current-alpine
WORKDIR /app

RUN yum install -y zip
RUN npm install -g pm2

COPY ziplink-server/. /app

EXPOSE 3006

ENV LC_ALL="C.UTF-8"
ENV LANG="C.UTF-8"
ENV NAME ziplink-server

CMD ["pm2", "start", "ziplink-server.js", "--no-daemon"]
