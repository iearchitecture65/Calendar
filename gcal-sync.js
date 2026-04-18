<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <!-- ปรับปรุง viewport เพื่อล็อกการซูมและป้องกัน auto-zoom บนมือถือ -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>ระบบตารางนัดหมาย</title>
    
    <!-- Favicon (Calendar) -->
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='18' height='18' x='3' y='4' rx='2' ry='2'/><line x1='16' x2='16' y1='2' y2='6'/><line x1='8' x2='8' y1='2' y2='6'/><line x1='3' x2='21' y1='10' y2='10'/></svg>">
    
    <!-- Google Fonts: Kanit -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>
    
    <!-- html-to-image, jsPDF & JSZip -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>

    <!-- 🌟 เพิ่ม Google Identity Services สำหรับการ Login และขอ Token -->
    <script src="https://accounts.google.com/gsi/client" async defer></script>

    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: { sans: ['Kanit', 'sans-serif'] }
                }
            }
        }
    </script>

    <style>
        /* ล็อกการซูมจากการกดซ้ำ (Double tap zoom) */
        html, body { 
            font-family: 'Kanit', sans-serif; 
            touch-action: manipulation;
        }
        
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        .fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        
        .preview-title-capsule { white-space: nowrap !important; display: inline-flex !important; }
        
        /* สไตล์สำหรับการคลิกการ์ด */
        .event-card-clickable { cursor: pointer; transition: all 0.2s ease; }
        .event-card-clickable:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

        /* สไตล์สำหรับการลากและวาง (Drag & Drop) */
        .link-form-row { transition: background-color 0.2s, box-shadow 0.2s; }
        .link-form-row.dragging { opacity: 0.5; background-color: #f1f5f9; border: 1px dashed #94a3b8; }
        .drag-handle { cursor: grab; }
        .drag-handle:active { cursor: grabbing; }

        /* ระบบขอบสีแบบ Gradient สำหรับปฏิทิน */
        .calendar-day-btn {
            border: 2px solid transparent;
            background-origin: border-box;
            background-clip: padding-box, border-box;
        }

        /* ป้องกัน iOS ซูมเมื่อ Focus input (ต้องมีขนาด 16px ขึ้นไป) */
        @media screen and (max-width: 768px) {
            input, select, textarea, button {
                font-size: 16px !important;
            }
        }
    </style>
</head>
<body class="bg-[#F8FAFC] text-slate-800 font-sans min-h-screen flex justify-center overflow-x-hidden relative">

    <!-- Loading Screen -->
    <div id="loading" class="fixed inset-0 bg-slate-50/90 backdrop-blur-sm z-[200] flex flex-col items-center justify-center">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
        <p id="loading-text" class="text-slate-600 font-medium">กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Confirmation Sync Modal -->
    <div id="sync-confirm-modal" class="fixed inset-0 z-[160] items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm hidden">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 fade-in text-center border border-slate-100">
            <div class="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <i data-lucide="calendar-sync" class="w-7 h-7"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800 mb-2">ซิงค์กับ Google Calendar</h3>
            <p class="text-slate-500 text-xs mb-6 leading-relaxed">ระบบจะทำการเชื่อมต่อกับบัญชี Google ของคุณเพื่อบันทึกนัดหมาย หากมีการอัปเดตในเว็บ ปฏิทินของคุณจะอัปเดตตามอัตโนมัติ (ในขณะที่เปิดหน้านี้)</p>
            <div class="flex gap-2">
                <button onclick="closeSyncModal()" class="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">ยกเลิก</button>
                <button id="btn-confirm-gcal-sync" onclick="confirmSyncAll()" class="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm flex justify-center items-center gap-1.5"><i data-lucide="log-in" class="w-4 h-4 hidden" id="sync-btn-icon"></i> ดำเนินการต่อ</button>
            </div>
        </div>
    </div>

    <!-- Announcement Popup for Users (Z-Index: 150) -->
    <div id="announcement-modal" class="fixed inset-0 z-[150] items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm hidden">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden fade-in border border-slate-100">
            <div class="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50">
                <div class="flex items-center gap-2.5">
                    <div class="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                        <i data-lucide="megaphone" class="w-4 h-4 animate-pulse"></i>
                    </div>
                    <h2 id="annc-display-title" class="text-base font-bold text-slate-800 leading-tight">ประกาศ</h2>
                </div>
                <button onclick="closeAnnouncement()" class="p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-5 space-y-4">
                <p id="annc-display-msg" class="text-slate-600 leading-relaxed text-sm whitespace-pre-wrap"></p>
                <div id="annc-display-event" class="hidden mt-2">
                    <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> กิจกรรมที่เกี่ยวข้อง</h4>
                    <div id="annc-display-event-card"></div>
                </div>
            </div>
            <div class="p-4 border-t border-slate-100 bg-slate-50/50 text-center">
                <button onclick="closeAnnouncement()" class="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm">รับทราบ</button>
            </div>
        </div>
    </div>

    <!-- Upcoming Events Modal (Z-Index: 100) -->
    <div id="upcoming-modal" class="fixed inset-0 z-[100] items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm hidden">
        <div class="bg-white rounded-[1.5rem] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden fade-in">
            <div class="flex justify-between items-start p-5 sm:px-6 pt-6 pb-4 border-b border-slate-100">
                <div>
                    <h3 class="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2"><i data-lucide="bell" class="text-rose-500 w-5 h-5"></i> กิจกรรมล่วงหน้า</h3>
                    <p class="text-xs sm:text-sm text-slate-500 mt-1">พบทั้งหมด <span id="upcoming-total">0</span> รายการที่กำลังมาถึง</p>
                </div>
                <button onclick="closeUpcomingModal()" class="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-5 sm:px-6 pb-6 flex flex-col gap-3" id="upcoming-modal-list"></div>
        </div>
    </div>

    <!-- Admin Announcement Config Modal (Z-Index: 160) -->
    <div id="admin-announcement-modal" class="fixed inset-0 z-[160] items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm hidden">
        <div class="bg-white rounded-[1.5rem] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden fade-in">
            <div class="flex justify-between items-center p-5 sm:px-6 border-b border-slate-100">
                <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <i data-lucide="megaphone" class="text-amber-500 w-5 h-5"></i> ตั้งค่าป๊อปอัปประกาศ
                </h3>
                <button onclick="closeAdminAnnouncement()" class="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-5 sm:px-6">
                <form id="admin-annc-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-1">สถานะป๊อปอัปประกาศ</label>
                        <select id="cfg-annc-active" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                            <option value="false">ปิดใช้งาน (ไม่แสดง)</option>
                            <option value="true">เปิดใช้งาน (แสดงทุกครั้งที่เข้าเว็บ)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">หัวข้อประกาศ</label>
                        <input type="text" id="cfg-annc-title" placeholder="เช่น ประกาศสำคัญประจำวัน" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">รายละเอียดข้อความประกาศ</label>
                        <textarea id="cfg-annc-msg" rows="3" placeholder="ข้อความที่ต้องการแจ้งให้ทราบ..." class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"></textarea>
                    </div>
                    <div class="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                        <label class="block text-xs font-bold text-indigo-700 mb-1 flex items-center gap-1"><i data-lucide="link" class="w-3 h-3"></i> แนบกิจกรรมในประกาศ (เลือกได้)</label>
                        <p class="text-[10px] text-slate-500 mb-2">หากเลือกกิจกรรม ระบบจะแสดงการ์ดกิจกรรมนี้ในป๊อปอัปด้วย</p>
                        <select id="cfg-annc-event-id" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                            <option value="">-- ไม่แนบกิจกรรม (แสดงแค่ข้อความ) --</option>
                            <option value="TODAY_EVENTS">-- 🌟 แสดงกิจกรรมของวันนี้ (อัปเดตอัตโนมัติ) --</option>
                        </select>
                    </div>
                    <div class="pt-4 flex gap-2">
                        <button type="button" onclick="closeAdminAnnouncement()" class="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors">ยกเลิก</button>
                        <button type="submit" id="cfg-annc-submit-btn" class="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm">บันทึกตั้งค่า</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Maintenance / Closed Screen (Z-Index: 90) -->
    <div id="maintenance-screen" class="fixed inset-0 bg-white z-[90] flex flex-col items-center justify-center p-6 text-center hidden">
        <div class="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6">
            <i data-lucide="construction" class="w-10 h-10"></i>
        </div>
        <h1 class="text-2xl font-bold text-slate-800 mb-2">ปิดปรับปรุงระบบชั่วคราว</h1>
        <p class="text-slate-500 max-w-xs mb-8">ขออภัยในความไม่สะดวก ขณะนี้เว็บไซต์กำลังอยู่ระหว่างการปรับปรุงข้อมูล กรุณาลองใหม่อีกครั้งในภายหลัง</p>
        <button onclick="toggleAdminModal()" class="text-slate-300 hover:text-slate-500 text-sm underline transition-colors">สำหรับแอดมิน</button>
    </div>

    <!-- Main Content Container -->
    <div id="app-content" class="w-full max-w-7xl px-3 py-1 sm:p-6 lg:p-8 space-y-4 relative hidden">
        
        <!-- Admin Toggle Button & Status Panel -->
        <div class="absolute top-2 right-4 sm:top-6 sm:right-6 flex items-center gap-2 z-10">
            <div id="site-control-panel" class="hidden fade-in bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-1.5 shadow-sm flex items-center">
                <button id="admin-annc-toggle" onclick="openAdminAnnouncement()" class="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 rounded-lg text-[10px] font-bold transition-all shadow-sm flex items-center gap-1 mr-1 sm:mr-2 ml-0.5">
                    <i data-lucide="megaphone" class="w-3.5 h-3.5 sm:w-3 sm:h-3"></i> 
                    <span class="hidden sm:inline">ประกาศ</span>
                </button>
                <div class="h-4 w-px bg-slate-200 mx-1"></div>
                <span class="hidden sm:inline-block text-[10px] font-bold px-2 text-slate-500 uppercase tracking-wider">สถานะเว็บ:</span>
                <button id="site-status-toggle" onclick="handleToggleSiteStatus()" class="px-2 sm:px-3 py-1 rounded-lg text-[10px] font-bold transition-all shadow-sm">
                    กำลังโหลด...
                </button>
            </div>
            <button onclick="toggleAdminModal()" id="admin-toggle-btn" class="p-2 rounded-full transition-all text-slate-300 hover:text-slate-500 hover:bg-white" title="เข้าสู่โหมดแอดมิน">
                <i data-lucide="lock" id="admin-lock-icon" class="w-5 h-5"></i>
            </button>
        </div>

        <!-- Header -->
        <div class="flex flex-col items-center justify-center pt-0 pb-1 text-center">
            <div class="p-2 bg-white rounded-full shadow-sm mb-1.5 text-indigo-500 mx-auto">
                <i data-lucide="calendar" class="w-6 h-6 sm:w-8 sm:h-8"></i>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800 leading-none">ตารางนัดหมาย</h1>
            <p id="site-offline-warning" class="text-[10px] sm:text-xs font-bold text-rose-500 mt-1 hidden animate-pulse underline decoration-rose-200">● ขณะนี้เว็บไซต์อยู่ในสถานะปิดปรับปรุง</p>
        </div>

        <!-- RESPONSIVE GRID -->
        <div class="flex flex-col lg:flex-row gap-6 items-start">
            
            <!-- SECTION: CALENDAR (Mobile Order 1 | Desktop Order 1) -->
            <div class="w-full lg:flex-1 bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-white p-4 sm:p-6 order-1">
                <div class="flex items-center justify-between mb-4 sm:mb-6 px-2">
                    <button onclick="handlePrevMonth()" class="p-2 hover:bg-slate-100 rounded-lg text-indigo-600 transition-colors">
                        <i data-lucide="chevron-left" class="w-5 h-5"></i>
                    </button>
                    <div class="text-center overflow-hidden">
                        <h2 id="calendar-month-year" class="text-base sm:text-lg lg:text-xl font-black text-slate-800 cursor-pointer hover:text-indigo-600 transition-all leading-none whitespace-nowrap" onclick="handleGoToday()" title="กลับไปวันนี้"></h2>
                    </div>
                    <button onclick="handleNextMonth()" class="p-2 hover:bg-slate-100 rounded-lg text-indigo-600 transition-colors">
                        <i data-lucide="chevron-right" class="w-5 h-5"></i>
                    </button>
                </div>
                <div id="admin-export-buttons" class="hidden fade-in mb-4 text-center">
                    <button onclick="openPreviewModal()" class="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-[11px] font-semibold transition-colors shadow-sm w-full justify-center">
                        <i data-lucide="printer" class="w-3.5 h-3.5"></i> พรีวิว & ส่งออก (เฉพาะแอดมิน)
                    </button>
                </div>
                <div class="grid grid-cols-7 gap-1 mb-2" id="calendar-days-header"></div>
                <div class="grid grid-cols-7 gap-1" id="calendar-grid"></div>
            </div>

            <!-- SECTION: DASHBOARDS (Mobile Order 2 | Desktop Order 2) -->
            <div class="w-full lg:flex-[1.2] space-y-4 order-2 shrink-0">
                <!-- Today's Events -->
                <div class="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 p-4 sm:p-5 flex flex-col max-h-[250px] lg:max-h-none overflow-hidden text-sm">
                    <div class="flex items-center gap-2 mb-3 shrink-0">
                        <div class="p-1.5 bg-indigo-50 text-indigo-500 rounded-full">
                            <i data-lucide="calendar-check" class="w-4 h-4"></i>
                        </div>
                        <h3 class="font-bold text-slate-800 text-sm">กิจกรรมในวันนี้</h3>
                    </div>
                    <div id="today-events-container" class="space-y-2.5 overflow-y-auto pr-1"></div>
                </div>

                <!-- Upcoming Events (Compact UI with Mask) -->
                <div class="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 p-4 sm:p-5 flex flex-col cursor-pointer hover:shadow-md transition-all group" onclick="openUpcomingModal()">
                    <div class="flex items-center justify-between mb-2 shrink-0">
                        <div class="flex items-center gap-2">
                            <div class="p-1.5 bg-rose-50 text-rose-500 rounded-full">
                                <i data-lucide="bell" class="w-4 h-4"></i>
                            </div>
                            <h3 class="font-bold text-slate-800 text-sm">กิจกรรมที่กำลังมาถึง</h3>
                        </div>
                    </div>
                    <div id="upcoming-events-container" class="relative overflow-hidden min-h-[100px]"></div>
                </div>
            </div>

        </div>

        <!-- ADMIN HISTORY SECTION -->
        <div id="admin-history-section" class="hidden fade-in bg-white rounded-[1.5rem] shadow-sm border border-slate-100 p-4 sm:p-6 mt-8">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div class="flex items-center gap-2">
                    <div class="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <i data-lucide="database" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-800 text-lg">ประวัติและรายการทั้งหมด</h3>
                        <p class="text-xs text-slate-500">จัดการข้อมูล แก้ไข หรือลบรายการกิจกรรม</p>
                    </div>
                </div>
                <div class="w-full sm:w-auto relative">
                    <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                    <input type="text" id="history-search" oninput="renderAdminHistory()" placeholder="ค้นหากิจกรรม..." class="pl-10 pr-4 py-2 w-full sm:w-64 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm border-collapse">
                    <thead class="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <tr>
                            <th class="px-4 py-3 font-semibold">วันที่</th>
                            <th class="px-4 py-3 font-semibold">หัวข้อ</th>
                            <th class="px-4 py-3 font-semibold text-center">เวลา</th>
                            <th class="px-4 py-3 font-semibold text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody id="history-table-body" class="divide-y divide-slate-50"></tbody>
                </table>
            </div>
        </div>

        <!-- Footer Sync Button & Credit -->
        <div class="flex flex-col items-center pt-10 mt-6">
            <!-- 🌟 ปุ่มซิงค์ Google Calendar 🌟 -->
            <button onclick="requestSyncAll()" class="group flex items-center gap-2.5 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 mb-6">
                <i data-lucide="calendar-sync" class="w-5 h-5 group-hover:rotate-12 transition-transform"></i>
                ซิงค์ข้อมูลลง Google Calendar
            </button>
            
            <footer class="w-full text-center border-t border-slate-100 py-8">
                <div class="flex flex-col items-center gap-3">
                    <div class="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm transition-transform hover:scale-105">
                        <div class="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                        <span class="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Verified Appointment System</span>
                    </div>
                    <p class="text-slate-400 text-[10px] font-medium tracking-wide">© 2024 MORANASATECT. All rights reserved.</p>
                </div>
            </footer>
        </div>
    </div>

    <!-- Date Details Modal -->
    <div id="details-modal" class="fixed inset-0 z-[100] items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm hidden">
        <div class="bg-white rounded-[1.5rem] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden fade-in">
            <div class="flex justify-between items-start p-5 sm:px-6 pt-6 pb-4 border-b border-slate-100">
                <div>
                    <h3 id="modal-date-title" class="text-lg sm:text-xl font-bold text-slate-800"></h3>
                    <p id="modal-date-subtitle" class="text-xs sm:text-sm text-slate-500 mt-1"></p>
                </div>
                <button onclick="closeDetailsModal()" class="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <div class="flex-1 overflow-y-auto p-5 sm:px-6 pb-6 flex flex-col gap-6">
                <div class="w-full space-y-3">
                    <h4 class="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                        <i data-lucide="clock" class="w-4 h-4 text-indigo-500"></i> ตารางนัดหมาย
                    </h4>
                    <div id="modal-events-list" class="space-y-2.5"></div>
                </div>

                <!-- Admin Add/Edit Form -->
                <div id="admin-form-container" class="w-full bg-slate-50/50 p-4 sm:p-5 rounded-xl border border-slate-100 hidden transition-all">
                    <h4 id="admin-form-title" class="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mb-3">
                        <i data-lucide="plus" class="w-4 h-4 text-indigo-500"></i> เพิ่มนัดหมายใหม่
                    </h4>
                    <form id="add-event-form" class="space-y-3">
                        <input type="hidden" id="ev-id" value="">
                        <div>
                            <label class="block text-[10px] sm:text-xs font-medium text-slate-500 mb-1">หัวข้อกิจกรรม *</label>
                            <input type="text" id="ev-title" required class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                        </div>
                        <div class="flex gap-2">
                            <div class="flex-[1.5]">
                                <label class="block text-[10px] sm:text-xs font-medium text-slate-500 mb-1">วันที่เริ่มกิจกรรม *</label>
                                <input type="date" id="ev-date" required onchange="document.getElementById('ev-enddate').min = this.value" class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                            </div>
                            <div class="flex-1">
                                <label class="block text-[10px] sm:text-xs font-medium text-slate-500 mb-1">เวลา</label>
                                <input type="time" id="ev-time" value="09:00" class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <div class="flex-1">
                                <label class="block text-[10px] sm:text-xs font-medium text-slate-500 mb-1">ถึงวันที่ (ไม่บังคับ)</label>
                                <input type="date" id="ev-enddate" class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                            </div>
                            
                            <!-- Custom Color Picker Trigger -->
                            <div class="w-[100px] relative">
                                <label class="block text-[10px] sm:text-xs font-medium text-slate-500 mb-1 tracking-tighter">สีนัดหมาย</label>
                                <div id="color-picker-btn" class="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs sm:text-sm focus:outline-none cursor-pointer flex items-center justify-between shadow-sm" onclick="toggleColorPicker(event)">
                                    <div class="flex items-center gap-1.5">
                                        <div id="selected-color-preview" class="w-3.5 h-3.5 rounded-full" style="background-color: #818cf8;"></div>
                                        <span id="selected-color-text" class="text-[10px] text-slate-600 font-semibold uppercase">#818CF8</span>
                                    </div>
                                </div>
                                <input type="hidden" id="ev-color" value="#818cf8">
                            </div>
                        </div>

                        <!-- Multi-Links Support (Drag & Drop) -->
                        <div class="space-y-2">
                            <div class="flex justify-between items-center">
                                <label class="block text-[10px] sm:text-xs font-bold text-indigo-600">จัดการปุ่มกด/ลิงก์ (ลากเพื่อเรียงลำดับ)</label>
                                <button type="button" onclick="addLinkFormRow()" class="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold flex items-center gap-1 hover:bg-indigo-100 transition-colors">
                                    <i data-lucide="plus-circle" class="w-3 h-3"></i> เพิ่มลิงก์
                                </button>
                            </div>
                            <div id="links-form-container" class="space-y-2 max-h-[150px] overflow-y-auto pr-1"></div>
                        </div>

                        <div>
                            <label class="block text-[10px] sm:text-xs font-medium text-slate-500 mb-1">รายละเอียดเพิ่มเติม</label>
                            <textarea id="ev-desc" rows="2" oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px'" class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 overflow-hidden resize-none" placeholder="รายละเอียด..."></textarea>
                        </div>
                       <div class="flex gap-2">
                            <button type="button" id="cancel-edit-btn" onclick="resetForm()" class="hidden flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg text-xs sm:text-sm font-bold transition-all">
                                ยกเลิก
                            </button>
                            <button type="submit" id="submit-btn" class="flex-[2] py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs sm:text-sm font-bold transition-all shadow-sm flex justify-center items-center gap-1.5">
                                <i data-lucide="plus" class="w-4 h-4" id="submit-icon"></i> <span id="submit-text">บันทึกกิจกรรม</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- Event View Modal -->
    <div id="event-view-modal" class="fixed inset-0 z-[105] items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm hidden">
        <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden fade-in">
            <div class="flex justify-between items-center p-6 border-b border-slate-50">
                <div class="flex items-center gap-3">
                    <div id="view-ev-color-dot" class="w-3 h-3 rounded-full"></div>
                    <h3 class="text-lg font-bold text-slate-800">รายละเอียดนัดหมาย</h3>
                </div>
                <button onclick="closeEventView()" class="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                    <h2 id="view-ev-title" class="text-2xl font-black text-slate-800 leading-tight"></h2>
                    <div class="flex flex-wrap gap-3 mt-3">
                        <span class="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                            <i data-lucide="calendar" class="w-3.5 h-3.5"></i> <span id="view-ev-date"></span>
                        </span>
                        <span class="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                            <i data-lucide="clock" class="w-3.5 h-3.5"></i> <span id="view-ev-time"></span>
                        </span>
                    </div>
                </div>
                <div id="view-ev-desc-section" class="space-y-2">
                    <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">รายละเอียด</h4>
                    <p id="view-ev-desc" class="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm sm:text-base bg-slate-50 p-4 rounded-2xl border border-slate-100"></p>
                </div>
                <div id="view-ev-links-section" class="space-y-3 hidden">
                    <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ลิงก์และปุ่มกด</h4>
                    <div id="view-ev-links-container" class="flex flex-col gap-2"></div>
                </div>
                
                <!-- Google Calendar Button for Single Event -->
                <div class="pt-4 border-t border-slate-100">
                    <a id="view-ev-gcal-link" href="#" target="_blank" class="w-full flex items-center justify-center gap-2 p-3 bg-blue-50 border border-blue-200 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors shadow-sm font-bold text-sm">
                        <i data-lucide="calendar-plus" class="w-4 h-4"></i> เพิ่มนัดหมายนี้ลง Google Calendar
                    </a>
                </div>
            </div>
            <div class="p-6 border-t border-slate-50 bg-slate-50/50 text-center">
                <div class="mb-4 flex items-center justify-center gap-2 opacity-30">
                    <i data-lucide="globe" class="w-3 h-3"></i>
                    <span class="text-[9px] font-bold uppercase tracking-widest">MORANASATECT Official Service</span>
                </div>
                <button onclick="closeEventView()" class="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-sm">ปิดหน้าต่าง</button>
            </div>
        </div>
    </div>

    <!-- Admin Auth Modal (Z-Index: 110) -->
    <div id="auth-modal" class="fixed inset-0 z-[110] items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm hidden">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 fade-in text-center">
            <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <i data-lucide="user-cog" class="w-6 h-6"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800 mb-4">เข้าสู่ระบบแอดมิน</h3>
            <form id="auth-form" class="space-y-4 text-left">
                <input type="password" id="auth-password" class="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="รหัสผ่าน" required>
                <p id="auth-error" class="text-xs text-red-500 hidden text-center">รหัสผ่านไม่ถูกต้อง</p>
                <div class="flex gap-2 pt-2">
                    <button type="button" onclick="closeAuthModal()" class="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold transition-colors">ยกเลิก</button>
                    <button type="submit" class="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">ตกลง</button>
                </div>
            </form>
        </div>
    </div>

    <!-- PREVIEW MODAL -->
    <div id="preview-modal" class="fixed inset-0 z-[120] flex-col items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm hidden">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden fade-in relative">
            
            <!-- Modal Header -->
            <div class="flex justify-between items-center p-4 sm:px-6 border-b border-slate-100 shrink-0">
                <h3 class="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                    <i data-lucide="eye" class="text-indigo-500 w-5 h-5"></i> พรีวิวข้อมูลก่อนส่งออก
                </h3>
                <button onclick="closePreviewModal()" class="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><i data-lucide="x" class="w-5 h-5"></i></button>
            </div>

            <!-- Preview Toolbar -->
            <div id="preview-toolbar" class="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-x-4 gap-y-2 items-center text-sm shrink-0">
                <!-- Orientation -->
                <div class="flex items-center gap-1.5">
                    <label class="font-bold text-slate-600 text-xs">แนวกระดาษ:</label>
                    <select id="prev-orient" class="px-2 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none">
                        <option value="l">แนวนอน (Landscape)</option>
                        <option value="p">แนวตั้ง (Portrait)</option>
                    </select>
                </div>
                <!-- Mode -->
                <div class="flex items-center gap-1.5">
                    <label class="font-bold text-slate-600 text-xs">รูปแบบ:</label>
                    <select id="prev-mode" class="px-2 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none">
                        <option value="full">แบบเต็ม (มีรายละเอียดทั้งหมด)</option>
                        <option value="compact" selected>แบบย่อ (รายละเอียด 2 บรรทัด)</option>
                        <option value="title">แบบหัวข้อ (ไม่มีรายละเอียด)</option>
                    </select>
                </div>
                <!-- Month Range -->
                <div class="flex items-center gap-1.5">
                    <label class="font-bold text-slate-600 text-xs">ช่วงเดือน:</label>
                    <input type="month" id="prev-start-month" class="px-2 py-1 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none">
                    <span class="text-slate-400 text-xs font-semibold">ถึง</span>
                    <input type="month" id="prev-end-month" class="px-2 py-1 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none">
                </div>
                <!-- Apply Button -->
                <button onclick="refreshPreview()" class="px-3 py-1.5 bg-indigo-600 text-white rounded-lg shadow-sm font-bold text-xs hover:bg-indigo-700 ml-auto flex items-center gap-1 transition-colors">
                    <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> สร้างพรีวิวใหม่
                </button>
            </div>

            <!-- Page Selection Bar & Zoom Controls -->
            <div id="preview-selection-bar" class="px-4 sm:px-6 py-2 bg-white border-b border-slate-200 flex justify-between items-center shrink-0 w-full hidden flex-wrap gap-2">
                <label class="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" id="select-all-pages" checked onchange="toggleSelectAllPages(this.checked)" class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer">
                    <span class="text-sm font-bold text-slate-700">เลือกทั้งหมด (<span id="selected-count">0</span>/<span id="total-count">0</span> หน้า)</span>
                </label>
                <div class="flex items-center gap-2 sm:gap-3">
                    <span class="text-xs text-slate-400 font-medium hidden sm:inline">คลิกที่รูปภาพเพื่อเลือก/ยกเลิก</span>
                    <div class="h-4 w-px bg-slate-200 hidden sm:block"></div>
                    <div class="flex items-center gap-1.5">
                        <button onclick="changeZoom(-10)" class="p-1 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 rounded transition-colors"><i data-lucide="zoom-out" class="w-4 h-4"></i></button>
                        <input type="range" id="preview-zoom" min="30" max="250" value="90" class="w-20 sm:w-24 accent-indigo-600" oninput="updatePreviewZoom(this.value)">
                        <button onclick="changeZoom(10)" class="p-1 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 rounded transition-colors"><i data-lucide="zoom-in" class="w-4 h-4"></i></button>
                        <span id="zoom-text" class="text-xs font-bold text-slate-600 w-9 text-right">90%</span>
                    </div>
                </div>
            </div>

            <!-- Preview Images Container -->
            <div id="preview-images-container" class="flex-1 overflow-auto bg-[#cbd5e1] p-4 sm:p-8">
                <!-- รูปภาพจะถูกเพิ่มเข้ามาที่นี่โดย JS -->
            </div>

            <!-- Modal Footer Actions -->
            <div class="p-4 sm:px-6 border-t border-slate-100 bg-white flex flex-wrap justify-end gap-2 sm:gap-3 shrink-0">
                <button onclick="closePreviewModal()" class="px-4 sm:px-5 py-2 sm:py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-colors">กลับไปแก้ไข</button>
                <button onclick="downloadFromPreview('image', this)" class="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all"><i data-lucide="image" class="w-4 h-4"></i> โหลดรูป (ที่เลือก)</button>
                <button onclick="downloadFromPreview('pdf', this)" class="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all"><i data-lucide="file-down" class="w-4 h-4"></i> โหลด PDF (ที่เลือก)</button>
                <button onclick="downloadFromPreview('zip', this)" class="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all"><i data-lucide="archive" class="w-4 h-4"></i> โหลด ZIP (ที่เลือก)</button>
            </div>
        </div>
    </div>

    <!-- Color Picker Popover (Moved to body level to escape overflow clipping) -->
    <div id="color-picker-popover" class="hidden fixed bg-white border border-slate-200 shadow-2xl rounded-xl p-4 w-56 z-[99999] animate-in zoom-in-95 duration-100">
        <div class="mb-3">
            <div class="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">สีที่เคยใช้</div>
            <div id="recent-colors" class="flex flex-wrap gap-2"></div>
        </div>
        <div class="mb-4">
            <div class="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">สีแนะนำ</div>
            <div class="flex flex-wrap gap-2">
                <div class="w-6 h-6 rounded-full cursor-pointer border border-slate-200 hover:scale-110 transition-transform shadow-sm" style="background-color: #818cf8;" onclick="selectColor('#818cf8')"></div>
                <div class="w-6 h-6 rounded-full cursor-pointer border border-slate-200 hover:scale-110 transition-transform shadow-sm" style="background-color: #34d399;" onclick="selectColor('#34d399')"></div>
                <div class="w-6 h-6 rounded-full cursor-pointer border border-slate-200 hover:scale-110 transition-transform shadow-sm" style="background-color: #fbbf24;" onclick="selectColor('#fbbf24')"></div>
                <div class="w-6 h-6 rounded-full cursor-pointer border border-slate-200 hover:scale-110 transition-transform shadow-sm" style="background-color: #f87171;" onclick="selectColor('#f87171')"></div>
                <div class="w-6 h-6 rounded-full cursor-pointer border border-slate-200 hover:scale-110 transition-transform shadow-sm" style="background-color: #a78bfa;" onclick="selectColor('#a78bfa')"></div>
            </div>
        </div>
        <div class="border-t border-slate-100 pt-3">
            <div class="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">สีอื่นๆ (ดูดสี)</div>
            <label class="flex items-center gap-2 cursor-pointer border border-slate-200 p-2 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                <input type="color" id="custom-color-input" class="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent" onchange="selectColor(this.value)">
                <span class="text-xs font-bold text-slate-600">เลือกสีแบบกำหนดเอง...</span>
            </label>
        </div>
    </div>

    <!-- Hidden Renderer -->
    <div id="offscreenRenderer" style="position: fixed; top: 0; left: -3000vw; z-index: -9999; pointer-events: none; opacity: 0;"></div>

    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
        
        // --- Google Calendar Sync Module (Inlined) ---
        const CLIENT_ID = '16568745892-cj1qjnu5hu9rnp6cf3a7jopo6u60qhnl.apps.googleusercontent.com';
        const API_KEY = 'AIzaSyCbB3ExsWAm0h0rMGy9-UcebMLkslvD5x0';
        const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

        let tokenClient;
        let accessToken = null;
        let currentEventsToSync = [];
        let syncCallback = null;

        const formatToGoogleEvent = (fbEvent) => {
            const startDate = fbEvent.date.replace(/-/g, '');
            const startTime = fbEvent.time ? fbEvent.time + ':00' : '00:00:00';
            const startDateTime = `${fbEvent.date}T${startTime}+07:00`; // Asia/Bangkok

            let endDateTime = '';
            if (fbEvent.endDate && fbEvent.endDate !== fbEvent.date) {
                endDateTime = `${fbEvent.endDate}T${fbEvent.time ? fbEvent.time + ':00' : '23:59:00'}+07:00`;
            } else {
                let h = parseInt(fbEvent.time.split(':')[0] || '0');
                let m = fbEvent.time.split(':')[1] || '00';
                h = (h + 1) % 24;
                const endH = String(h).padStart(2, '0');
                endDateTime = `${fbEvent.date}T${endH}:${m}:00+07:00`;
            }

            let fullDesc = fbEvent.description ? fbEvent.description + '\n\n' : '';
            fullDesc += `[ ดูต้นฉบับที่ ${window.location.href.split('?')[0]} ]`;

            return {
                summary: fbEvent.title,
                description: fullDesc,
                start: { dateTime: startDateTime, timeZone: 'Asia/Bangkok' },
                end: { dateTime: endDateTime, timeZone: 'Asia/Bangkok' },
            };
        };

        const getSyncMap = () => {
            const mapStr = localStorage.getItem('gcal_sync_map');
            return mapStr ? JSON.parse(mapStr) : {};
        };

        const saveSyncMap = (map) => {
            localStorage.setItem('gcal_sync_map', JSON.stringify(map));
        };

        async function fetchGoogleAPI(method, endpoint, body = null) {
            const headers = {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            };
            const options = { method, headers };
            if (body) options.body = JSON.stringify(body);

            const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events${endpoint}`, options);
            if (!response.ok) {
                if(response.status === 401) {
                    accessToken = null; // Token หมดอายุ
                    throw new Error('TOKEN_EXPIRED');
                }
                throw new Error('API_ERROR');
            }
            return method !== 'DELETE' ? await response.json() : null;
        }

        async function performSync(isBackgroundSync = false) {
            if (!accessToken) return;

            if (!isBackgroundSync && syncCallback) {
                syncCallback({ status: 'loading', message: 'กำลังซิงค์ข้อมูลกับ Google Calendar...' });
            }

            const syncMap = getSyncMap();
            const currentFbIds = new Set(currentEventsToSync.map(e => e.id));
            let successCount = 0;

            try {
                for (const fbEvent of currentEventsToSync) {
                    const gEventBody = formatToGoogleEvent(fbEvent);
                    const existingGcalId = syncMap[fbEvent.id];

                    if (existingGcalId) {
                        try {
                            await fetchGoogleAPI('PUT', `/${existingGcalId}`, gEventBody);
                            successCount++;
                        } catch (e) {
                            if (e.message !== 'TOKEN_EXPIRED') {
                                const newEvent = await fetchGoogleAPI('POST', '', gEventBody);
                                syncMap[fbEvent.id] = newEvent.id;
                                successCount++;
                            } else throw e;
                        }
                    } else {
                        const newEvent = await fetchGoogleAPI('POST', '', gEventBody);
                        syncMap[fbEvent.id] = newEvent.id;
                        successCount++;
                    }
                }

                for (const fbId in syncMap) {
                    if (!currentFbIds.has(fbId)) {
                        try {
                            await fetchGoogleAPI('DELETE', `/${syncMap[fbId]}`);
                        } catch(e) {} 
                        delete syncMap[fbId];
                    }
                }

                saveSyncMap(syncMap);
                
                if (!isBackgroundSync && syncCallback) {
                    syncCallback({ status: 'success', message: `ซิงค์ข้อมูลสำเร็จ (${successCount} รายการ)! หากมีการแก้ไขในเว็บ ปฏิทินของคุณจะอัปเดตตามอัตโนมัติ` });
                }

            } catch (error) {
                console.error("Sync Error:", error);
                if (error.message === 'TOKEN_EXPIRED' && !isBackgroundSync) {
                    tokenClient.requestAccessToken();
                } else if (!isBackgroundSync && syncCallback) {
                    syncCallback({ status: 'error', message: 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล กรุณาลองใหม่' });
                }
            }
        }

        function initGoogleSync(onStatusChange) {
            syncCallback = onStatusChange;
            // Add a small delay or check to ensure Google client library is loaded
            const initClient = () => {
                if(window.google && google.accounts) {
                    tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: CLIENT_ID,
                        scope: SCOPES,
                        callback: (tokenResponse) => {
                            if (tokenResponse && tokenResponse.access_token) {
                                accessToken = tokenResponse.access_token;
                                performSync(false); 
                            } else {
                                if(syncCallback) syncCallback({ status: 'error', message: 'การยืนยันตัวตนถูกยกเลิก' });
                            }
                        },
                    });
                } else {
                    setTimeout(initClient, 500); // Retry if not loaded yet
                }
            };
            initClient();
        }

        function triggerUserSync(firebaseEvents) {
            currentEventsToSync = firebaseEvents;
            if (!tokenClient) {
                showToast("ระบบ Google Sync ยังโหลดไม่เสร็จ กรุณารอสักครู่...", true);
                return;
            }
            if (!accessToken) {
                tokenClient.requestAccessToken();
            } else {
                performSync(false);
            }
        }

        function triggerBackgroundSync(firebaseEvents) {
            if (accessToken) {
                currentEventsToSync = firebaseEvents;
                performSync(true); 
            }
        }
        // --- End of Google Calendar Sync Module ---

        const firebaseConfig = {
            apiKey: "AIzaSyD1z-AufMcsNqnbm3uUjoniuhdmDksYHMY",
            authDomain: "moranasatect.firebaseapp.com",
            projectId: "moranasatect",
            storageBucket: "moranasatect.firebasestorage.app",
            messagingSenderId: "592676930184",
            appId: "1:592676930184:web:a142d92aace735cff5153d",
            measurementId: "G-WY21FBFBPB"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        let user = null;
        let isAdmin = false;
        let siteActive = true;
        let currentDate = new Date();
        let selectedDate = null;
        let events = [];
        
        // สถานะเกี่ยวกับป๊อปอัปประกาศ
        let popupConfig = { is_active: false, event_id: '', title: '', message: '' };
        let hasShownPopup = false; 
        let isDataLoaded = { events: false, config: false };

        const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
        const engMonths = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
        const thaiDays = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
        
        // --- ระบบสี (Color System) ---
        const legacyColors = { blue: '#818cf8', green: '#34d399', orange: '#fbbf24', red: '#f87171', purple: '#a78bfa' };
        const getHexColor = (c) => legacyColors[c] || c || '#818cf8';
        let recentColors = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa']; // default recents

        // เพิ่มการประกาศตัวแปร exportColors เพื่อใช้ในการพรีวิว
        const exportColors = {
            blue: { bg: '#818cf8' },
            green: { bg: '#34d399' },
           orange: { bg: '#fbbf24' },
            red: { bg: '#f87171' },
            purple: { bg: '#a78bfa' },
            '#818cf8': { bg: '#818cf8' },
            '#34d399': { bg: '#34d399' },
            '#fbbf24': { bg: '#fbbf24' },
            '#f87171': { bg: '#f87171' },
            '#a78bfa': { bg: '#a78bfa' }
        };

        function showToast(msg, isError = false) {
            const toast = document.createElement('div');
            toast.className = `fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-xl z-[9999] text-sm font-bold text-white transition-all duration-300 transform -translate-y-full opacity-0 flex items-center gap-2 ${isError ? 'bg-rose-500' : 'bg-emerald-500'}`;
            toast.innerHTML = `<i data-lucide="${isError ? 'alert-circle' : 'check-circle'}" class="w-5 h-5"></i> ${escapeHTML(msg)}`;
            document.body.appendChild(toast);
            if(window.lucide) window.lucide.createIcons();
            setTimeout(() => toast.classList.remove('-translate-y-full', 'opacity-0'), 10);
            setTimeout(() => {
                toast.classList.add('-translate-y-full', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        // --- Global Functions ---
        window.toggleAdminModal = toggleAdminModal;
        window.handlePrevMonth = handlePrevMonth;
        window.handleNextMonth = handleNextMonth;
        window.handleGoToday = handleGoToday;
        window.openPreviewModal = openPreviewModal;
        window.refreshPreview = refreshPreview; // Exported new function
        window.openDayDetails = openDayDetails;
        window.closeDetailsModal = closeDetailsModal;
        window.handleToggleSiteStatus = handleToggleSiteStatus;
        window.renderAdminHistory = renderAdminHistory;
        window.addLinkFormRow = addLinkFormRow;
        window.handleEditEvent = handleEditEvent;
        window.resetForm = resetForm;
        window.downloadFromPreview = downloadFromPreview;
        window.closeAuthModal = closeAuthModal;
        window.closePreviewModal = closePreviewModal;
        window.handleDeleteEvent = handleDeleteEvent;
        window.openEventView = openEventView;
        window.closeEventView = closeEventView;
        window.closeAnnouncement = closeAnnouncement;
        window.openAdminAnnouncement = openAdminAnnouncement;
        window.closeAdminAnnouncement = closeAdminAnnouncement;
        window.openUpcomingModal = openUpcomingModal;
        window.closeUpcomingModal = closeUpcomingModal;

        // --- Zoom Control Logic ---
        window.currentZoom = 90; // Default zoom level for preview images
        window.changeZoom = (delta) => {
            let z = window.currentZoom + delta;
            if(z < 30) z = 30;
            if(z > 250) z = 250;
            document.getElementById('preview-zoom').value = z;
            window.updatePreviewZoom(z);
        };
        window.updatePreviewZoom = (val) => {
            window.currentZoom = parseInt(val);
            const zoomText = document.getElementById('zoom-text');
            if(zoomText) zoomText.innerText = val + '%';
            const wrappers = document.querySelectorAll('.preview-image-wrapper');
            wrappers.forEach(w => {
                w.style.width = `${val}%`;
            });
        };
        
        // 🌟 New Real-time Sync Logic Integration 🌟
        window.requestSyncAll = () => { 
            document.getElementById('sync-confirm-modal').classList.remove('hidden'); 
            document.getElementById('sync-confirm-modal').classList.add('flex');
            updateScrollLock(); 
        };
        window.closeSyncModal = () => { 
            document.getElementById('sync-confirm-modal').classList.add('hidden'); 
            document.getElementById('sync-confirm-modal').classList.remove('flex');
            updateScrollLock(); 
        };
        window.confirmSyncAll = () => { 
            const btn = document.getElementById('btn-confirm-gcal-sync');
            const icon = document.getElementById('sync-btn-icon');
            btn.disabled = true;
            icon.classList.remove('hidden');
            icon.classList.add('animate-spin');
            icon.setAttribute('data-lucide', 'loader-2');
            if(window.lucide) window.lucide.createIcons();

            // เรียกใช้โมดูลซิงค์ที่เรานำเข้ามา
            triggerUserSync(events); 
        };

        // Callback function that gcal-sync.js will call when status changes
        window.handleSyncStatus = (result) => {
            const btn = document.getElementById('btn-confirm-gcal-sync');
            const icon = document.getElementById('sync-btn-icon');
            
            if (result.status === 'success') {
                closeSyncModal();
                showToast(result.message);
                btn.disabled = false;
                icon.classList.add('hidden');
                icon.classList.remove('animate-spin');
            } else if (result.status === 'error') {
                closeSyncModal();
                showToast(result.message, true);
                btn.disabled = false;
                icon.classList.add('hidden');
                icon.classList.remove('animate-spin');
            }
        };

        // --- Color Picker Function ---
        window.toggleColorPicker = (e) => {
            if(e) e.stopPropagation();
            const btn = document.getElementById('color-picker-btn');
            const pop = document.getElementById('color-picker-popover');
            
            if (pop.classList.contains('hidden')) {
                pop.classList.remove('hidden');
                renderRecentColors();
                
                const rect = btn.getBoundingClientRect();
                pop.style.left = Math.min(rect.left, window.innerWidth - 240) + 'px'; 
                
                setTimeout(() => {
                    const popHeight = pop.offsetHeight;
                    if (rect.top > popHeight + 20) {
                        pop.style.top = (rect.top - popHeight - 8) + 'px';
                    } else {
                        pop.style.top = (rect.bottom + 8) + 'px';
                    }
                }, 0);
            } else {
                pop.classList.add('hidden');
            }
        };

        window.selectColor = (hex, saveHistory = true) => {
            document.getElementById('ev-color').value = hex;
            document.getElementById('selected-color-preview').style.backgroundColor = hex;
            document.getElementById('selected-color-text').innerText = hex.toUpperCase();
            document.getElementById('color-picker-popover').classList.add('hidden');
            document.getElementById('custom-color-input').value = hex;
            
            if(saveHistory && !recentColors.includes(hex)) {
                recentColors.unshift(hex);
                if(recentColors.length > 10) recentColors.pop();
                localStorage.setItem('morana_recent_colors', JSON.stringify(recentColors));
            }

            // อัปเดตสีใน exportColors ด้วย หากเป็นค่าใหม่
            if (hex && !exportColors[hex]) {
                exportColors[hex] = { bg: hex };
            }
        };

        function renderRecentColors() {
            const saved = localStorage.getItem('morana_recent_colors');
            if(saved) recentColors = JSON.parse(saved);
            
            const eventColors = [...new Set(events.map(e => getHexColor(e.color)))].filter(Boolean);
            eventColors.forEach(c => { if(!recentColors.includes(c)) recentColors.unshift(c); });
            recentColors = recentColors.slice(0, 10);
            
            const container = document.getElementById('recent-colors');
            if(container) {
                container.innerHTML = recentColors.map(c => `<div class="w-6 h-6 rounded-full cursor-pointer border border-slate-200 hover:scale-110 transition-transform shadow-sm" style="background-color: ${c}" onclick="selectColor('${c}')"></div>`).join('');
            }
        }
        
        // ปิด Color Picker เมื่อคลิกด้านนอก
        document.addEventListener('click', (e) => {
            const btn = document.getElementById('color-picker-btn');
            const pop = document.getElementById('color-picker-popover');
            if(btn && pop && !btn.contains(e.target) && !pop.contains(e.target)) {
                pop.classList.add('hidden');
            }
        });

        const getTodayString = () => {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        const isDateInRange = (target, start, end) => {
            if (!end) return target === start;
            return target >= start && target <= end;
        };

        const formatThaiDate = (str) => {
            if (!str) return '';
            const d = new Date(str);
            return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
        };

        const escapeHTML = (s) => (s || '').replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t] || t));

        function checkAndShowAnnouncement() {
            if (!isDataLoaded.events || !isDataLoaded.config) return; 
            if (hasShownPopup) return; 
            if (!popupConfig.is_active || String(popupConfig.is_active) === 'false') return;
            if (!siteActive && !isAdmin) return; 
            
            if (popupConfig.event_id === 'TODAY_EVENTS') {
                const todayStr = getTodayString();
                const todayEvs = events.filter(e => isDateInRange(todayStr, e.date, e.endDate));
                if (todayEvs.length === 0) return; 
            }
            
            document.getElementById('annc-display-title').innerText = popupConfig.title || 'ประกาศจากระบบ';
            document.getElementById('annc-display-msg').innerText = popupConfig.message || '';
            
            const eventSnippet = document.getElementById('annc-display-event');
            const eventCardContainer = document.getElementById('annc-display-event-card');
            
            if (popupConfig.event_id === 'TODAY_EVENTS') {
                const todayStr = getTodayString();
                const todayEvs = events.filter(e => isDateInRange(todayStr, e.date, e.endDate)).sort((a,b) => a.time.localeCompare(b.time));
                
                eventSnippet.classList.remove('hidden');
                eventCardContainer.className = ""; 
                eventCardContainer.innerHTML = todayEvs.map(linkedEv => `
                    <div onclick="closeAnnouncement(); openEventView('${linkedEv.id}');" class="bg-white border border-slate-200 rounded-xl p-3 shadow-sm cursor-pointer hover:border-indigo-300 transition-all mb-2 last:mb-0">
                        <div class="flex flex-col">
                            <div class="flex justify-between items-start mb-1">
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 shadow-sm whitespace-nowrap">${linkedEv.time} น.</span>
                            </div>
                            <h5 class="font-bold text-sm text-slate-800 leading-tight mt-1 line-clamp-2">${escapeHTML(linkedEv.title)}</h5>
                        </div>
                    </div>
                `).join('');

            } else if (popupConfig.event_id) {
                const linkedEv = events.find(e => e.id === popupConfig.event_id);
                if (linkedEv) {
                    eventSnippet.classList.remove('hidden');
                   eventCardContainer.className = "";
                    eventCardContainer.innerHTML = `
                        <div onclick="closeAnnouncement(); openEventView('${linkedEv.id}');" class="bg-white border border-slate-200 rounded-xl p-3 shadow-sm cursor-pointer hover:border-indigo-300 transition-all">
                            <div class="flex flex-col">
                                <div class="flex justify-between items-start mb-1">
                                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 shadow-sm whitespace-nowrap">${linkedEv.time} น.</span>
                                    <span class="text-[10px] font-semibold text-slate-500">${formatThaiDate(linkedEv.date)}</span>
                                </div>
                                <h5 class="font-bold text-sm text-slate-800 leading-tight mt-1 line-clamp-2">${escapeHTML(linkedEv.title)}</h5>
                            </div>
                        </div>
                    `;
                } else {
                    eventSnippet.classList.add('hidden');
                }
            } else {
                eventSnippet.classList.add('hidden');
            }

            document.getElementById('announcement-modal').classList.remove('hidden');
            document.getElementById('announcement-modal').classList.add('flex');
            hasShownPopup = true;
            if(window.lucide) window.lucide.createIcons();
            updateScrollLock();
        }

        function closeAnnouncement() {
            document.getElementById('announcement-modal').classList.add('hidden');
            document.getElementById('announcement-modal').classList.remove('flex');
            updateScrollLock();
        }

        function openAdminAnnouncement() {
            if (!isAdmin) return;
            document.getElementById('cfg-annc-active').value = popupConfig.is_active ? "true" : "false";
            document.getElementById('cfg-annc-title').value = popupConfig.title || '';
            document.getElementById('cfg-annc-msg').value = popupConfig.message || '';
            
            const evSelect = document.getElementById('cfg-annc-event-id');
            const sortedEvents = [...events].sort((a, b) => b.date.localeCompare(a.date));
            evSelect.innerHTML = `
                <option value="">-- ไม่แนบกิจกรรม (แสดงแค่ข้อความ) --</option>
                <option value="TODAY_EVENTS" ${popupConfig.event_id === 'TODAY_EVENTS' ? 'selected' : ''}>-- 🌟 แสดงกิจกรรมของวันนี้ (อัปเดตอัตโนมัติ) --</option>
            `;
            sortedEvents.forEach(e => {
                const opt = document.createElement('option');
                opt.value = e.id;
                opt.innerText = `[${e.date}] ${e.title}`;
                if (popupConfig.event_id === e.id) opt.selected = true;
                evSelect.appendChild(opt);
            });
            
            document.getElementById('admin-announcement-modal').classList.remove('hidden');
           document.getElementById('admin-announcement-modal').classList.add('flex');
            updateScrollLock();
        }

        function closeAdminAnnouncement() {
            document.getElementById('admin-announcement-modal').classList.add('hidden');
            document.getElementById('admin-announcement-modal').classList.remove('flex');
            updateScrollLock();
        }

        document.getElementById('admin-annc-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!isAdmin) return;

            const is_active = document.getElementById('cfg-annc-active').value === 'true';
            const title = document.getElementById('cfg-annc-title').value;
            const message = document.getElementById('cfg-annc-msg').value;
            const event_id = document.getElementById('cfg-annc-event-id').value;

            const submitBtn = document.getElementById('cfg-annc-submit-btn');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'กำลังบันทึก...';
            submitBtn.disabled = true;

            try {
                await setDoc(doc(db, 'settings', 'popup_config'), {
                    is_active, title, message, event_id
                });
                hasShownPopup = false; 
                closeAdminAnnouncement();
                showToast("อัปเดตตั้งค่าประกาศเรียบร้อยแล้ว");
            } catch (err) {
                showToast("บันทึกประกาศไม่สำเร็จ: " + err.message, true);
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });

        const isLinkLocked = (link, eventDate) => {
            if (!link) return false;
            if (link.status === 'always_open') return false; 
            if (link.status === 'locked') return true;        
            const todayStr = getTodayString();
            return todayStr < eventDate; 
        };

        const eventToHtml = (e, showFullDate = false, showAdminOpts = false) => {
            const hex = getHexColor(e.color);
            const links = (e.links || []).sort((a,b) => (parseInt(a.order) || 0) - (parseInt(b.order) || 0));
            const linksHtml = links.map(l => {
                const locked = isLinkLocked(l, e.date);
                if (locked) {
                    return `
                    <span onclick="event.stopPropagation()" class="px-2 py-0.5 bg-slate-100 text-slate-400 text-[9px] font-bold rounded border border-slate-200 flex items-center gap-1 shadow-sm cursor-not-allowed" title="ลิงก์จะเปิดใช้งานในวันที่นัดหมาย">
                        <i data-lucide="lock" class="w-2 h-2"></i> ${escapeHTML(l.label || 'ลิงก์')}
                    </span>
                    `;
                } else {
                    return `
                        <a href="${escapeHTML(l.url)}" target="_blank" onclick="event.stopPropagation()" class="px-2 py-0.5 bg-white/80 hover:bg-white text-[9px] font-bold text-slate-700 rounded border border-slate-200 flex items-center gap-1 transition-all shadow-sm">
                            <i data-lucide="external-link" class="w-2 h-2"></i> ${escapeHTML(l.label || 'เปิดลิงก์')}
                        </a>
                    `;
                }
            }).join('');
            
            const dateInfo = (e.endDate && e.endDate !== e.date) ? `${formatThaiDate(e.date)} ถึง ${formatThaiDate(e.endDate)}` : formatThaiDate(e.date);
            const dateHtml = (showFullDate || (e.endDate && e.endDate !== e.date)) ? `<span class="text-[10px] font-bold text-slate-500 ml-2 border-l border-slate-200 pl-2">${dateInfo}</span>` : '';

            const adminActions = (isAdmin && showAdminOpts) ? `
                <div class="flex justify-end gap-2 mt-3 pt-2" style="border-top: 1px solid ${hex}30;">
                    <button onclick="event.stopPropagation(); handleEditEvent('${e.id}')" class="px-2.5 py-1 bg-white text-indigo-600 rounded text-[9px] font-bold flex items-center gap-1 hover:bg-indigo-50 border border-indigo-100 transition-all shadow-sm"><i data-lucide="edit-3" class="w-3 h-3"></i> แก้ไข</button>
                    <button onclick="event.stopPropagation(); handleDeleteEvent('${e.id}')" class="px-2.5 py-1 bg-white text-rose-600 rounded text-[9px] font-bold flex items-center gap-1 hover:bg-rose-50 border border-rose-100 transition-all shadow-sm"><i data-lucide="trash-2" class="w-3 h-3"></i> ลบ</button>
                </div>
            ` : '';

            let descHtml = '';
            if (e.description) {
                let desc = e.description;
                let isTruncated = false;
                
                const lines = desc.split('\n');
                if (lines.length > 2) {
                    desc = lines.slice(0, 2).join('\n');
                    isTruncated = true;
                }
                if (desc.length > 120) {
                    desc = desc.substring(0, 120);
                    isTruncated = true;
                }
                
                if (isTruncated) {
                    descHtml = `<p class="text-[10px] mt-1.5 text-slate-600 whitespace-pre-wrap leading-relaxed">${escapeHTML(desc)}... <span style="color: ${hex};" class="font-bold">(แตะที่นี่เพื่ออ่านรายละเอียดเพิ่มเติม)</span></p>`;
                } else {
                    descHtml = `<p class="text-[10px] mt-1.5 text-slate-600 whitespace-pre-wrap leading-relaxed">${escapeHTML(desc)}</p>`;
                }
            }

            return `
                <div onclick="openEventView('${e.id}')" class="event-card-clickable p-3.5 rounded-xl border relative transition-all shadow-sm" style="background-color: ${hex}10; border-color: ${hex}30;">
                    <div class="flex flex-col mb-1.5">
                        <div class="flex justify-between items-center mb-1.5">
                            <div class="flex items-center">
                                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap" style="background-color: ${hex}; color: #ffffff;">${e.time} น.</span>
                                ${dateHtml}
                            </div>
                        </div>
                        <h5 class="font-bold text-[12px] leading-tight mt-0.5 line-clamp-2 text-slate-800">${escapeHTML(e.title)}</h5>
                    </div>
                    ${descHtml}
                    <div class="flex flex-wrap gap-1 mt-2.5">${linksHtml}</div>
                    ${adminActions}
                </div>
            `;
        };

        function openUpcomingModal() {
            const todayStr = getTodayString();
            const upcomingEvents = events.filter(e => e.date > todayStr).sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
            
            document.getElementById('upcoming-total').innerText = upcomingEvents.length;
            const list = document.getElementById('upcoming-modal-list');
            list.innerHTML = upcomingEvents.length ? upcomingEvents.map(e => eventToHtml(e, true, false)).join('') : `<div class="text-center py-10 text-slate-400 text-xs">ไม่มีกิจกรรมล่วงหน้า</div>`;
            
            document.getElementById('upcoming-modal').classList.remove('hidden');
           document.getElementById('upcoming-modal').classList.add('flex');
            if(window.lucide) window.lucide.createIcons();
            updateScrollLock();
        }

        function closeUpcomingModal() {
            document.getElementById('upcoming-modal').classList.add('hidden');
            document.getElementById('upcoming-modal').classList.remove('flex');
            updateScrollLock();
        }

        function renderDashboard() {
            const todayStr = getTodayString();
            const todayEvents = events.filter(e => isDateInRange(todayStr, e.date, e.endDate)).sort((a,b) => a.time.localeCompare(b.time));
            const upcomingEvents = events.filter(e => e.date > todayStr).sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

            const containerToday = document.getElementById('today-events-container');
            const containerUpcoming = document.getElementById('upcoming-events-container');

            if (containerToday) {
                containerToday.innerHTML = todayEvents.length ? todayEvents.map(e => eventToHtml(e, false, false)).join('') : `<div class="text-center py-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-[10px]">ไม่มีกิจกรรมวันนี้</div>`;
            }

            if (containerUpcoming) {
                const upcomingToShow = upcomingEvents.slice(0, 5);
                if(upcomingToShow.length > 0) {
                    containerUpcoming.innerHTML = upcomingToShow.map(e => {
                        const hex = getHexColor(e.color);
                        const dateInfo = (e.endDate && e.endDate !== e.date) ? `${e.date.split('-')[2]}/${e.date.split('-')[1]} - ${e.endDate.split('-')[2]}/${e.endDate.split('-')[1]}` : `${e.date.split('-')[2]}/${e.date.split('-')[1]}/${parseInt(e.date.split('-')[0])+543}`;
                        
                        return `
                            <div class="py-2 flex items-start gap-2.5 border-b border-slate-50 last:border-0">
                                <div class="w-2 h-2 rounded-full mt-1 shrink-0" style="background-color: ${hex}; box-shadow: 0 0 4px ${hex}80;"></div>
                                <div class="flex flex-col">
                                    <span class="text-[9px] font-bold text-slate-400 leading-none mb-1">${e.time} น. • ${dateInfo}</span>
                                    <span class="text-xs font-bold text-slate-700 leading-tight line-clamp-1">${escapeHTML(e.title)}</span>
                                </div>
                            </div>
                        `;
                    }).join('');
                    containerUpcoming.style.maskImage = 'linear-gradient(to bottom, black 30%, transparent 100%)';
                    containerUpcoming.style.webkitMaskImage = 'linear-gradient(to bottom, black 30%, transparent 100%)';
                } else {
                    containerUpcoming.innerHTML = `<div class="text-center py-4 text-slate-400 text-[10px]">ไม่มีกิจกรรมล่วงหน้า</div>`;
                    containerUpcoming.style.maskImage = 'none';
                    containerUpcoming.style.webkitMaskImage = 'none';
                }
            }
            if(window.lucide) window.lucide.createIcons();
        }

        function renderCalendar() {
            const year = currentDate.getFullYear(), month = currentDate.getMonth();
            const dim = new Date(year, month + 1, 0).getDate(), start = new Date(year, month, 1).getDay();
            const todayStr = getTodayString();

            const monthYearDisplay = document.getElementById('calendar-month-year');
            if(monthYearDisplay) monthYearDisplay.innerText = `${thaiMonths[month]} ${year + 543}`;
            
            const headerHtml = thaiDays.map(d => `<div class="py-2 text-center text-[10px] sm:text-xs font-black text-slate-400 uppercase">${d}</div>`).join('');
            const headerContainer = document.getElementById('calendar-days-header');
            if(headerContainer) headerContainer.innerHTML = headerHtml;

            let grid = '';
            for (let i = 0; i < start; i++) grid += `<div class="aspect-square"></div>`;
            for (let d = 1; d <= dim; d++) {
                const dayStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const isToday = dayStr === todayStr;
                const isSelected = dayStr === selectedDate;
                const isPast = dayStr < todayStr;
                
                const dayEvs = events.filter(e => isDateInRange(dayStr, e.date, e.endDate));
                const dayColors = [...new Set(dayEvs.map(e => getHexColor(e.color)))];
                
                let dots = '';
                if(dayEvs.length) {
                    dots = `<div class="absolute bottom-1.5 flex gap-0.5">${dayEvs.slice(0,3).map(e => `<span class="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full" style="background-color: ${getHexColor(e.color)};"></span>`).join('')}</div>`;
                }
                
                // คำนวณสไตล์ของขอบ (Border) และพื้นหลัง
                let borderInlineStyle = '';
                let bgContent = 'white'; 
                
                // ปรับแต่ง "วันนี้": ถมพื้นหลังสีดำโปร่งใส 10%
                if (isToday) {
                    bgContent = 'rgba(0, 0, 0, 0.1)'; 
                }

                if (dayColors.length === 1) {
                    // กรณีมีสีเดียว ให้ใช้สีนั้นเป็นสีขอบ
                    borderInlineStyle = `border-color: ${dayColors[0]}; background-color: ${bgContent};`;
                } else if (dayColors.length > 1) {
                    // กรณีมีหลายสี ให้ไล่เฉดสีที่ขอบ
                    const gradientColors = dayColors.join(', ');
                    borderInlineStyle = `
                        background-image: linear-gradient(${bgContent}, ${bgContent}), linear-gradient(135deg, ${gradientColors});
                    `;
                } else {
                    // กรณีไม่มีกิจกรรม: ปรับสีขอบวันนี้ให้ซอฟต์เข้ากับพื้นหลัง
                    borderInlineStyle = `border-color: ${isToday ? 'rgba(0, 0, 0, 0.05)' : '#f1f5f9'}; background-color: ${bgContent};`;
                }

                const ringClass = isSelected ? 'ring-4 ring-indigo-200 z-10' : '';
                const opacityClass = isPast && !isToday ? 'opacity-50 grayscale-[0.5]' : '';
                
                // สีข้อความ: วันนี้เป็นสีดำเข้ม (เนื่องจากพื้นหลังจาง)
                const textColor = isToday ? 'text-black font-black' : 'text-slate-700';

                grid += `
                    <button onclick="openDayDetails('${dayStr}')" 
                            style="${borderInlineStyle}"
                            class="calendar-day-btn relative aspect-square flex flex-col items-center justify-center rounded-xl transition-all 
                            ${ringClass} ${textColor} hover:brightness-95 active:scale-90 shadow-sm
                            ${opacityClass}">
                        <span class="text-xs sm:text-sm font-bold">${d}</span>
                        ${dots}
                    </button>
                `;
            }
            const gridContainer = document.getElementById('calendar-grid');
            if(gridContainer) gridContainer.innerHTML = grid;
            if(window.lucide) window.lucide.createIcons();
        }

        function renderModalDetails() {
            if (!selectedDate) return;
            document.getElementById('modal-date-title').innerText = formatThaiDate(selectedDate);
            const selEvs = events.filter(e => isDateInRange(selectedDate, e.date, e.endDate)).sort((a,b) => a.time.localeCompare(b.time));
            document.getElementById('modal-date-subtitle').innerText = selEvs.length ? `พบ ${selEvs.length} รายการ` : 'ไม่มีกิจกรรมในวันนี้';

            const container = document.getElementById('modal-events-list');
            if(!selEvs.length) {
                container.innerHTML = `<div class="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200"><p class="text-slate-400 text-xs">ว่าง! ไม่มีนัดหมาย</p></div>`;
            } else {
                container.innerHTML = selEvs.map(e => eventToHtml(e, false, true)).join('');
            }
            if(window.lucide) window.lucide.createIcons();
        }

        function renderAdminHistory() {
            if (!isAdmin) return;
            const q = (document.getElementById('history-search')?.value || '').toLowerCase();
            const filtered = events.filter(e => e.title.toLowerCase().includes(q) || (e.description||'').toLowerCase().includes(q))
                                  .sort((a,b) => b.date.localeCompare(a.date));
            
            const tbody = document.getElementById('history-table-body');
            if(tbody) {
                tbody.innerHTML = filtered.map(e => {
                    const dateDisplay = e.endDate && e.endDate !== e.date ? `${e.date.split('-').reverse().join('/')}<br><span class="text-[9px] text-slate-400">ถึง ${e.endDate.split('-').reverse().join('/')}</span>` : e.date.split('-').reverse().join('/');
                    return `
                    <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="px-4 py-3 text-[11px] font-medium text-slate-500 leading-tight">${dateDisplay}</td>
                        <td class="px-4 py-3 font-semibold text-slate-700">${escapeHTML(e.title)}</td>
                        <td class="px-4 py-3 text-center text-[11px] text-slate-500">${e.time} น.</td>
                        <td class="px-4 py-3 text-center">
                            <div class="flex justify-center gap-1">
                                <button onclick="handleEditEvent('${e.id}')" class="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-md transition-colors"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                                <button onclick="handleDeleteEvent('${e.id}')" class="p-1.5 text-red-400 hover:bg-red-50 rounded-md transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                            </div>
                        </td>
                    </tr>
                `}).join('');
            }
            if(window.lucide) window.lucide.createIcons();
        }

        function updateScrollLock() {
            const modals = ['details-modal', 'event-view-modal', 'auth-modal', 'preview-modal', 'announcement-modal', 'admin-announcement-modal', 'upcoming-modal'];
            const isAnyOpen = modals.some(id => {
                const el = document.getElementById(id);
                return el && !el.classList.contains('hidden');
            });
            
            if (isAnyOpen) {
                document.body.classList.add('overflow-hidden');
            } else {
                document.body.classList.remove('overflow-hidden');
            }
        }

        function updateSiteStatusUI() {
            const btn = document.getElementById('site-status-toggle');
            const warn = document.getElementById('site-offline-warning');
            if(!btn) return;

            // ปรับฟังก์ชันให้รองรับการแสดงสัญลักษณ์ในมือถือ
            const statusText = siteActive ? "เปิดใช้งานอยู่" : "ปิดปรับปรุง";
            const colorClass = siteActive ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-rose-50 text-rose-600 border-rose-200 animate-pulse";
            const dotColor = siteActive ? "bg-emerald-500" : "bg-rose-500";
            
            btn.className = `px-2 sm:px-3 py-1 border rounded-lg text-[10px] font-bold shadow-sm transition-all flex items-center gap-1.5 ${colorClass}`;
            btn.innerHTML = `
                <div class="w-2 h-2 rounded-full ${dotColor}"></div>
                <span class="hidden sm:inline">${statusText}</span>
            `;

            if(siteActive) {
                if(warn) warn.classList.add('hidden');
            } else {
                if(isAdmin && warn) warn.classList.remove('hidden');
            }
            checkSiteVisibility();
        }

        function checkSiteVisibility() {
            const screen = document.getElementById('maintenance-screen');
            const content = document.getElementById('app-content');
            if (!siteActive && !isAdmin) {
                if(screen) screen.classList.remove('hidden'); 
                if(content) content.classList.add('hidden');
                closeAnnouncement(); // ซ่อนประกาศอัตโนมัติหากเว็บปิดปรับปรุง
            } else {
                if(screen) screen.classList.add('hidden'); 
                if(content) content.classList.remove('hidden');
            }
        }

        function toggleAdminModal() {
            if (isAdmin) { 
                isAdmin = false; 
                updateAdminUI(); 
            } else { 
                const passInput = document.getElementById('auth-password');
                if(passInput) passInput.value = '';
                const authErr = document.getElementById('auth-error');
                if(authErr) authErr.classList.add('hidden');
                document.getElementById('auth-modal').classList.remove('hidden');
                document.getElementById('auth-modal').classList.add('flex');
                updateScrollLock();
            }
        }

        function openEventView(eventId) {
            const e = events.find(item => item.id === eventId);
            if (!e) return;

            document.getElementById('view-ev-title').innerText = e.title;
            document.getElementById('view-ev-date').innerText = formatThaiDate(e.date) + ((e.endDate && e.endDate !== e.date) ? ` ถึง ${formatThaiDate(e.endDate)}` : '');
            document.getElementById('view-ev-time').innerText = e.time + ' น.';
            
            const descEl = document.getElementById('view-ev-desc');
            const descSection = document.getElementById('view-ev-desc-section');
            if (e.description) {
                descEl.innerText = e.description;
                descSection.classList.remove('hidden');
            } else {
                descSection.classList.add('hidden');
            }

            const colorDot = document.getElementById('view-ev-color-dot');
            if(colorDot) {
                colorDot.className = `w-3 h-3 rounded-full`;
                colorDot.style.backgroundColor = getHexColor(e.color);
            }

            const linksContainer = document.getElementById('view-ev-links-container');
            const linksSection = document.getElementById('view-ev-links-section');
            const sortedLinks = (e.links || []).sort((a,b) => (parseInt(a.order) || 0) - (parseInt(b.order) || 0));
            
            if (sortedLinks.length > 0) {
                linksContainer.innerHTML = sortedLinks.map(l => {
                    const locked = isLinkLocked(l, e.date);
                    if (locked) {
                        return `
                            <div class="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-not-allowed shadow-sm opacity-70" title="ลิงก์จะเปิดใช้งานเมื่อถึงวันที่นัดหมาย">
                                <div class="flex items-center gap-2">
                                    <i data-lucide="lock" class="w-4 h-4 text-slate-400"></i>
                                    <span class="font-bold text-slate-400">${escapeHTML(l.label || 'ลิงก์')} <span class="text-[10px] font-normal">(ยังไม่ถึงกำหนด)</span></span>
                                </div>
                            </div>
                        `;
                    } else {
                        return `
                            <a href="${escapeHTML(l.url)}" target="_blank" class="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/30 transition-all group shadow-sm">
                                <span class="font-bold text-slate-700 group-hover:text-indigo-600">${escapeHTML(l.label || 'เปิดลิงก์')}</span>
                                <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 group-hover:text-indigo-500"></i>
                            </a>
                        `;
                    }
                }).join('');
                linksSection.classList.remove('hidden');
            } else {
                linksSection.classList.add('hidden');
            }

            // Google Calendar Single URL Generate
            const startD = e.date.replace(/-/g, '');
            const startT = e.time ? e.time.replace(':', '') + '00' : '000000';
            let endT = '';
            if (e.time) {
                endT = String((parseInt(e.time.split(':')[0]) + 1) % 24).padStart(2, '0') + e.time.split(':')[1] + '00';
            } else {
                endT = '235900';
            }
            const endD = (e.endDate ? e.endDate.replace(/-/g, '') : startD);
            
            let fullDesc = e.description ? e.description + '\n\n' : '';
            fullDesc += `[ ดูต้นฉบับที่ ${window.location.href.split('?')[0]} ]`;

            const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${startD}T${startT}/${endD}T${endT}&details=${encodeURIComponent(fullDesc)}&ctz=Asia/Bangkok`;
            
            const gcalLink = document.getElementById('view-ev-gcal-link');
            if (gcalLink) gcalLink.href = googleCalUrl;

            document.getElementById('event-view-modal').classList.remove('hidden');
            document.getElementById('event-view-modal').classList.add('flex');
            if(window.lucide) window.lucide.createIcons();
            updateScrollLock();
        }

        function closeEventView() {
            document.getElementById('event-view-modal').classList.add('hidden');
            document.getElementById('event-view-modal').classList.remove('flex');
            updateScrollLock();
        }

        function addLinkFormRow(data = { label: '', url: '', status: 'auto' }) {
            const container = document.getElementById('links-form-container');
            if(!container) return;
            const row = document.createElement('div');
            
            row.className = "link-form-row grid grid-cols-12 gap-2 bg-white p-2 rounded-lg border border-slate-100 shadow-sm mb-2 fade-in items-center";
            row.draggable = true;
            row.innerHTML = `
                <div class="col-span-1 flex items-center justify-center text-slate-300 hover:text-slate-50 drag-handle" title="ลากเพื่อเรียงลำดับ">
                    <i data-lucide="grip-vertical" class="w-4 h-4"></i>
                </div>
                <div class="col-span-3"><input type="text" placeholder="ชื่อปุ่ม" value="${escapeHTML(data.label||'')}" class="link-label w-full px-2 py-1 text-[10px] border border-slate-100 rounded bg-slate-50 focus:bg-white outline-none"></div>
                <div class="col-span-4"><input type="url" placeholder="URL..." value="${data.url||''}" class="link-url w-full px-2 py-1 text-[10px] border border-slate-100 rounded bg-slate-50 focus:bg-white outline-none"></div>
                <div class="col-span-3">
                    <select class="link-status w-full px-1 py-1 text-[9px] border border-slate-100 rounded bg-slate-50 outline-none text-slate-600">
                        <option value="auto" ${data.status === 'auto' || !data.status ? 'selected' : ''}>เปิดตามวัน</option>
                        <option value="always_open" ${data.status === 'always_open' ? 'selected' : ''}>เปิดเสมอ</option>
                        <option value="locked" ${data.status === 'locked' ? 'selected' : ''}>ล็อกไว้</option>
                    </select>
                </div>
                <div class="col-span-1 flex items-center justify-center"><button type="button" onclick="this.parentElement.parentElement.remove(); updateScrollLock();" class="text-red-400 hover:text-red-600 transition-colors"><i data-lucide="minus-circle" class="w-4 h-4"></i></button></div>
            `;
            
            row.addEventListener('dragstart', () => {
                row.classList.add('dragging');
            });
            row.addEventListener('dragend', () => {
                row.classList.remove('dragging');
            });

            container.appendChild(row);
            if(window.lucide) window.lucide.createIcons();
        }

        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.link-form-row:not(.dragging)')];
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }

        document.addEventListener('DOMContentLoaded', () => {
            const linksContainer = document.getElementById('links-form-container');
            if(linksContainer) {
                linksContainer.addEventListener('dragover', e => {
                    e.preventDefault();
                    const afterElement = getDragAfterElement(linksContainer, e.clientY);
                    const draggable = document.querySelector('.dragging');
                    if(draggable) {
                        if (afterElement == null) {
                            linksContainer.appendChild(draggable);
                        } else {
                            linksContainer.insertBefore(draggable, afterElement);
                        }
                    }
                });
            }
        });

        function openDayDetails(ds) { 
            selectedDate = ds; 
            const ed = document.getElementById('ev-enddate');
            if(ed) ed.min = ds;
            const evDate = document.getElementById('ev-date');
            if(evDate) evDate.value = ds; 
            renderModalDetails(); 
            renderCalendar();
            document.getElementById('details-modal').classList.remove('hidden'); 
            document.getElementById('details-modal').classList.add('flex'); 
            if(window.lucide) window.lucide.createIcons();
            updateScrollLock();
        }

        function handleEditEvent(id) {
            const e = events.find(item => item.id === id);
            if (!e) return;
            
            if(document.getElementById('details-modal').classList.contains('hidden')) {
                openDayDetails(e.date);
            } else {
                selectedDate = e.date;
            }

            document.getElementById('ev-id').value = e.id;
            document.getElementById('ev-title').value = e.title;
            document.getElementById('ev-date').value = e.date;
            document.getElementById('ev-time').value = e.time;
            document.getElementById('ev-enddate').value = e.endDate || '';
            
            selectColor(getHexColor(e.color), false);
            
            document.getElementById('ev-desc').value = e.description || '';
            setTimeout(() => {
                const descEl = document.getElementById('ev-desc');
               if (descEl) {
                    descEl.style.height = 'auto';
                    descEl.style.height = descEl.scrollHeight + 'px';
                }
            }, 10);
            
            const container = document.getElementById('links-form-container');
            if(container) {
                container.innerHTML = '';
                (e.links || []).sort((a,b) => (parseInt(a.order)||0) - (parseInt(b.order)||0)).forEach(l => addLinkFormRow(l));
            }

            const formContainer = document.getElementById('admin-form-container');
            formContainer.classList.remove('border-slate-100', 'bg-slate-50/50');
            formContainer.classList.add('border-amber-400', 'bg-amber-50/30', 'ring-4', 'ring-amber-50');

            const formTitle = document.getElementById('admin-form-title');
            if(formTitle) formTitle.innerHTML = '<i data-lucide="edit-3" class="w-4 h-4 text-amber-500"></i> <span class="text-amber-700">แก้ไขข้อมูลนัดหมาย</span>';
            
            const subBtn = document.getElementById('submit-btn');
            if (subBtn) {
                subBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
                subBtn.classList.add('bg-amber-500', 'hover:bg-amber-600');
            }

            const subTxt = document.getElementById('submit-text'), subIc = document.getElementById('submit-icon');
            if(subTxt) subTxt.innerText = 'อัปเดตข้อมูล';
            if(subIc) subIc.setAttribute('data-lucide', 'save');
            
            document.getElementById('cancel-edit-btn').classList.remove('hidden');
            document.getElementById('admin-form-container').classList.remove('hidden');
            document.getElementById('admin-form-container').scrollIntoView({ behavior: 'smooth', block: 'center' });

            if(window.lucide) window.lucide.createIcons();
        }

        function resetForm() {
            const form = document.getElementById('add-event-form');
            if(form) form.reset();
            document.getElementById('ev-id').value = '';
            
            const evDate = document.getElementById('ev-date');
            if (evDate && selectedDate) evDate.value = selectedDate;

            selectColor('#818cf8', false);

            const linksContainer = document.getElementById('links-form-container');
            if(linksContainer) linksContainer.innerHTML = '';
            
            const descEl = document.getElementById('ev-desc');
            if(descEl) descEl.style.height = 'auto';
            
            const formContainer = document.getElementById('admin-form-container');
           if(formContainer) {
                formContainer.classList.add('border-slate-100', 'bg-slate-50/50');
                formContainer.classList.remove('border-amber-400', 'bg-amber-50/30', 'ring-4', 'ring-amber-50');
            }

            const formTitle = document.getElementById('admin-form-title');
            if(formTitle) formTitle.innerHTML = '<i data-lucide="plus" class="w-4 h-4 text-indigo-500"></i> เพิ่มนัดหมายใหม่';
            
            const subBtn = document.getElementById('submit-btn');
            if (subBtn) {
                subBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
                subBtn.classList.remove('bg-amber-500', 'hover:bg-amber-600');
            }

            const subTxt = document.getElementById('submit-text'), subIc = document.getElementById('submit-icon');
            if(subTxt) subTxt.innerText = 'บันทึกกิจกรรม';
            if(subIc) subIc.setAttribute('data-lucide', 'plus');
            
            document.getElementById('cancel-edit-btn').classList.add('hidden');
            if(window.lucide) window.lucide.createIcons();
        }

        function updateAdminUI() {
            const btn = document.getElementById('admin-toggle-btn'), icon = document.getElementById('admin-lock-icon');
            const form = document.getElementById('admin-form-container'), exp = document.getElementById('admin-export-buttons');
            const hist = document.getElementById('admin-history-section'), ctrl = document.getElementById('site-control-panel');
            const warn = document.getElementById('site-offline-warning');
            const anncToggle = document.getElementById('admin-annc-toggle');
            
            if (isAdmin) {
                if(btn) btn.className = "p-2 rounded-full bg-indigo-600 text-white shadow-md z-10 transition-all";
                if(icon) icon.setAttribute('data-lucide', 'unlock');
                if(form) form.classList.remove('hidden'); 
                if(exp) exp.classList.remove('hidden'); 
                if(hist) hist.classList.remove('hidden'); 
                if(ctrl) ctrl.classList.remove('hidden');
                if(anncToggle) anncToggle.classList.remove('hidden'); 
                if(!siteActive && warn) warn.classList.remove('hidden');
                renderAdminHistory();
            } else {
                if(btn) btn.className = "p-2 rounded-full text-slate-300 hover:text-slate-500 hover:bg-white z-10 transition-all";
                if(icon) icon.setAttribute('data-lucide', 'lock');
                if(form) form.classList.add('hidden'); 
                if(exp) exp.classList.add('hidden'); 
                if(hist) hist.classList.add('hidden'); 
                if(ctrl) ctrl.classList.add('hidden'); 
                if(anncToggle) anncToggle.classList.add('hidden'); 
                if(warn) warn.classList.add('hidden');
                resetForm();
            }
            if(window.lucide) window.lucide.createIcons();
            renderModalDetails();
            updateSiteStatusUI();
            checkSiteVisibility();
            updateScrollLock();
        }

        async function handleToggleSiteStatus() {
            if(!isAdmin) return;
            const newStatus = !siteActive;
            try {
                await setDoc(doc(db, 'settings', 'site_config'), { is_active: newStatus });
                showToast(newStatus ? 'เปิดใช้งานเว็บไซต์แล้ว' : 'ปิดปรับปรุงเว็บไซต์ชั่วคราว');
            } catch (e) { showToast("เกิดข้อผิดพลาด", true); }
        }

        const safeColor = (c) => (c && exportColors[c]) ? c : 'blue';

        // --- NEW PREVIEW GENERATOR (Multi-Month, Smart Highlight, Orientation, Compact Grid) ---
        const generateExportPagesHTML = () => {
            const orient = document.getElementById('prev-orient').value;
            const mode = document.getElementById('prev-mode').value;
            const startMonthVal = document.getElementById('prev-start-month').value;
            const endMonthVal = document.getElementById('prev-end-month').value;

            const startY = parseInt(startMonthVal.split('-')[0]);
            const startM = parseInt(startMonthVal.split('-')[1]) - 1;
            const endY = parseInt(endMonthVal.split('-')[0]);
            const endM = parseInt(endMonthVal.split('-')[1]) - 1;

            const allPagesHtml = [];
            let globalPageNum = 1;

            // Generate list of months to render
            const monthsToRender = [];
            let currY = startY;
            let currM = startM;
            while (currY < endY || (currY === endY && currM <= endM)) {
                monthsToRender.push({ year: currY, month: currM });
                currM++;
                if (currM > 11) { currM = 0; currY++; }
            }

            const now = new Date();
            const tsStr = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()+543} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} น.`;

            // Setup dimensions based on orientation
            const canvasW = orient === 'l' ? 1123 : 794;
            const canvasH = orient === 'l' ? 794 : 1123;
            // ปรับเพิ่มความสูงสูงสุดของเนื้อหาให้ลงมาเกือบชิด Footer
            const contentMaxH = orient === 'l' ? 600 : 940; 

            for (const { year: y, month: m } of monthsToRender) {
                const dim = new Date(y, m + 1, 0).getDate();
                const start = new Date(y, m, 1).getDay();
                const monthStartStr = `${y}-${String(m+1).padStart(2,'0')}-01`;
                const monthEndStr = `${y}-${String(m+1).padStart(2,'0')}-${String(dim).padStart(2,'0')}`;

                // Filter events that OVERLAP with this month
                const monthEvents = events.filter(e => {
                    const eStart = e.date;
                    const eEnd = e.endDate || e.date;
                    return (eStart <= monthEndStr && eEnd >= monthStartStr);
                }).sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

                // Helper to get all dates of an event within THIS month
                const getEventDatesInMonth = (e) => {
                    const dStart = new Date(e.date);
                    const dEnd = new Date(e.endDate || e.date);
                    const dates = [];
                    for(let d = new Date(dStart); d <= dEnd; d.setDate(d.getDate() + 1)) {
                        if(d.getFullYear() === y && d.getMonth() === m) {
                            dates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
                        }
                    }
                    return dates;
                };

                // Grid generator for THIS month, given active dates on current page
                const generateGridForPage = (activeDatesSet) => {
                    const isPortrait = orient === 'p';
                    const itemSize = isPortrait ? 28 : 32;
                    const fontSize = isPortrait ? 12 : 14;
                    const rowH = isPortrait ? 32 : 38;

                    let gridHtml = '';
                    for (let i = 0; i < start; i++) gridHtml += `<div></div>`;
                    for (let d = 1; d <= dim; d++) {
                        const dayStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                        const dayEvs = events.filter(e => isDateInRange(dayStr, e.date, e.endDate));

                        let innerStyle = `width: ${itemSize}px; height: ${itemSize}px; display: flex; align-items: center; justify-content: center; margin: 0 auto; border-radius: 50%;`;
                        let textStyle = `color: #64748b; font-weight: 600; font-size: ${fontSize}px;`;

                        if (dayEvs.length > 0) {
                            const c = safeColor(dayEvs[0].color);
                            const isActiveOnPage = activeDatesSet.has(dayStr);

                            if (isActiveOnPage) {
                                innerStyle += ` background-color: ${exportColors[c].bg}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);`;
                                textStyle = `color: white; font-weight: 800; font-size: ${fontSize}px;`;
                            } else {
                                innerStyle += ` background-color: ${exportColors[c].bg}20; border: 1px dashed ${exportColors[c].bg}40;`;
                                textStyle = `color: ${exportColors[c].bg}; font-weight: 400; font-size: ${fontSize}px; opacity: 0.3;`;
                            }
                        }

                        gridHtml += `
                            <div style="display: flex; justify-content: center; align-items: center; height: ${rowH}px;">
                                <div style="${innerStyle}">
                                    <span style="${textStyle}">${d}</span>
                                </div>
                            </div>
                        `;
                    }
                    return gridHtml;
                };

                const renderEventHtmlEx = (e, modeParam) => {
                    let descHtml = '';
                    const c = safeColor(e.color);
                    const dateStrDisplay = (e.endDate && e.endDate !== e.date)
                        ? `${e.date.split('-').reverse().join('/')} ถึง ${e.endDate.split('-').reverse().join('/')}`
                        : e.date.split('-').reverse().join('/');

                    if ((modeParam === 'full' || modeParam === 'compact') && e.description) {
                        let desc = e.description;
                        let isTruncated = false;
                        
                        if (modeParam === 'compact') {
                            const lines = desc.split('\n');
                            if (lines.length > 2) { desc = lines.slice(0, 2).join('\n'); isTruncated = true; }
                            if (desc.length > 150) { desc = desc.substring(0, 150); isTruncated = true; }
                        }

                        let moreText = isTruncated ? '... <span style="color: ' + exportColors[c].bg + '; font-weight: bold;">(อ่านต่อในเว็บไซต์)</span>' : '';
                        descHtml = `<div style="font-size: 12px; color: #475569; line-height: 1.5; white-space: pre-wrap; margin-top: 4px; word-break: break-word;">${escapeHTML(desc)}${moreText}</div>`;
                    }

                    return `
                    <div style="margin-bottom: ${modeParam === 'full' ? '16px' : '10px'}; border-left: 4px solid ${exportColors[c].bg}; padding-left: 12px; page-break-inside: avoid; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 12px; color: #64748b; font-weight: 800; margin-bottom: 2px;">${e.time} น. (${dateStrDisplay})</div>
                        <div style="font-weight: 800; font-size: 16px; color: #1e293b; line-height: 1.2; word-break: break-word;">${escapeHTML(e.title)}</div>
                        ${descHtml}
                    </div>
                    `;
                };

                const renderBasePage = (eventsHtml, pageDates, pageNumLocal, totalPagesLocal) => {
                    const gridH = generateGridForPage(pageDates);

                    // Adjust layout based on orientation (Both Landscape and Portrait have Calendar on LEFT, Content on RIGHT)
                    let flexLayout = '';
                    let calendarWidth = '';
                    let calPadding = '20px';
                    let titleScale = 1;

                    if (orient === 'l') {
                        flexLayout = 'flex-direction: row; gap: 40px;';
                        calendarWidth = 'width: 380px; height: fit-content;';
                    } else {
                        // Portrait: Reduce gap and calendar width to fit 794px total width
                        flexLayout = 'flex-direction: row; gap: 24px;';
                        calendarWidth = 'width: 260px; height: fit-content;';
                        calPadding = '16px';
                        titleScale = 0.85; // Slightly scale down title elements in Portrait
                    }

                    return `
                    <div id="capture-layout-wrapper-${globalPageNum++}" style="width: ${canvasW}px; height: ${canvasH}px; background-color: #f8fafc; padding: 40px; font-family: 'Kanit', sans-serif; display: flex; flex-direction: column; box-sizing: border-box;">
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800;900&display=swap'); 
                            * { font-family: 'Kanit', sans-serif !important; }
                        </style>
                        <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: ${orient === 'l' ? '25px' : '20px'}; transform: scale(${titleScale}); transform-origin: top center;">
                            <div class="preview-title-capsule" style="background-color: #4b5563; color: white; border-radius: 999px; padding: 10px 60px; margin-bottom: 8px;">
                                <span style="font-size: 32px; font-weight: 800; line-height: 1;">ตารางนัดหมาย</span>
                            </div>
                            <span style="font-size: 20px; font-weight: 600; color: #4b5563;">เดือน${thaiMonths[m]} ${y + 543} ${totalPagesLocal > 1 ? '(หน้า ' + pageNumLocal + '/' + totalPagesLocal + ')' : ''}</span>
                        </div>
                        <div style="display: flex; ${flexLayout} flex: 1; overflow: hidden;">
                            <!-- ปฏิทิน -->
                            <div style="${calendarWidth} flex-shrink: 0; background: white; padding: ${calPadding}; border-radius: 24px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); display: flex; flex-direction: column;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; background: #94a3b8; padding: 12px 20px; border-radius: 12px; color: white; font-weight: 900; font-size: ${orient === 'l' ? '18px' : '15px'}; letter-spacing: 1px;">
                                    <span style="text-transform: uppercase;">${engMonths[m]}</span>
                                    <span>${y}</span>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: ${orient === 'l' ? '14px' : '12px'}; font-weight: 800; color: #cbd5e1; margin-bottom: 8px;">
                                    <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(7, 1fr); row-gap: 4px; align-content: start;">
                                    ${gridH}
                                </div>
                            </div>
                            
                            <!-- รายการกิจกรรม -->
                            <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                                <h3 style="font-size: ${orient === 'l' ? '20px' : '18px'}; font-weight: 800; color: #1e293b; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">รายการกิจกรรม</h3>
                                <div style="flex: 1; overflow: visible;">
                                    ${eventsHtml || '<div style="color: #94a3b8; font-weight: 500; font-size: 14px;">ไม่มีรายการกิจกรรมในเดือนนี้</div>'}
                                </div>
                            </div>
                        </div>
                        
                        <!-- Footer -->
                        <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; margin-top: auto;">
                            <div style="color: #cbd5e1; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Verified Appointment System • MORANASATECT</div>
                            <div style="color: #94a3b8; font-size: 10px; font-weight: bold;">ข้อมูลเมื่อ: ${tsStr}</div>
                        </div>
                    </div>`;
                };

                // Pagination logic for THIS month
                const measureDiv = document.createElement('div');
                // แยกการกำหนด Style เพื่อป้องกันการรบกวนจากคลาสหลักของเว็บ ทำให้วัดความสูงได้เป๊ะขึ้น
                measureDiv.style.cssText = `
                    width: ${orient === 'l' ? '623px' : '430px'};
                    position: absolute;
                    visibility: hidden;
                    top: -9999px;
                    left: -9999px;
                    font-family: 'Kanit', sans-serif;
                    box-sizing: border-box;
                    padding-right: 5px;
                `;
                document.body.appendChild(measureDiv);

                const pagesData = [];
                let currentPageEventsHtml = '';
                let currentPageDates = new Set();
                let currentHeight = 0;

                if (monthEvents.length === 0) {
                     pagesData.push({ html: '', dates: new Set() });
                } else {
                    for (const e of monthEvents) {
                        const evHtml = renderEventHtmlEx(e, mode);
                        measureDiv.innerHTML = evHtml;
                        const evHeight = measureDiv.offsetHeight + (mode === 'full' ? 16 : 10);

                        if (currentHeight + evHeight > contentMaxH && currentPageEventsHtml !== '') {
                            pagesData.push({ html: currentPageEventsHtml, dates: new Set(currentPageDates) });
                            currentPageEventsHtml = evHtml;
                            const eDates = getEventDatesInMonth(e);
                            currentPageDates = new Set(eDates);
                            currentHeight = evHeight;
                        } else {
                            currentPageEventsHtml += evHtml;
                            const eDates = getEventDatesInMonth(e);
                            eDates.forEach(d => currentPageDates.add(d));
                            currentHeight += evHeight;
                        }
                    }
                    if (currentPageEventsHtml !== '') {
                        pagesData.push({ html: currentPageEventsHtml, dates: currentPageDates });
                    }
                }
                document.body.removeChild(measureDiv);

                const totalPagesLocal = pagesData.length;
                pagesData.forEach((data, idx) => {
                    allPagesHtml.push(renderBasePage(data.html, data.dates, idx + 1, totalPagesLocal));
                });
            }

            return { pagesHtml: allPagesHtml, orient };
        };

        window.cachedExportDataURLs = []; 

        window.toggleSelectAllPages = (checked) => {
            const checkboxes = document.querySelectorAll('.page-checkbox');
            checkboxes.forEach(cb => cb.checked = checked);
            window.updateSelectedCount();
        };

        window.updateSelectedCount = () => {
            const checkboxes = document.querySelectorAll('.page-checkbox');
            const selected = Array.from(checkboxes).filter(cb => cb.checked).length;
            const total = checkboxes.length;
            
            const countEl = document.getElementById('selected-count');
            const totalEl = document.getElementById('total-count');
            const selectAllCb = document.getElementById('select-all-pages');
            
            if(countEl) countEl.innerText = selected;
            if(totalEl) totalEl.innerText = total;
            if(selectAllCb) selectAllCb.checked = (selected === total && total > 0);

            // Highlight images based on selection
            checkboxes.forEach(cb => {
                const img = cb.closest('.relative').querySelector('img');
                if (cb.checked) {
                    img.classList.add('ring-4', 'ring-indigo-500');
                    img.classList.remove('border-transparent', 'opacity-60');
                } else {
                    img.classList.remove('ring-4', 'ring-indigo-500');
                    img.classList.add('border-transparent', 'opacity-60');
                }
            });
        };

        async function openPreviewModal() {
            // Set initial dates to current month if empty
            const startInput = document.getElementById('prev-start-month');
            const endInput = document.getElementById('prev-end-month');
            if(!startInput.value) {
                const mStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}`;
                startInput.value = mStr;
                endInput.value = mStr;
            }
            
            document.getElementById('preview-modal').classList.remove('hidden');
            document.getElementById('preview-modal').classList.add('flex');
            updateScrollLock();
            await refreshPreview();
        }

        async function refreshPreview() {
            const loading = document.getElementById('loading');
            const previewContainer = document.getElementById('preview-images-container');
            const selectionBar = document.getElementById('preview-selection-bar');
            
            document.getElementById('loading-text').innerText = "กำลังสร้างภาพพรีวิว (อาจใช้เวลาสักครู่)...";
            loading.classList.remove('hidden');
            if(previewContainer) previewContainer.innerHTML = ''; 
            if(selectionBar) selectionBar.classList.add('hidden');
            window.cachedExportDataURLs = [];
              
            try {
                await document.fonts.ready;
                // Allow UI to update loading state
                await new Promise(r => setTimeout(r, 50));
                
                const { pagesHtml, orient } = generateExportPagesHTML();
                const renderer = document.getElementById('offscreenRenderer');
                  
                for (let i = 0; i < pagesHtml.length; i++) {
                    renderer.innerHTML = pagesHtml[i];
                    const wrap = renderer.querySelector(`[id^="capture-layout-wrapper"]`);
                    void wrap.offsetWidth; 
                    await new Promise(r => setTimeout(r, 100)); // Render tick
                      
                    const dataUrl = await htmlToImage.toPng(wrap, {
                        quality: 1, 
                        pixelRatio: 2, 
                        cacheBust: true, 
                        useCORS: true,
                        filter: (node) => {
                            if (node.tagName === 'LINK' || node.tagName === 'STYLE') {
                                try { if (node.sheet && node.sheet.cssRules) return true; } catch (e) { return false; }
                            }
                            return true;
                        }
                    });
                      
                    window.cachedExportDataURLs.push(dataUrl);
                      
                    // Create wrapper for selectable image
                    const wrapper = document.createElement('div');
                    wrapper.className = "relative group cursor-pointer preview-image-wrapper mx-auto mb-6 shrink-0";
                    wrapper.style.width = `${window.currentZoom || 90}%`;
                    wrapper.style.transition = "width 0.2s ease-out";
                    wrapper.onclick = (e) => {
                        if(e.target.tagName !== 'INPUT') {
                            const cb = wrapper.querySelector('input[type="checkbox"]');
                            cb.checked = !cb.checked;
                            window.updateSelectedCount();
                        }
                    };

                    const img = document.createElement('img');
                    img.src = dataUrl;
                    img.className = "w-full h-auto rounded-xl shadow-lg border-4 transition-all duration-200 ring-4 ring-indigo-500 border-transparent bg-white";
                    
                    const checkboxWrapper = document.createElement('div');
                    checkboxWrapper.className = "absolute top-4 left-4 bg-white/90 backdrop-blur rounded-lg py-1.5 px-2.5 shadow-md flex items-center gap-2 border border-slate-200";
                    checkboxWrapper.innerHTML = `
                        <input type="checkbox" checked value="${i}" class="page-checkbox w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer" onchange="updateSelectedCount()">
                        <span class="text-xs font-bold text-slate-700">หน้า ${i+1}</span>
                    `;

                    wrapper.appendChild(img);
                    wrapper.appendChild(checkboxWrapper);
                    
                    if(previewContainer) previewContainer.appendChild(wrapper);
                }
                  
                if (selectionBar && pagesHtml.length > 0) {
                    selectionBar.classList.remove('hidden');
                    // Reset "Select All" to checked state after new preview is generated
                    const selectAllCb = document.getElementById('select-all-pages');
                    if (selectAllCb) selectAllCb.checked = true;
                    window.updateSelectedCount();
                }

                if(window.lucide) window.lucide.createIcons();
            } catch (e) { 
                showToast("การพรีวิวล้มเหลว: " + e.message, true); 
                console.error(e);
            } finally { 
                loading.classList.add('hidden'); 
            }
        }

        async function downloadFromPreview(type, btnElement) {
            const checkboxes = Array.from(document.querySelectorAll('.page-checkbox'));
            const selectedIndices = checkboxes.filter(cb => cb.checked).map(cb => parseInt(cb.value));
            
            if (selectedIndices.length === 0) {
                showToast("กรุณาเลือกอย่างน้อย 1 หน้าเพื่อดาวน์โหลด", true);
                return;
            }

            const selectedURLs = selectedIndices.map(idx => window.cachedExportDataURLs[idx]);

            const startStr = document.getElementById('prev-start-month').value;
            const endStr = document.getElementById('prev-end-month').value;
            let baseName = `ตารางนัดหมาย`;
            if(startStr === endStr) {
                baseName += `_${startStr}`;
            } else {
                baseName += `_${startStr}_ถึง_${endStr}`;
            }
            
            const orient = document.getElementById('prev-orient').value;
              
            if (type === 'image') {
                selectedURLs.forEach((url, i) => {
                    const originalIdx = selectedIndices[i];
                    const a = document.createElement('a'); 
                    a.download = `${baseName}_Page${originalIdx+1}.png`; 
                    a.href = url; 
                    a.click();
                });
            } else if (type === 'pdf') {
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({
                    orientation: orient,
                    unit: 'px',
                    format: orient === 'l' ? [1123, 794] : [794, 1123],
                    compress: true
                });

                selectedURLs.forEach((url, idx) => {
                    if (idx > 0) pdf.addPage(orient === 'l' ? [1123, 794] : [794, 1123], orient);
                    pdf.addImage(url, 'PNG', 0, 0, orient === 'l' ? 1123 : 794, orient === 'l' ? 794 : 1123, undefined, 'FAST');
                });
                pdf.save(`${baseName}.pdf`);
            } else if (type === 'zip') {
                const originalText = btnElement.innerHTML;
                btnElement.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> กำลังสร้าง ZIP...';
                btnElement.disabled = true;

                try {
                    const zip = new JSZip();
                    selectedURLs.forEach((url, i) => {
                        const originalIdx = selectedIndices[i];
                        // ลบส่วนหัว data:image/png;base64, ออกเพื่อให้ JSZip อ่านได้ถูกต้อง
                        const base64Data = url.replace(/^data:image\/(png|jpg);base64,/, "");
                        zip.file(`${baseName}_Page${originalIdx+1}.png`, base64Data, {base64: true});
                    });
                    
                    const content = await zip.generateAsync({type:"blob"});
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(content);
                    a.download = `${baseName}.zip`;
                    a.click();
                } catch(e) {
                    console.error(e);
                    showToast("สร้างไฟล์ ZIP ไม่สำเร็จ", true);
                } finally {
                    btnElement.innerHTML = originalText;
                    btnElement.disabled = false;
                    if(window.lucide) window.lucide.createIcons();
                }
            }
        }
        window.downloadFromPreview = downloadFromPreview;

        function handlePrevMonth() { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); }
        function handleNextMonth() { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); }
        function handleGoToday() { currentDate = new Date(); renderCalendar(); }
          
        function closeDetailsModal() { 
            document.getElementById('details-modal').classList.add('hidden'); 
            document.getElementById('details-modal').classList.remove('flex'); 
            resetForm();
            updateScrollLock();
        }

        function closeAuthModal() { 
            document.getElementById('auth-modal').classList.add('hidden'); 
            document.getElementById('auth-modal').classList.remove('flex'); 
            updateScrollLock();
        }
          
        function closePreviewModal() { 
            document.getElementById('preview-modal').classList.add('hidden'); 
            document.getElementById('preview-modal').classList.remove('flex'); 
            updateScrollLock();
        }

        async function handleDeleteEvent(id) {
            if (isAdmin && confirm("ยืนยันการลบ?")) {
                try {
                    await deleteDoc(doc(db, 'calendar_events', id));
                    showToast('ลบกิจกรรมสำเร็จ');
                    renderAdminHistory();
                    renderModalDetails();
                    renderCalendar();
                } catch(e) { showToast('ลบไม่สำเร็จ: '+e.message, true); }
            }
        }

        // เพิ่ม Event Listeners สำหรับแบบฟอร์มการ Submit (จัดการและบันทึกข้อมูล)
        const authForm = document.getElementById('auth-form');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const pwd = document.getElementById('auth-password').value;
                // ตั้งค่ารหัสผ่านตรงนี้
                if (pwd === '65030900') { 
                    isAdmin = true;
                    closeAuthModal();
                    updateAdminUI();
                    showToast('เข้าสู่ระบบแอดมินสำเร็จ');
                } else {
                    const err = document.getElementById('auth-error');
                    if (err) err.classList.remove('hidden');
                }
            });
        }

        const eventForm = document.getElementById('add-event-form');
        if (eventForm) {
            eventForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!isAdmin) return;
                  
                const id = document.getElementById('ev-id').value;
                const title = document.getElementById('ev-title').value;
                const date = document.getElementById('ev-date').value;
                const time = document.getElementById('ev-time').value;
                const endDate = document.getElementById('ev-enddate').value;
                const color = document.getElementById('ev-color').value;
                const desc = document.getElementById('ev-desc').value;
                  
                const links = [];
                let orderCounter = 1; // เริ่มนับลำดับอิงจากตำแหน่งบนสุดลงล่าง
                document.querySelectorAll('.link-form-row').forEach(row => {
                    const label = row.querySelector('.link-label').value;
                    const url = row.querySelector('.link-url').value;
                    const status = row.querySelector('.link-status').value;
                    if (label || url) {
                        links.push({ label, url, order: orderCounter++, status });
                    }
                });

                const eventData = { 
                    title, time, endDate, color, description: desc, links, 
                    date: date 
                };

                try {
                    const subBtn = document.getElementById('submit-btn');
                    const subTxt = document.getElementById('submit-text');
                    const origTxt = subTxt.innerText;
                      
                    subTxt.innerText = 'กำลังบันทึก...';
                    subBtn.disabled = true;
                      
                    if (id) {
                        await updateDoc(doc(db, 'calendar_events', id), eventData);
                        showToast('อัปเดตกิจกรรมสำเร็จ');
                    } else {
                        await addDoc(collection(db, 'calendar_events'), eventData);
                        showToast('เพิ่มนัดหมายใหม่สำเร็จ');
                    }
                      
                    subTxt.innerText = origTxt;
                    subBtn.disabled = false;
                      
                    selectedDate = date; 
                    resetForm();
                      
                    renderModalDetails();
                    renderDashboard();
                    renderAdminHistory();
                    renderCalendar();

                } catch (err) {
                    console.error(err);
                    showToast('เกิดข้อผิดพลาดในการบันทึก: ' + err.message, true);
                }
            });
        }

        const init = async () => {
            // Initialize Sync Module
            initGoogleSync(window.handleSyncStatus);

            try { await signInAnonymously(auth); } catch(e){}
            onAuthStateChanged(auth, (curr) => { if (curr) {
                onSnapshot(collection(db, 'calendar_events'), (snap) => { 
                    events = snap.docs.map(d => ({ id: d.id, ...d.data() })); 
                    isDataLoaded.events = true; 
                    renderCalendar(); 
                    renderDashboard(); 
                    if (isAdmin) renderAdminHistory(); 
                    document.getElementById('loading').classList.add('hidden'); 
                    checkSiteVisibility(); 
                    if(!hasShownPopup) checkAndShowAnnouncement(); 

                    // 🌟 Trigger Background Sync when Firebase data changes 🌟
                    if(typeof triggerBackgroundSync === 'function') triggerBackgroundSync(events);
                });
                onSnapshot(doc(db, 'settings', 'site_config'), (snapshot) => { if(snapshot.exists()) siteActive = snapshot.data().is_active; updateSiteStatusUI(); });
                onSnapshot(doc(db, 'settings', 'popup_config'), (snapshot) => { if(snapshot.exists()) popupConfig = snapshot.data(); isDataLoaded.config = true; checkAndShowAnnouncement(); });
            }});
        };

        init();
    </script>
</body>
</html>
