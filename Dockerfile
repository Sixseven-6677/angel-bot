FROM node:20-slim

# أدوات البناء للـ native modules (better-sqlite3, sqlite3) + git للـ GitHub dependencies
RUN apt-get update && apt-get install -y \
    python3 make g++ git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# نسخ ملفات الـ dependencies أولاً لاستغلال Docker cache
COPY package*.json ./

# تثبيت الـ packages مع بناء الـ native modules
RUN npm install --production --build-from-source

# نسخ باقي الملفات
COPY . .

# تصحيح مشكلة MQTT مع Facebook (non-standard PUBACK packets)
RUN node fix-mqtt.js

# إنشاء جميع المجلدات اللازمة (بما فيها database/data للـ SQLite)
RUN mkdir -p \
    database/data \
    data \
    scripts/cmds/assets/font \
    scripts/cmds/assets/image \
    scripts/cmds/tmp \
    scripts/events/tmp \
    scripts/cmds/الملاك/data

# متغيرات البيئة الافتراضية
ENV NODE_ENV=production
ENV TZ=Africa/Cairo

# تشغيل البوت
CMD ["node", "index.js"]
