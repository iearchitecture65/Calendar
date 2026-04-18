// ใส่ Credentials ที่ปลอดภัยสำหรับ Frontend (ห้ามใส่ Client Secret)
const CLIENT_ID = '16568745892-cj1qjnu5hu9rnp6cf3a7jopo6u60qhnl.apps.googleusercontent.com';
const API_KEY = 'AIzaSyCbB3ExsWAm0h0rMGy9-UcebMLkslvD5x0';

// Scopes สำหรับจัดการปฏิทิน
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let tokenClient;
let accessToken = null;
let currentEventsToSync = [];
let syncCallback = null;

// ฟังก์ชันแปลงข้อมูลจาก Firebase ให้ตรงตามมาตรฐาน Google Calendar API
const formatToGoogleEvent = (fbEvent) => {
    const startDate = fbEvent.date.replace(/-/g, '');
    const startTime = fbEvent.time ? fbEvent.time + ':00' : '00:00:00';
    const startDateTime = `${fbEvent.date}T${startTime}+07:00`; // Asia/Bangkok

    let endDateTime = '';
    if (fbEvent.endDate && fbEvent.endDate !== fbEvent.date) {
        endDateTime = `${fbEvent.endDate}T${fbEvent.time ? fbEvent.time + ':00' : '23:59:00'}+07:00`;
    } else {
        // ถ้าไม่มีวันสิ้นสุด ให้บวกไป 1 ชั่วโมง
        let h = parseInt(fbEvent.time.split(':')[0]);
        let m = fbEvent.time.split(':')[1];
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

// ฟังก์ชันโหลดฐานข้อมูล Mapping (Firebase ID -> Google Calendar ID)
const getSyncMap = () => {
    const mapStr = localStorage.getItem('gcal_sync_map');
    return mapStr ? JSON.parse(mapStr) : {};
};

const saveSyncMap = (map) => {
    localStorage.setItem('gcal_sync_map', JSON.stringify(map));
};

// ฟังก์ชันเรียก API
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

// ฟังก์ชันหลักในการ Sync
async function performSync(isBackgroundSync = false) {
    if (!accessToken) return;

    if (!isBackgroundSync && syncCallback) {
        syncCallback({ status: 'loading', message: 'กำลังซิงค์ข้อมูลกับ Google Calendar...' });
    }

    const syncMap = getSyncMap();
    const currentFbIds = new Set(currentEventsToSync.map(e => e.id));
    let successCount = 0;

    try {
        // 1. เพิ่ม หรือ อัปเดต กิจกรรม
        for (const fbEvent of currentEventsToSync) {
            const gEventBody = formatToGoogleEvent(fbEvent);
            const existingGcalId = syncMap[fbEvent.id];

            if (existingGcalId) {
                // Update (PUT)
                try {
                    await fetchGoogleAPI('PUT', `/${existingGcalId}`, gEventBody);
                    successCount++;
                } catch (e) {
                    // ถ้าระบบบอกว่าหาไม่เจอ อาจจะถูกลบที่ปฏิทินไปแล้ว ให้สร้างใหม่
                    if (e.message !== 'TOKEN_EXPIRED') {
                        const newEvent = await fetchGoogleAPI('POST', '', gEventBody);
                        syncMap[fbEvent.id] = newEvent.id;
                        successCount++;
                    } else throw e;
                }
            } else {
                // Create (POST)
                const newEvent = await fetchGoogleAPI('POST', '', gEventBody);
                syncMap[fbEvent.id] = newEvent.id;
                successCount++;
            }
        }

        // 2. ตรวจสอบการลบ (ถ้าใน Firebase ถูกลบ ต้องลบใน Google Calendar ด้วย)
        for (const fbId in syncMap) {
            if (!currentFbIds.has(fbId)) {
                try {
                    await fetchGoogleAPI('DELETE', `/${syncMap[fbId]}`);
                } catch(e) {} // ไม่สนใจ error ถ้ามันถูกลบไปแล้ว
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
            // ขอ Token ใหม่ถ้าผู้ใช้กดซิงค์เอง
            tokenClient.requestAccessToken();
        } else if (!isBackgroundSync && syncCallback) {
            syncCallback({ status: 'error', message: 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล กรุณาลองใหม่' });
        }
    }
}

// ฟังก์ชันเริ่มระบบ (เรียกใช้จากหน้าหลัก)
export function initGoogleSync(onStatusChange) {
    syncCallback = onStatusChange;
    
    // ตั้งค่า Token Client
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                accessToken = tokenResponse.access_token;
                performSync(false); // ซิงค์แบบแสดง UI (ผู้ใช้กด)
            } else {
                if(syncCallback) syncCallback({ status: 'error', message: 'การยืนยันตัวตนถูกยกเลิก' });
            }
        },
    });
}

// ฟังก์ชันสำหรับปุ่มกด (ผู้ใช้เริ่มต้นการซิงค์)
export function triggerUserSync(firebaseEvents) {
    currentEventsToSync = firebaseEvents;
    if (!accessToken) {
        // ขอสิทธิ์และเปิดหน้าต่างล็อกอิน Google
        tokenClient.requestAccessToken();
    } else {
        performSync(false);
    }
}

// ฟังก์ชันสำหรับ Auto-Sync เมื่อมีการเปลี่ยนแปลงจาก Firebase แบบ Real-time
export function triggerBackgroundSync(firebaseEvents) {
    // จะทำงานก็ต่อเมื่อเคยได้ Token แล้ว (ผู้ใช้เคยกดซิงค์และอยู่ในหน้านี้)
    if (accessToken) {
        currentEventsToSync = firebaseEvents;
        performSync(true); // ทำงานเงียบๆ เป็น Background
    }
}
