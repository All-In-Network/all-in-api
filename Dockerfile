FROM node:16-alpine as builder

ENV NODE_ENV production

# Adds a work directory
WORKDIR /app

# Cache and install dependencies
COPY package.json .
COPY yarn.lock .
RUN yarn install --production

# Copy app files
COPY . .

EXPOSE 80

CMD ["yarn", "start"]
