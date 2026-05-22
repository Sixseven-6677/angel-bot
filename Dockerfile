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
# المرحلة 1: سكريبت Node.js للـ patch
RUN node fix-mqtt.js || true
# المرحلة 2: sed كـ fallback في حال فشل الـ regex
RUN find /app/node_modules -name "parser.js" -path "*/mqtt-packet/*" | \
    while read f; do \
      if grep -q "Invalid header flag bits" "$f" 2>/dev/null; then \
        sed -i \
          -e 's/if (fixedHeader & 0x0F)/if (false \&\& fixedHeader \& 0x0F)/g' \
          -e 's/if (fixedHeader & 0x0f)/if (false \&\& fixedHeader \& 0x0f)/g' \
          -e 's/if (fixed & 0x0F)/if (false \&\& fixed \& 0x0F)/g' \
          -e 's/if (flags & 0x0F)/if (false \&\& flags \& 0x0F)/g' \
          "$f" && echo "[sed] Patched: $f" || true; \
      fi; \
    done

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
