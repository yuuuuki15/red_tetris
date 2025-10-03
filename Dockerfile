# Stage 1: Install all dependencies (dev and prod)
FROM node:20-alpine AS deps
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

# Stage 2: Build the client application
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN npm run client-build

# Stage 3: Production image
FROM node:20-alpine AS production
WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy production dependencies from 'deps' stage
COPY --from=deps /usr/src/app/package*.json ./
RUN npm install --omit=dev

# Copy server source code
COPY ./src/server ./src/server
COPY ./params.js ./params.js
COPY ./src/shared ./src/shared

# Copy client build from 'builder' stage
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 3004

CMD [ "npm", "start" ]
