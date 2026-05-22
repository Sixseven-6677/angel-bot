/**
 * DBAdapter — محوّل قاعدة البيانات (JSON Atomic Store)
 * - كتابة ذرية: temp file → rename (لا يوجد تلف عند الانهيار)
 * - UPSERT لكل العمليات — لا تكرار ممكن
 * - سريع ولا يحتاج native bindings
 */

"use strict";

const fs       = require("fs");
const path     = require("path");
const EventBus = require("./EventBus");
const log      = require("../../logger/log.js");

const DATA_DIR  = path.join(__dirname, "../../data/dm");
const TABLES    = ["users","threads","cache","events","command_states","uptime","messages"];

class DBAdapter {
  constructor() {
    /** @type {Map<string, Map<string, {data:any, updatedAt:number}>>} */
    this._store = new Map();
    this.ready  = false;
  }

  init() {
    if (!fs.existsSync(DATA_DIR))
      fs.mkdirSync(DATA_DIR, { recursive: true });

    // تحميل كل الجداول من الملفات
    for (const t of TABLES) this._loadTable(t);

    // تنظيف الكاش المنتهي كل 5 دقائق
    const timer = setInterval(() => this._evictExpiredCache(), 5 * 60 * 1000);
    timer.unref?.();

    this.ready = true;
    log.info("DB", `✅ DBAdapter جاهز (JSON Store) — ${DATA_DIR}`);
  }

  // ── تحميل جدول ───────────────────────────────────────
  _loadTable(table) {
    const file = this._file(table);
    try {
      if (fs.existsSync(file)) {
        const raw = JSON.parse(fs.readFileSync(file, "utf8"));
        const map = new Map(Object.entries(raw));
        this._store.set(table, map);
      } else {
        this._store.set(table, new Map());
      }
    } catch {
      log.warn("DB", `⚠️ تلف في ${table}.json — تهيئة فارغة`);
      this._store.set(table, new Map());
    }
  }

  // ── حفظ جدول (كتابة ذرية) ────────────────────────────
  _saveTable(table) {
    const map  = this._store.get(table);
    if (!map) return;

    const obj  = Object.fromEntries(map);
    const file = this._file(table);
    const tmp  = file + ".tmp";

    try {
      fs.writeFileSync(tmp, JSON.stringify(obj), "utf8");
      fs.renameSync(tmp, file);
      EventBus.emit(EventBus.Events.DB_WRITE, { table });
    } catch (err) {
      try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch {}
      throw err;
    }
  }

  _file(table) {
    return path.join(DATA_DIR, `${table}.json`);
  }

  // ── UPSERT: الجديد يحل دائماً محل القديم ─────────────
  upsert(table, id, data, extra = {}) {
    this._assertReady();
    const ns  = this._ns(table);
    const key = String(id);
    const now = Date.now();

    const entry = {
      data,
      updatedAt: now,
      ...extra,
    };

    ns.set(key, entry);
    this._saveTable(this._tableOf(table));
    return true;
  }

  // ── قراءة ─────────────────────────────────────────────
  get(table, id) {
    this._assertReady();
    const entry = this._ns(table).get(String(id));
    if (!entry) return null;

    // للكاش: تحقق من انتهاء الصلاحية
    if (table === "cache" && entry.expiry && Date.now() > entry.expiry) {
      this._ns(table).delete(String(id));
      this._saveTable("cache");
      return null;
    }
    return entry.data !== undefined ? entry.data : entry;
  }

  // ── جلب الكل ──────────────────────────────────────────
  getAll(table) {
    this._assertReady();
    const result = [];
    const now    = Date.now();
    for (const [id, entry] of this._ns(table)) {
      if (table === "cache" && entry.expiry && now > entry.expiry) continue;
      result.push({ id, ...(entry.data || entry) });
    }
    return result;
  }

  // ── حذف ───────────────────────────────────────────────
  delete(table, id) {
    this._assertReady();
    const ns  = this._ns(table);
    const had = ns.delete(String(id));
    if (had) this._saveTable(this._tableOf(table));
    return had;
  }

  // ── إصلاح التالف ──────────────────────────────────────
  repairCorrupt() {
    let fixed = 0;
    for (const [table, map] of this._store) {
      for (const [id, entry] of map) {
        if (!entry || typeof entry !== "object") {
          map.delete(id);
          fixed++;
        }
      }
      if (fixed > 0) this._saveTable(table);
    }
    return fixed;
  }

  // ── تنظيف الكاش المنتهي ───────────────────────────────
  _evictExpiredCache() {
    const cache = this._store.get("cache");
    if (!cache) return;
    const now = Date.now();
    let removed = 0;
    for (const [id, entry] of cache) {
      if (entry.expiry && now > entry.expiry) { cache.delete(id); removed++; }
    }
    if (removed > 0) {
      this._saveTable("cache");
      log.info("DB", `🧹 أُزيلت ${removed} كاش منتهية`);
    }
  }

  _ns(table) {
    const t = this._tableOf(table);
    if (!this._store.has(t)) this._store.set(t, new Map());
    return this._store.get(t);
  }

  _tableOf(table) {
    return TABLES.includes(table) ? table : "generic_" + table;
  }

  _assertReady() {
    if (!this.ready) throw new Error("DBAdapter غير مهيأ — استدعِ init() أولاً");
  }

  close() { this.ready = false; }
}

module.exports = new DBAdapter();
