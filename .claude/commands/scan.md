Security audit menyeluruh: OWASP Top 10 & dependency vulnerabilities.

Argumen opsional: $ARGUMENTS (contoh: "backend", "frontend", atau "deps" untuk fokus tertentu)

**A. OWASP Top 10 Check:**

1. **Injection** — cari raw query tanpa binding di controller Laravel
   ```bash
   grep -r "DB::statement\|whereRaw\|selectRaw" backend/app/Http/Controllers/
   ```
2. **Broken Auth** — cek semua route di `api.php` sudah punya middleware yang tepat
3. **Sensitive Data Exposure** — cari field password/token di response JSON
   ```bash
   grep -r "password\|secret\|token" backend/app/Http/Resources/ 2>/dev/null
   ```
4. **XXE / File Upload** — cek controller yang handle file upload (ImportController)
5. **Broken Access Control** — role middleware sudah terpasang di route sensitif?
6. **Security Misconfiguration** — `APP_DEBUG`, CORS, exposed routes
7. **XSS** — frontend: apakah ada `dangerouslySetInnerHTML`?
   ```bash
   grep -r "dangerouslySetInnerHTML" frontend/src/
   ```
8. **Insecure Deserialization** — data dari user langsung di-unserialize?
9. **Known Vulnerabilities** — cek dependency
10. **Insufficient Logging** — apakah login gagal di-log?

**B. Dependency Audit:**
```bash
cd backend && composer audit
cd frontend && npm audit
```

**C. Laporan:**
- 🔴 KRITIS — eksploitasi langsung mungkin
- 🟡 SEDANG — butuh kondisi tertentu
- 🟢 AMAN

Tawarkan fix untuk setiap temuan 🔴.
