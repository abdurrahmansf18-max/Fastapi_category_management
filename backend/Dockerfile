# Senin bilgisayarındaki sürümün birebir aynısı
FROM python:3.12.10-slim

WORKDIR /app

# Gereksinimleri kopyala ve kur
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# uvicorn ile --reload komutu, kod değiştiğinde sunucuyu anında yeniden başlatır
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]