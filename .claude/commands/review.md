Code review menyeluruh: security, correctness, dan performa.

Argumen opsional: $ARGUMENTS (contoh: nama file spesifik, atau "last" untuk commit terakhir)

Langkah:
1. Tentukan scope review:
   - Jika ada argumen file → baca file tersebut
   - Jika "last" → `git diff HEAD~1 HEAD`
   - Jika kosong → `git diff` (perubahan belum di-commit)
2. Review setiap perubahan berdasarkan:

**🔐 Security:**
- SQL injection, XSS, CSRF, OWASP Top 10?
- Endpoint sudah punya middleware auth + role yang tepat?
- Input di-validasi sebelum diproses?
- Data sensitif tidak masuk log atau response?

**✅ Correctness:**
- Logic sudah benar untuk semua edge case?
- Error handling ada dan bermakna?
- Tidak ada race condition atau off-by-one error?
- Return type / response format konsisten?

**⚡ Performa:**
- Ada N+1 query? (gunakan `with()` di Eloquent)
- Loop yang bisa di-optimasi?
- API call berlebihan dari frontend?
- Komponen re-render tidak perlu?

**🧹 Code Quality:**
- Ada `console.log` / `Log::info` debug tertinggal?
- Dead code atau commented-out code?
- Duplikasi yang bisa di-extract?
- Naming jelas dan konsisten?

3. Laporan akhir:
   - 🔴 HARUS DIPERBAIKI
   - 🟡 DISARANKAN DIPERBAIKI
   - 🟢 SUDAH BAIK
4. Tawarkan untuk perbaiki item 🔴 langsung
