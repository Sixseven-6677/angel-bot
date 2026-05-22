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

# ── تشخيص: إظهار الكود الحقيقي في mqtt-packet/parser.js ──
RUN echo "=== mqtt-packet version ===" && \
    cat /app/node_modules/mqtt-packet/package.json | grep '"version"' && \
    echo "=== Lines with flag/puback/error (first 50) ===" && \
    grep -n "Invalid header\|puback\|0x0[fFe]\|& 15\|& 0xF\|emitError\|reserved\|flags\|fixedHeader\|_fixedHeader\|cmdCode" \
      /app/node_modules/mqtt-packet/parser.js 2>/dev/null | head -60 || true

# ── تصحيح مشكلة MQTT مع Facebook (non-standard PUBACK packets) ──
RUN node fix-mqtt.js || true

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
