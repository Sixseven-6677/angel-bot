/**
 * CacheManager — كاش ذكي مع TTL ومنع Memory Leak
 * LRU (Least Recently Used) مع حد أقصى للحجم
 */

"use strict";

const EventBus = require("./EventBus");
const log      = require("../../logger/log.js");

const DEFAULT_TTL    = 5 * 60 * 1000;  // 5 دقائق
const MAX_CACHE_SIZE = 1000;            // حد أقصى لمنع memory leak
const CLEANUP_EVERY  = 60 * 1000;      // تنظيف كل دقيقة

class CacheManager {
  constructor() {
    /** @type {Map<string, {value: any, expiry: number, hits: number, updatedAt: number}>} */
    this._cache   = new Map();
    this._timer   = null;
    this._stats   = { hits: 0, misses: 0, evictions: 0, writes: 0 };
  }

  start() {
    this._timer = setInterval(() => this._cleanup(), CLEANUP_EVERY);
    this._timer.unref?.();
    log.info("CACHE", "✅ CacheManager بدأ التشغيل");
  }

  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  // ── كتابة ───────────────────────────────────────────
  set(key, value, ttl = DEFAULT_TTL) {
    // إذا وصلنا للحد الأقصى، احذف الأقدم
    if (this._cache.size >= MAX_CACHE_SIZE) this._evictOldest();

    const existing = this._cache.get(key);
    this._cache.set(key, {
      value,
      expiry:    Date.now() + ttl,
      hits:      existing ? existing.hits : 0,
      updatedAt: Date.now(),
    });

    this._stats.writes++;
    EventBus.emit(EventBus.Events.DB_WRITE, { key, action: "cache_set" });
  }

  // ── قراءة ────────────────────────────────────────────
  get(key) {
    const entry = this._cache.get(key);

    if (!entry) {
      this._stats.misses++;
      EventBus.emit(EventBus.Events.CACHE_MISS, { key });
      return null;
    }

    if (Date.now() > entry.expiry) {
      this._cache.delete(key);
      this._stats.misses++;
      EventBus.emit(EventBus.Events.CACHE_MISS, { key, reason: "expired" });
      return null;
    }

    entry.hits++;
    this._stats.hits++;
    EventBus.emit(EventBus.Events.CACHE_HIT, { key, hits: entry.hits });
    return entry.value;
  }

  // ── حذف ──────────────────────────────────────────────
  delete(key) {
    const had = this._cache.delete(key);
    if (had) log.info("CACHE", `🗑️ حُذف: ${key}`);
    return had;
  }

  // ── تحديث جزئي ───────────────────────────────────────
  patch(key, updates, ttl = DEFAULT_TTL) {
    const current = this.get(key);
    const merged  = current && typeof current === "object"
      ? { ...current, ...updates }
      : updates;
    this.set(key, merged, ttl);
    return merged;
  }

  has(key) {
    const entry = this._cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiry) { this._cache.delete(key); return false; }
    return true;
  }

  // ── تنظيف المنتهية ────────────────────────────────────
  _cleanup() {
    const now     = Date.now();
    let   removed = 0;
    for (const [key, entry] of this._cache) {
      if (now > entry.expiry) {
        this._cache.delete(key);
        removed++;
        this._stats.evictions++;
      }
    }
    if (removed > 0)
      log.info("CACHE", `🧹 أُزيلت ${removed} إدخالات منتهية`);
  }

  // ── إزالة الأقدم ─────────────────────────────────────
  _evictOldest() {
    let oldest = null, oldestTime = Infinity;
    for (const [key, entry] of this._cache) {
      if (entry.updatedAt < oldestTime) {
        oldestTime = entry.updatedAt;
        oldest     = key;
      }
    }
    if (oldest) {
      this._cache.delete(oldest);
      this._stats.evictions++;
    }
  }

  // ── مسح الكل ─────────────────────────────────────────
  flush() {
    const size = this._cache.size;
    this._cache.clear();
    log.info("CACHE", `🔄 تم مسح ${size} إدخال`);
  }

  stats() {
    return {
      ...this._stats,
      size:    this._cache.size,
      maxSize: MAX_CACHE_SIZE,
      hitRate: this._stats.hits + this._stats.misses > 0
        ? ((this._stats.hits / (this._stats.hits + this._stats.misses)) * 100).toFixed(1) + "%"
        : "0%",
    };
  }
}

module.exports = new CacheManager();
