# Base image with Node.js (Debian-based)
FROM node:22-bullseye

LABEL authors="Hkshi555"
WORKDIR /app

# Install dependencies needed for Playwright Firefox
RUN apt-get update && apt-get install -y \
    libx11-xcb1 \
    libxrandr2 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxfixes3 \
    libxi6 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    libatk1.0-0 \
    libasound2 \
    libdbus-1-3 \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js packages
COPY package.json package-lock.json ./
RUN npm install

# Copy all source code
COPY . .

# Install Playwright (Firefox)
#RUN npx playwright install firefox

# Set production environment
ENV NODE_ENV=prod

# Start the Discord bot
CMD ["npm", "start"]