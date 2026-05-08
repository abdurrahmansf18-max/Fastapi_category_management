# Senin bilgisayarındaki Node sürümünün birebir aynısı
FROM node:22.19.0-alpine

WORKDIR /app

# Paket dosyalarını kopyala ve kur
COPY package*.json ./
RUN npm install

# Vite'ı dışarıya açıyoruz
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]