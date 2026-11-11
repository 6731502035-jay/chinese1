# 汉语 ทบทวนสอบจีน 1 (บทที่ 6–10)

เว็บแอปแฟลชการ์ดและแบบฝึกหัด ใช้บนมือถือเป็นหลัก ไม่ต้องติดตั้งอะไร ความคืบหน้าเก็บในเครื่อง

## โหมด
แฟลชการ์ด · พินอิน→ตัวจีน · ตัวจีน→พินอิน · เรียงประโยค · เติมคำ · เลข/เวลา/วันที่/อายุ/เบอร์โทร · แปลเป็นจีน · คำที่พลาดบ่อย

## อัปขึ้น GitHub Pages (ไม่ต้องใช้คำสั่ง git)
1. สร้าง repo ใหม่ที่ github.com → New (ตั้งชื่อ เช่น `chinese-flashcards`, เลือก Public)
2. กด **uploading an existing file** แล้วลากไฟล์ทั้งหมดในโฟลเดอร์นี้ (ไม่ใช่ตัว .zip) ใส่ → Commit changes
3. ไปที่ **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)` → Save
4. รอประมาณ 1 นาที จะได้ลิงก์ `https://<ชื่อผู้ใช้>.github.io/chinese-flashcards/`
5. เปิดลิงก์บนมือถือ แล้ว "เพิ่มลงหน้าจอโฮม" (iPhone: Share → Add to Home Screen / Android: เมนู ⋮ → Install app) ใช้ออฟไลน์ได้หลังเปิดครั้งแรก

## แก้ไข/เพิ่มคำ
แก้ที่ `data.js` อย่างเดียว (VOCAB = ศัพท์, SENTENCES = ประโยค, FILLS = โจทย์เติมคำ) แล้วเปลี่ยนเลข `VERSION` ใน `sw.js` (เช่น `zh-flash-v2`) เพื่อให้เครื่องโหลดไฟล์ใหม่

## ทดสอบในคอม
เปิด `index.html` ได้เลย หรือรัน `python3 -m http.server` แล้วเข้า http://localhost:8000
