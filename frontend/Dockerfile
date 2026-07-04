# Stage 1: Build the React application
FROM node:20-slim AS build

WORKDIR /app

# Copy dependency catalogs and install
COPY package*.json ./
RUN npm ci

# Copy project files and build
COPY . .
RUN npm run build

# Stage 2: Serve the compiled static assets with Nginx
FROM nginx:alpine

# Copy built assets to Nginx server path
COPY --from=build /app/dist /usr/share/nginx/html

# Expose Nginx port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
