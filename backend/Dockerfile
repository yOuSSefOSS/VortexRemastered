FROM node:20-bullseye-slim

ENV NODE_ENV=production
ENV PORT=7860

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY package.json requirements.txt ./
RUN npm install --omit=dev
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 7860

CMD ["npm", "start"]
