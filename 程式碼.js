/**
 * ============================================================
 * 國中輔導室個案管理系統 - GAS 後端 API
 * ============================================================
 * 部署方式：
 * 1. 開啟 Google Apps Script (script.google.com)
 * 2. 建立新專案，貼上此程式碼
 * 3. 部署 > 新增部署作業 > 類型選「網頁應用程式」
 * 4. 執行身分：我自己 / 誰可以存取：任何人
 * 5. 複製部署的網址，貼到前端設定中
 * ============================================================
 */

// ============ 全域設定 ============
const SPREADSHEET_ID = ''; // 留空則自動使用綁定的試算表，或填入試算表 ID

// 工作表名稱（繁體中文）
const SHEET_USERS = '使用者帳號';
const SHEET_CASES = '優先關懷個案';
const SHEET_RECORDS = '服務紀錄';
const SHEET_CLASSES = '班級設定';
const SHEET_SETTINGS = '系統設定';

// ============ 工作階段 (Session) 設定 ============
const SESSION_DURATION = 86400; // 24 小時 (秒)
const SESSION_PREFIX = 'sess_v1_';

/**
 * 建立新 Session
 */
function createSession(user) {
  const token = Utilities.getUuid();
  const cache = CacheService.getScriptCache();
  const props = PropertiesService.getScriptProperties();
  const sessionDataStr = JSON.stringify({
    account: user.account,
    name: user.name,
    role: user.role,
    startTime: Date.now()
  });
  
  try {
    cache.put(SESSION_PREFIX + token, sessionDataStr, SESSION_DURATION);
    // 🛡️ 硬碟級備份儲存，防範 Cache 揮發
    props.setProperty(SESSION_PREFIX + token, sessionDataStr);
  } catch (e) {
    console.error('Session 建立異常:', e);
  }
  return token;
}

function getSession(token) {
  if (!token) return null;
  const cache = CacheService.getScriptCache();
  const props = PropertiesService.getScriptProperties();
  
  let raw = cache.get(SESSION_PREFIX + token);
  if (!raw) {
    // 🎯 從硬碟級儲存撈回，補回 Cache
    raw = props.getProperty(SESSION_PREFIX + token);
    if (raw) {
      try { cache.put(SESSION_PREFIX + token, raw, SESSION_DURATION); } catch(e) {}
    }
  }
  
  if (!raw) return null;
  
  try {
    const data = JSON.parse(raw);
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * 強制登出
 */
function handleLogout(data) {
  const token = data.token;
  if (token) {
    CacheService.getScriptCache().remove(SESSION_PREFIX + token);
  }
  return { success: true, message: '已安全登出' };
}

// ============ 工作表欄位定義 ============
const HEADERS = {
  [SHEET_USERS]: [
    '帳號', '密碼', '姓名', '身份', '狀態', '教師編碼', '建立日期'
  ],
  [SHEET_CASES]: [
    '個案編號', '入學學年度', '年級', '班級', '座號', '姓名', '性別', '提報學期',
    '導師提報內容', '專輔個案摘要',
    '特教身分', '身分背景', '專輔',
    '認輔教師', '特教個管老師',
    '個案服務方式', '個案來源', '個案類型',
    '狀態', '轉介概況', '轉介紀錄月', 
    '七上綜述', '七下綜述', '八上綜述', '八下綜述', '九上綜述', '九下綜述',
    '最後更新', '建立日期'
  ],
  [SHEET_RECORDS]: [
    '紀錄編號', '個案編號', '日期時間', '時間', '對象', '方式', '輔導服務紀錄', '記錄者帳號',
    '記錄者姓名', '服務項目', '建立日期', '附件檔案'
  ],
  [SHEET_CLASSES]: [
    '年級', '班級', '導師', '班輔', '專輔'
  ],
  'HISTORY_RECORDS': [
    '紀錄編號', '個案編號', '日期時間', '時間', '對象', '方式', '輔導服務紀錄', '記錄者帳號',
    '記錄者姓名', '服務項目', '建立日期', '學生姓名', '附件檔案'
  ],
  [SHEET_SETTINGS]: [
    '設定項目', '設定值', '說明'
  ]
};

// ============ 初始化與工具函式 ============

/**
 * 取得試算表物件 (使用全域快取)
 */
let _ss;
function getSpreadsheet() {
  if (_ss) return _ss;
  let ss;
  try {
    if (SPREADSHEET_ID) {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    } else {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
  } catch (e) {
    console.error('抓不到試算表:', e.message);
  }
  
  if (!ss) {
    throw new Error('抓不到試算表！如果您是建立「獨立腳本」，請在程式碼上方填入 SPREADSHEET_ID；如果是「綁定腳本」，請確認已完成授權。');
  }
  _ss = ss;
  return ss;
}

/**
 * 自動初始化所有工作表與欄位
 */
function initSheets() {
  const ss = getSpreadsheet();
  const result = {};

  for (const [sheetName, headers] of Object.entries(HEADERS)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
      result[sheetName] = '已建立';
    } else {
      // 檢查欄位是否完整
      const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const missingHeaders = headers.filter(h => !existingHeaders.includes(h));
      if (missingHeaders.length > 0) {
        const startCol = sheet.getLastColumn() + 1;
        sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
        result[sheetName] = `已補充欄位: ${missingHeaders.join(', ')}`;
      } else {
        result[sheetName] = '已存在';
      }
    }
  }

  // 建立預設管理員帳號（如果沒有任何帳號）
  const userSheet = ss.getSheetByName(SHEET_USERS);
  if (userSheet.getLastRow() <= 1) {
    const now = new Date().toLocaleString('zh-TW');
    // 預設為「管理員」角色
    userSheet.appendRow(['admin', hashPassword('admin123'), '系統管理員', '管理員', '啟用', '', now]);
  }

  // 初始化預設系統設定項目
  const settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
  const settingsData = getSheetData(SHEET_SETTINGS);
  const defaultSettings = [
    ['GEMINI_API_KEY', '', '用於自動生成個案摘要的 API Key'],
    ['GEMINI_MODEL', 'gemini-1.5-flash', '要使用的 Gemini 模型名稱'],
    ['SUMMARY_PROMPT', '請根據以下去識別化後的輔導紀錄，撰寫一份 300 字以內的學期個案摘要，語氣需專業且具備教育輔導觀點。', 'AI 生成摘要時的提示詞'],
    ['BACKUP_EMAIL', '', '每月自動備份 Excel 的寄送地址'],
    ['BACKUP_ENABLED', 'true', '是否啟用每月 1 號自動備份寄送 (true/false)']
  ];

  defaultSettings.forEach(set => {
    if (!settingsData.find(s => s['設定項目'] === set[0])) {
      settingsSheet.appendRow(set);
    }
  });

  return result;
}

/**
 * 簡易密碼雜湊（在 GAS 環境中使用 Utilities）
 */
function hashPassword(password) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + 'counseling_salt_2024');
  return raw.map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
}

/**
 * 取得當前學期（格式：114-1, 113-2）
 */
function getSemester(date = new Date()) {
  let year = date.getFullYear() - 1911; // 民國年
  const month = date.getMonth() + 1;
  
  if (month >= 8) {
    return `${year}-1`;
  } else if (month >= 2) {
    return `${year - 1}-2`;
  } else {
    // 1 月份算上學期的末尾
    return `${year - 1}-1`;
  }
}

/**
 * 取得當前學年度（入學年參考）
 */
function getSchoolYear(gradeStr) {
  const now = new Date();
  let year = now.getFullYear() - 1911; // 民國年
  const month = now.getMonth() + 1;
  
  let currentSY = (month >= 8) ? year : year - 1;
  const gradeMap = { '新生': 6, '七': 7, '八': 8, '九': 9 };
  const gradeNum = gradeMap[gradeStr] || 7;
  
  const entryYear = currentSY - (gradeNum - 7);
  return String(entryYear);
}

/**
 * 產生唯一編號 (補位至 7 碼：入學年(3) + 班級(2) + 座號(2))
 */
function generateSystemId(grade, cls, seat) {
  const sy = getSchoolYear(grade); // 3 碼
  const c = String(cls || '').padStart(2, '0');
  const s = String(seat || '').padStart(2, '0');
  return sy + c + s;
}

/**
 * 產生唯一編號 (備用隨機 ID)
 */
function generateId(prefix) {
  const timestamp = new Date().getTime().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

/**
 * 取得工作表資料（含欄位名稱對應）
 */
// 快取物件，在單次請求生命週期內生效
const _sheetCache = {};

/**
 * 確保既有「服務紀錄」工作表具備可選填的「時間」欄位。
 * 舊表會把新欄位加在最右側，讀寫時再依標題對齊，避免資料錯欄。
 */
function ensureRecordTimeColumn() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  if (!sheet) return;

  const lastColumn = sheet.getLastColumn();
  const headerWidth = Math.max(lastColumn, 1);
  const headers = sheet.getRange(1, 1, 1, headerWidth).getValues()[0]
    .map(h => String(h).trim());
  if (headers.includes('時間')) return;

  const targetColumn = lastColumn > 0 && headers.some(Boolean) ? lastColumn + 1 : 1;
  sheet.getRange(1, targetColumn).setValue('時間').setFontWeight('bold');
  delete _sheetCache[SHEET_RECORDS];
  CacheService.getScriptCache().remove('sheet_data_' + SHEET_RECORDS);
}

function getSheetData(sheetName, force = false) {
  if (!force && _sheetCache[sheetName]) return _sheetCache[sheetName];
  
  // 🎯 效能優化：使用 CacheService
  const cacheKey = 'sheet_data_' + sheetName;
  const cache = CacheService.getScriptCache();
  if (force) cache.remove(cacheKey); // 強制清除
  
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      const data = JSON.parse(cached);
      if (Array.isArray(data) && data.length > 0) {
        _sheetCache[sheetName] = data;
        return data;
      }
    } catch (e) {
      // 若 JSON 解析失敗（通常是資料量太大被截斷），清除快取
      cache.remove(cacheKey);
    }
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = [];
  
  const headerMap = {};
  headers.forEach((h, i) => { 
    if (h) {
      const cleanHeader = String(h).trim();
      headerMap[cleanHeader] = i; 
    }
  });

  for (let i = 1; i < data.length; i++) {
    const row = {};
    const dataRow = data[i];
    
    for (const h in headerMap) {
      let val = dataRow[headerMap[h]];
      if (val instanceof Date) {
        // 🎯 效能優化：用原生 JS 取代 GAS Utilities.formatDate，避免跨語言呼叫開銷
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const d = String(val.getDate()).padStart(2, '0');
        val = `${y}-${m}-${d}`;
      }
      row[h] = val;
    }
    row._rowIndex = i + 1;
    rows.push(row);
  }
  
  _sheetCache[sheetName] = rows;
  // 存入快取 60 秒 (避免太長造成資料不同步，主要針對單次請求或快速連續請求)
  try {
    cache.put(cacheKey, JSON.stringify(rows), 300);
  } catch (e) {
    // 若資料量太大超過 100KB 快取限制，則略過快取
  }
  
  return rows;
}

/**
 * 穩定的日期解析工具 (解決 GAS 環境下 localized 字串解析失敗問題)
 */
function parseStable(val) {
  if (!val) return 0;
  if (val instanceof Date) return val.getTime();
  
  const parts = String(val).match(/\d+/g);
  if (!parts || parts.length < 3) return 0;
  
  // 依序：年, 月(0-11), 日, 時, 分, 秒
  const dt = new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10),
    parseInt(parts[3] || 0, 10),
    parseInt(parts[4] || 0, 10),
    parseInt(parts[5] || 0, 10)
  );
  return dt.getTime();
}

/**
 * 根據欄位名稱取得欄位索引（1-indexed）
 */
function getColumnIndex(sheetName, columnName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.indexOf(columnName) + 1;
}

/**
 * 取得系統設定值
 */
function getSetting(name) {
  const data = getSheetData('系統設定');
  const row = data.find(s => s['設定項目'] === name);
  return row ? row['設定值'] : '';
}

/**
 * 去識別化處理
 */
function anonymizeData(records, studentName) {
  if (!records || records.length === 0) return '';
  const nameRegex = new RegExp(studentName || '___', 'g');
  return records.map(r => {
    let content = String(r['輔導服務紀錄'] || '');
    if (studentName) content = content.replace(nameRegex, '[學生]');
    content = content.replace(/(\d{4})[- ]?\d{3}[- ]?\d{3}/g, '$1-***-***');
    content = content.replace(/(\d{2})[- ]?\d{4}[- ]?\d{4}/g, '$1-****-****');
    content = content.replace(/[A-Z][12]\d{8}/gi, '***身分證字號***');
    const timeText = r['時間'] ? ` / 時間：${r['時間']}` : '';
    return `日期：${r['日期時間']}${timeText} / 對象：${r['對象']} / 內容：${content}`;
  }).join('\n---\n');
}

/**
 * 處理自動生成綜述 Action (強化版)
 */
function handleGenerateSummary(data) {
  let { caseId, semester, targetGradeNum, sem } = data;
  if (!caseId || !semester || !targetGradeNum) return { success: false, error: '參數不足 (缺少 ID, 學期名稱 或 年級)' };

  try {
    // 優先智慧解析學期字串 (例如: 114-2, 114下)
    let finalSem = sem;
    let syStr = String(semester).split('-')[0].replace(/[^0-9]/g, '');
    
    if (String(semester).includes('-2') || String(semester).includes('下') || String(semester).endsWith('2')) finalSem = '2';
    if (String(semester).includes('-1') || String(semester).includes('上') || String(semester).endsWith('1')) finalSem = '1';
    
    if (!finalSem) finalSem = '1'; // 預設
    const sy = parseInt(syStr) + 1911;
    
    // 1. 取得設定
    const settings = getSheetData('系統設定', true);
    const getCfg = (name) => (settings.find(s => s['設定項目'] === name) || {})['設定值'] || '';
    const apiKey = getCfg('GEMINI_API_KEY');
    const model = getCfg('GEMINI_MODEL') || 'gemini-1.5-flash';
    const sysPrompt = getCfg('SUMMARY_PROMPT');
    if (!apiKey) return { success: false, error: '未填寫 API_KEY' };

    // 2. 精準定位資料
    const ss = getSpreadsheet();
    const casesSheet = ss.getSheetByName(SHEET_CASES);
    const rawData = casesSheet.getDataRange().getValues();
    const headers = rawData[0];
    const targetId = String(caseId).replace(/-/g, '');
    let rowIndex = -1;
    let student = null;
    const idIdx = headers.indexOf('個案編號');
    
    for (let i = 1; i < rawData.length; i++) {
      if (String(rawData[i][idIdx] || '').replace(/-/g, '') === targetId) {
        rowIndex = i + 1;
        student = {};
        headers.forEach((h, idx) => { student[h] = rawData[i][idx]; });
        break;
      }
    }
    if (!student || rowIndex === -1) return { success: false, error: '找不到案主' };

    // 3. 篩選紀錄
    const recordsData = getSheetData(SHEET_RECORDS, true);
    // 定義日期區間 (上學期: 8/1-1/31, 下學期: 2/1-7/31)
    const [start, end] = finalSem === '1' ? [new Date(sy, 7, 1), new Date(sy + 1, 0, 31)] : [new Date(sy + 1, 1, 1), new Date(sy + 1, 6, 31)];
    
    // 更新 sem 給後續寫入判斷
    sem = finalSem;
    const semRecords = recordsData.filter(r => {
      const rId = String(r['個案編號'] || '').replace(/-/g, '');
      const rd = new Date(r['日期時間'] || r['建立日期']);
      return rId === targetId && rd >= start && rd <= end;
    });
    if (semRecords.length === 0) {
      return { success: false, error: '該學期無輔導紀錄，系統不會生成或覆蓋內容。' };
    }

    // 檢查是否皆為純紀錄（無實際服務）
    const hasActual = semRecords.some(r => !String(r['服務項目'] || '').includes('純紀錄'));
    if (!hasActual) {
      return { success: false, error: '該學期僅有純紀錄（無實際服務），系統不會生成。' };
    }

    // 4. AI 產製
    const anonymized = anonymizeData(semRecords, student['姓名']);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: `${sysPrompt}\n\n紀錄：\n${anonymized}` }] }] };
    
    let summary = '';
    try {
      const response = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
      const json = JSON.parse(response.getContentText());
      summary = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } catch (apiErr) {
      console.error('AI API Error:', apiErr);
      throw new Error('AI 服務回應異常，可能為 API Key 效期或模型限制。');
    }
    
    if (!summary) throw new Error('AI 回傳空結果');

    // 🎯 剔除結尾可能出現的字數標記 (例如: (46字) 或 （46字）)
    summary = summary.replace(/[\(（]\s*\d+\s*字\s*[\)）]\s*$/, '').trim();

    // 5. 寫入
    const gradeNum = parseInt(targetGradeNum);
    const label = `${{7:'七',8:'八',9:'九'}[gradeNum]}${sem==='1'?'上':'下'}綜述`;
    const colIdx = headers.indexOf(label) + 1;
    if (colIdx === 0) throw new Error(`欄位遺失: ${label}`);
    
    casesSheet.getRange(rowIndex, colIdx).setValue(summary);
    const upIdx = headers.indexOf('最後更新') + 1;
    if (upIdx > 0) casesSheet.getRange(rowIndex, upIdx).setValue(new Date().toLocaleString('zh-TW'));

    CacheService.getScriptCache().remove('sheet_data_' + SHEET_CASES);
    
    // 6. 強制同步回傳
    SpreadsheetApp.flush();
    Utilities.sleep(200);
    const updatedRow = casesSheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
    const updatedObj = {};
    headers.forEach((h, idx) => { updatedObj[h] = updatedRow[idx]; });
    
    return { success: true, data: { summary, updatedCase: mapCaseToFrontend(updatedObj) } };
  } catch (err) {
    return { success: false, error: 'AI 生成中斷異常：' + err.message };
  }
}

// ============ API 路由處理 ============

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  let result;

  try {
    const params = e.parameter || {};
    
    // POST 資料解析
    let postData = {};
    if (e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (err) {
        postData = {};
      }
    }

    // 合併 GET 和 POST 參數
    const data = { ...params, ...postData };
    const action = data.action || '';

    // --- 公開 Actions (不需 Token) ---
    if (action === 'login') {
      return ContentService.createTextOutput(JSON.stringify(handleLogin(data)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'init') {
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: initSheets() }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --- 認證攔截器 ---
    const session = getSession(data.token);
    if (!session) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Session 已過期，請重新登入', code: 401 }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 🎯 安全加固：從 Session 覆蓋前端傳來的身分資訊，防止 Role Spoofing
    data.account = session.account;
    data.role = session.role;
    data.recorderName = session.name;

    switch (action) {
      // --- 系統 ---
      case 'ping':
        result = { success: true, message: '連線成功', user: session.name };
        break;
      case 'logout':
        result = handleLogout(data);
        break;

      // --- 使用者管理 ---
      case 'getUsers':
        result = handleGetUsers(data);
        break;
      case 'addUser':
        result = handleAddUser(data);
        break;
      case 'updateUser':
        result = handleUpdateUser(data);
        break;
      case 'deleteUser':
        result = handleDeleteUser(data);
        break;

      // --- 個案管理 ---
      case 'getCases':
        result = handleGetCases(data);
        break;
      case 'addCase':
        result = handleAddCase(data);
        break;
      case 'updateCase':
        result = handleUpdateCase(data);
        break;
      case 'deleteCase':
        result = handleDeleteCase(data);
        break;

      // --- 晤談紀錄 ---
      case 'getRecords':
        result = handleGetRecords(data);
        break;
      case 'addRecord':
        result = handleAddRecord(data);
        break;
      case 'updateRecord':
        result = handleUpdateRecord(data);
        break;
      case 'deleteRecord':
        result = handleDeleteRecord(data);
        break;
      case 'uploadRecordImage':
        result = uploadRecordImage(data);
        break;
      case 'deleteAttachment':
        result = handleDeleteAttachment(data);
        break;

      // --- 配置管理 ---
      case 'saveConfig':
        result = handleSaveConfig(data);
        break;
      case 'resetSystem':
        result = handleResetSystem(data);
        break;
      case 'batchUpdate':
        result = handleBatchUpdate(data);
        break;
      case 'batchDelete':
        result = handleBatchDelete(data);
        break;
      case 'dataAlignment':
        result = handleDataAlignment(data);
        break;
      case 'checkIntegrity':
        result = handleCheckIntegrity(data);
        break;

      // --- 統計與特殊功能 ---
      case 'getDashboard':
        result = handleGetDashboard(data);
        break;
      case 'getCaseDetail':
        result = handleGetCaseDetail(data);
        break;
      case 'getCaseFull':
        result = handleGetCaseFull(data);
        break;
      case 'getBatchSummaries':
        result = handleGetBatchSummaries(data);
        break;
      case 'getMonthlyReportData':
        result = handleGetMonthlyReportData(data);
        break;
      case 'updateAllCaseIds':
        result = handleUpdateAllCaseIds(data);
        break;
      case 'updateAllSemesters':
        result = handleUpdateAllSemesters(data);
        break;
      case 'backupData':
        result = handleBackupData(data);
        break;
      case 'archiveGraduates':
        result = handleArchiveGraduates(data);
        break;
      case 'promoteGrades':
        result = handlePromoteGrades(data);
        break;
      case 'searchHistory':
        result = handleSearchHistory(data);
        break;
      case 'getHistoryRecords':
        result = handleGetHistoryRecords(data);
        break;
      case 'changePassword':
        result = handleChangePassword(data);
        break;
      case 'updateCaseYear':
        result = handleUpdateCaseYear(data);
        break;
      case 'generateOfficialId':
        result = handleGenerateOfficialId(data);
        break;
      case 'repairData':
        result = handleRepairData(data);
        break;
      case 'uploadRecordImage':
        result = uploadRecordImage(data);
        break;
      case 'deleteAttachment':
        result = handleDeleteAttachment(data);
        break;
      case 'updateBackupSettings':
        result = handleUpdateBackupSettings(data);
        break;
      case 'testBackupEmail':
        result = handleTestBackupEmail(data);
        break;

      case 'generateSummary':
        result = handleGenerateSummary(data);
        break;

      case 'getMonthlyReportTemplate':
        result = handleGetMonthlyReportTemplate(data);
        break;

      default:
        result = { success: false, error: '未知的 action: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.message, stack: err.stack };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ... 已有的 handleLogin, handleChangePassword 等函式 ...

/**
 * 批次更新所有個案的「入學學年度」
 * 邏輯：根據目前的年級與目前的日期，計算該個案應屬的入學學年度（3碼）
 */
function handleUpdateCaseYear(data) {
  if (!checkAdminRole(data.role)) return { success: false, error: '權限不足' };
  
  const ss = getSpreadsheet();
  const caseSheet = ss.getSheetByName(SHEET_CASES);
  
  const caseValues = caseSheet.getDataRange().getValues();
  const cHeaders = caseValues[0];
  
  // 檢查是否已有「入學學年度」欄位，若無則新增
  let syIdx = cHeaders.indexOf('入學學年度');
  if (syIdx === -1) {
    syIdx = cHeaders.length;
    cHeaders.push('入學學年度');
    caseSheet.getRange(1, syIdx + 1).setValue('入學學年度').setFontWeight('bold');
    // 更新所有列的資料範圍，使其包含新欄位
    for (let i = 1; i < caseValues.length; i++) {
      caseValues[i].push('');
    }
  }
  
  const cGradeIdx = cHeaders.indexOf('年級');
  const cIdIdx = cHeaders.indexOf('個案編號');
  if (cGradeIdx === -1 || cIdIdx === -1) return { success: false, error: '找不到「年級」或「個案編號」欄位' };
  
  let count = 0;
  for (let i = 1; i < caseValues.length; i++) {
    const row = caseValues[i];
    const grade = String(row[cGradeIdx] || '').trim();
    if (!grade) continue;
    
    // 如果入學學年度為空，則根據目前年級預填
    if (!row[syIdx]) {
      row[syIdx] = getSchoolYear(grade);
      count++;
    }
    
    // 校驗邏輯：改為檢查「個案編號開頭」是否與「入學學年度」一致（僅針對純數字編號）
    const idStr = String(row[cIdIdx] || '');
    const entrySY = String(row[syIdx]).trim();
    if (idStr && entrySY && /^\d{3}/.test(idStr) && !idStr.startsWith(entrySY) && !idStr.startsWith('S-')) {
      // 這裡記錄但不強制修改 ID，供老師參考或標記異常
      console.warn(`[Integrity] Case ${idStr} has inconsistent EntrySY ${entrySY}`);
    }
  }

  if (count > 0) {
    caseSheet.getRange(1, 1, caseValues.length, cHeaders.length).setValues(caseValues);
    CacheService.getScriptCache().remove('sheet_data_' + SHEET_CASES);
  }

  return { success: true, message: `已完成 ${count} 筆個案入學學年度更新。` };
}


// ============ 登入處理 ============

function handleLogin(data) {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('initialized')) {
    initSheets();
    props.setProperty('initialized', 'true');
  }
  ensureRecordTimeColumn();

  const { account, password } = data;
  if (!account || !password) {
    return { success: false, error: '請輸入帳號和密碼' };
  }

  const users = getSheetData(SHEET_USERS);
  const hashedPwd = hashPassword(password);
  const user = users.find(u => u['帳號'] === account && u['密碼'] === hashedPwd && u['狀態'] === '啟用');

  if (!user) {
    return { success: false, error: '帳號或密碼錯誤，或帳號已停用' };
  }

  const userData = {
    account: user['帳號'],
    name: user['姓名'],
    role: user['身份']
  };

  // 生成 Session Token
  const token = createSession(userData);

  return {
    success: true,
    token: token,
    user: userData
  };
}

// ============ 修改密碼處理 ============

function handleChangePassword(data) {
  const { account, oldPassword, newPassword } = data;
  if (!account || !oldPassword || !newPassword) {
    return { success: false, error: '請提供帳號、舊密碼與新密碼' };
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_USERS);
  const users = getSheetData(SHEET_USERS);
  const hashedOldPwd = hashPassword(oldPassword);

  const user = users.find(u => u['帳號'] === account && u['密碼'] === hashedOldPwd);
  if (!user) {
    return { success: false, error: '舊密碼不正確' };
  }

  const pwdColIdx = getColumnIndex(SHEET_USERS, '密碼');
  sheet.getRange(user._rowIndex, pwdColIdx).setValue(hashPassword(newPassword));
  
  // 🎯 修正：修改密碼後必須清除使用者資料快取，否則登入時會讀取到舊密碼快取
  CacheService.getScriptCache().remove('sheet_data_' + SHEET_USERS);

  return { success: true, message: '密碼修改成功' };
}

// ============ 使用者管理 ============

function handleGetUsers(data) {
  if (!checkAdminRole(data.role)) {
    return { success: false, error: '權限不足' };
  }

  const users = getSheetData(SHEET_USERS);
  return {
    success: true,
    data: users.map(u => ({
      account: u['帳號'],
      name: u['姓名'],
      role: u['身份'],
      status: u['狀態'],
      teacherCode: u['教師編碼'] || '',
      createdAt: u['建立日期']
    }))
  };
}

function handleAddUser(data) {
  if (!checkAdminRole(data.role)) {
    return { success: false, error: '權限不足' };
  }

  const { newAccount, newPassword, newName, newRole } = data;
  if (!newAccount || !newPassword || !newName || !newRole) {
    return { success: false, error: '請填寫所有欄位' };
  }

  // 檢查帳號是否已存在
  const users = getSheetData(SHEET_USERS);
  if (users.find(u => u['帳號'] === newAccount)) {
    return { success: false, error: '帳號已存在' };
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_USERS);
  const now = new Date().toLocaleString('zh-TW');

  const teacherCode = data.newTeacherCode || '';
  sheet.appendRow([
    newAccount, hashPassword(newPassword), newName, newRole, '啟用', teacherCode, now
  ]);
  CacheService.getScriptCache().remove('sheet_data_' + SHEET_USERS);

  return { success: true, message: '帳號建立成功' };
}

function handleUpdateUser(data) {
  if (!checkAdminRole(data.role)) {
    return { success: false, error: '權限不足' };
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_USERS);
  const users = getSheetData(SHEET_USERS);
  const user = users.find(u => u['帳號'] === data.targetAccount);

  if (!user) {
    return { success: false, error: '找不到該帳號' };
  }

  const row = user._rowIndex;

  if (data.newName) {
    sheet.getRange(row, getColumnIndex(SHEET_USERS, '姓名')).setValue(data.newName);
  }
  if (data.newRole) {
    sheet.getRange(row, getColumnIndex(SHEET_USERS, '身份')).setValue(data.newRole);
  }
  if (data.newStatus) {
    sheet.getRange(row, getColumnIndex(SHEET_USERS, '狀態')).setValue(data.newStatus);
  }
  if (data.newTeacherCode !== undefined) {
    sheet.getRange(row, getColumnIndex(SHEET_USERS, '教師編碼')).setValue(data.newTeacherCode);
  }
  if (data.newPassword) {
    sheet.getRange(row, getColumnIndex(SHEET_USERS, '密碼')).setValue(hashPassword(data.newPassword));
  }

  // 🎯 修正：更新使用者資料後清除快取
  CacheService.getScriptCache().remove('sheet_data_' + SHEET_USERS);

  return { success: true, message: '帳號更新成功' };
}

function handleDeleteUser(data) {
  if (!checkAdminRole(data.role)) {
    return { success: false, error: '權限不足' };
  }

  const users = getSheetData(SHEET_USERS);
  const user = users.find(u => u['帳號'] === data.targetAccount);

  if (!user) {
    return { success: false, error: '找不到該帳號' };
  }

  if (data.targetAccount === 'admin') {
    return { success: false, error: '無法刪除預設管理員帳號' };
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_USERS);
  sheet.deleteRow(user._rowIndex);
  CacheService.getScriptCache().remove('sheet_data_' + SHEET_USERS);

  return { success: true, message: '帳號已刪除' };
}

// ============ 個案管理 ============

function handleGetCases(data) {
  const cases = getSheetData(SHEET_CASES);
  let filtered = cases;

  // 專輔教師權限過濾
  if (data.role === '專輔教師' && data.account) {
    const user = getSheetData(SHEET_USERS).find(u => u['帳號'] === data.account);
    const userName = user ? user['姓名'] : '';
    
    // 只根據個案表中的「專輔」欄位篩選（支援零星個案分配）
    filtered = cases.filter(c => {
      const assigned = String(c['專輔'] || '');
      return assigned === String(data.account) || (userName && assigned === String(userName));
    });
  }

  return {
    success: true,
    data: filtered.map(c => mapCaseToFrontend(c))
  };
}

/**
 * 統一個案資料映射邏輯，確保各處抓到的欄位一致 (Boy Scout Rule)
 */
function mapCaseToFrontend(c, classCfg = null, baseDate = new Date()) {
  const res = {
    id: String(c['個案編號'] || ''),
    grade: String(c['年級'] || ''),
    class: String(c['班級'] || ''),
    seatNo: String(c['座號'] || ''),
    name: String(c['姓名'] || ''),
    gender: String(c['性別'] || ''),
    reportDate: c['提報學期'] || '',
    teacherReport: c['導師提報內容'] || '',
    situation: c['專輔個案摘要'] || '',
    specialEdu: c['特教身分'] || '',
    identity: c['身分背景'] || '',
    counselor: String(c['專輔'] || (classCfg ? classCfg['專輔'] : '')),
    mentorTeacher: c['認輔教師'] || '',
    specialEduTeacher: c['特教個管老師'] || '',
    serviceMethod: c['個案服務方式'] || '',
    caseSource: c['個案來源'] || '',
    caseType: String(c['個案類型'] || ''),
    status: c['狀態'] || '進行中',
    entrySY: String(c['入學學年度'] || ''),
    referralStatus: c['轉介概況'] || '2.無轉介',
    referralMonth: c['轉介紀錄月'] || '',
    homeroom: classCfg ? classCfg['導師'] : (c['導師'] || '-'),
    classGuidance: classCfg ? classCfg['班輔'] : (c['班輔'] || '-'),
    s_7a: c['七上綜述'] || '', s_7b: c['七下綜述'] || '',
    s_8a: c['八上綜述'] || '', s_8b: c['八下綜述'] || '',
    s_9a: c['九上綜述'] || '', s_9b: c['九下綜述'] || '',
    createdAt: c['建立日期'],
    updatedAt: c['最後更新'],
    excludeFromReport: String(c['個案編號'] || '').startsWith('S-')
  };

  // --- 🎯 智慧轉換：跨月自動遞延邏輯 ---
  const currentMonthStr = `${baseDate.getFullYear() - 1911}-${String(baseDate.getMonth() + 1).padStart(2, '0')}`;
  
  if (res.referralMonth && res.referralMonth !== currentMonthStr) {
    if (res.referralStatus.includes('1.本月轉介')) {
      res.referralStatus = '3.已轉介輔諮中心且該中心持續服務中';
    } else if (res.referralStatus.includes('4.已轉介輔諮中心，該中心服務至本月結案')) {
      res.referralStatus = '2.無轉介';
    }
  }

  return res;
}
function handleAddCase(data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CASES);
  const now = new Date().toLocaleString('zh-TW');
  const cases = getSheetData(SHEET_CASES);
  let id = generateId('C');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowDataArr = new Array(headers.length).fill('');
  
  const fieldMap = {
    grade: '年級', class: '班級', seatNo: '座號', name: '姓名',
    gender: '性別', reportDate: '提報學期',
    teacherReport: '導師提報內容', situation: '專輔個案摘要',
    specialEdu: '特教身分', identity: '身分背景', counselor: '專輔',
    referralStatus: '轉介概況', referralMonth: '轉介紀錄月',
    entrySY: '入學學年度',
    mentorTeacher: '認輔教師', specialEduTeacher: '特教個管老師',
    serviceMethod: '個案服務方式', caseSource: '個案來源', caseType: '個案類型',
    s_7a: '七上綜述', s_7b: '七下綜述', s_8a: '八上綜述', s_8b: '八下綜述', s_9a: '九上綜述', s_9b: '九下綜述'
  };

  // 1. 寫入基本與綜述欄位 (依據 Header 名稱對齊)
  for (const [key, colName] of Object.entries(fieldMap)) {
    const colIdx = headers.indexOf(colName);
    if (colIdx >= 0) rowDataArr[colIdx] = data[key] || '';
  }

  // 2. 寫入狀態 (固定預設)
  const statusIdx = headers.indexOf('狀態');
  if (statusIdx >= 0) rowDataArr[statusIdx] = '進行中';

  // 3. 寫入建立與更新日期
  const upIdx = headers.indexOf('最後更新');
  if (upIdx >= 0) rowDataArr[upIdx] = now;
  const setIdx = headers.indexOf('建立日期');
  if (setIdx >= 0) rowDataArr[setIdx] = now;



  // 🎯 Tech Lead Failsafe: 防止重複新增編號已存在的個案
  if (data.id && cases.some(c => String(c['個案編號'] || '') === String(data.id))) {
    return { success: false, error: '此個案編號已存在，若欲修改資料請使用編輯功能。' };
  }

  // 5. 個案編號邏輯
  let finalId = data.id || '';
  if (!finalId) {
    finalId = "S-" + generateSystemId(data.grade, data.class, data.seatNo);
  }
  const idIdx = headers.indexOf('個案編號');
  if (idIdx >= 0) rowDataArr[idIdx] = finalId;

  // 6. 轉介月份自動記錄 (如果是 1 或 4 則強制更新為當月)
  const refIdx = headers.indexOf('轉介紀錄月');
  if (refIdx >= 0 && (String(data.referralStatus).includes('1.') || String(data.referralStatus).includes('4.'))) {
    const d = new Date();
    rowDataArr[refIdx] = `${d.getFullYear() - 1911}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  // 最終寫入
  sheet.appendRow(rowDataArr);

  CacheService.getScriptCache().remove('sheet_data_' + SHEET_CASES);

  return { success: true, message: '個案建立成功', id: finalId };
}

function handleUpdateCase(data) {
  const cases = getSheetData(SHEET_CASES);
  // 🎯 修正：使用 originalId 來查找要修改的對象，data.id 可能是修改後的新編號
  const lookupId = data.originalId || data.id; 
  const caseItem = cases.find(c => String(c['個案編號'] || '') === String(lookupId || ''));

  if (!caseItem) {
    return { success: false, error: '找不到該個案' };
  }

  // 權限檢查：改採「專輔」欄位比對姓名或帳號
  if (data.role === '專輔教師') {
    const userResult = getSheetData(SHEET_USERS).find(u => u['帳號'] === data.account);
    const userName = userResult ? userResult['姓名'] : '';
    const counselorInSheet = String(caseItem['專輔'] || '');
    
    if (counselorInSheet !== String(data.account) && counselorInSheet !== userName) {
      return { success: false, error: '您只能編輯自己負責的個案' };
    }
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CASES);
  const row = caseItem._rowIndex;
  const nowDate = new Date();

  // 🎯 效能優化：改為「批次讀取整列 -> 修改內容 -> 一次寫回」
  const fieldMap = {
    id: '個案編號',
    grade: '年級', class: '班級', seatNo: '座號', name: '姓名',
    gender: '性別', reportDate: '提報學期',
    teacherReport: '導師提報內容',
    situation: '專輔個案摘要', 
    specialEdu: '特教身分', identity: '身分背景',
    referralStatus: '轉介概況', referralMonth: '轉介紀錄月',
    entrySY: '入學學年度',
    counselor: '專輔',
    mentorTeacher: '認輔教師', specialEduTeacher: '特教個管老師',
    serviceMethod: '個案服務方式',
    caseSource: '個案來源', caseType: '個案類型',
    status: '狀態',
    s_7a: '七上綜述', s_7b: '七下綜述', s_8a: '八上綜述', s_8b: '八下綜述', s_9a: '九上綜述', s_9b: '九下綜述'
  };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowDataArr = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
  
  for (const [key, colName] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      const colIdx = headers.indexOf(colName);
      if (colIdx >= 0) {
        rowDataArr[colIdx] = data[key];
      }
    }
  }

  // 智慧紀錄：如果轉介狀態改為 1 或 4，自動更新紀錄月份
  const refIdx = headers.indexOf('轉介紀錄月');
  if (refIdx >= 0 && (String(data.referralStatus).includes('1.') || String(data.referralStatus).includes('4.'))) {
    rowDataArr[refIdx] = `${nowDate.getFullYear() - 1911}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;
  } else if (refIdx >= 0 && data.referralStatus) {
    // 如果是其他狀態且原本沒有月份，也補上
    if (!rowDataArr[refIdx]) rowDataArr[refIdx] = `${nowDate.getFullYear() - 1911}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;
  }

  // 更新最後更新時間
  const updateColIdx = headers.indexOf('最後更新');
  if (updateColIdx >= 0) {
    rowDataArr[updateColIdx] = nowDate.toLocaleString('zh-TW');
  }

  // 🎯 智慧轉換：如果個案從臨時編號 (S- 開頭) 轉為正式編號 (非 S- 開頭)，自動將「建立日期」更新為當天，以確保當月報表能正確統計為「新案」
  const oldCaseId = String(caseItem['個案編號'] || '').trim();
  const newCaseId = String(data.id || '').trim();
  if (oldCaseId.startsWith('S-') && !newCaseId.startsWith('S-')) {
    const createdColIdx = headers.indexOf('建立日期');
    if (createdColIdx >= 0) {
      rowDataArr[createdColIdx] = nowDate.toLocaleString('zh-TW');
    }
  }

  // 一次性寫回該列
  sheet.getRange(row, 1, 1, headers.length).setValues([rowDataArr]);

  // --- 連動優化：批次更新晤談紀錄 ---
  const oldName = String(caseItem['姓名'] || '').trim();
  const newName = String(data.name || '').trim();

  if ((data.id && oldCaseId !== newCaseId) || (data.name && oldName !== newName)) {
    const recordSheet = ss.getSheetByName(SHEET_RECORDS);
    const recordValues = recordSheet.getDataRange().getValues();
    const rHeaders = recordValues[0];
    const caseIdIdx = rHeaders.indexOf('個案編號');
    const studentNameIdx = rHeaders.indexOf('學生姓名');

    let changed = false;
    for (let i = 1; i < recordValues.length; i++) {
      if (String(recordValues[i][caseIdIdx] || '').trim() === oldCaseId) {
        if (data.id && caseIdIdx >= 0) recordValues[i][caseIdIdx] = newCaseId;
        if (data.name && studentNameIdx >= 0) recordValues[i][studentNameIdx] = newName;
        changed = true;
      }
    }
    
    if (changed) {
      recordSheet.getDataRange().setValues(recordValues);
    }
  }

  // 清除快取以確保下次讀取到最新資料
  CacheService.getScriptCache().remove('sheet_data_' + SHEET_CASES);
  CacheService.getScriptCache().remove('sheet_data_' + SHEET_RECORDS);

  return { success: true, message: '個案更新成功' };
}

function handleDeleteCase(data) {
  if (!checkAdminRole(data.role)) {
    return { success: false, error: '僅行政人員可刪除個案' };
  }

  const cases = getSheetData(SHEET_CASES);
  const caseItem = cases.find(c => String(c['個案編號'] || '') === String(data.id || ''));

  if (!caseItem) {
    return { success: false, error: '找不到該個案' };
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CASES);
  sheet.deleteRow(caseItem._rowIndex);
  CacheService.getScriptCache().remove('sheet_data_' + SHEET_CASES);

  return { success: true, message: '個案已刪除' };
}

/**
 * 批次轉換既有編號為 7 碼規則
 */
function handleUpdateAllCaseIds(data) {
  if (!checkAdminRole(data.role)) return { success: false, error: '權限不足' };
  
  const ss = getSpreadsheet();
  const caseSheet = ss.getSheetByName(SHEET_CASES);
  const recordSheet = ss.getSheetByName(SHEET_RECORDS);
  
  const caseValues = caseSheet.getDataRange().getValues();
  const cHeaders = caseValues[0];
  const cIdIdx = cHeaders.indexOf('個案編號');
  const cGradeIdx = cHeaders.indexOf('年級');
  const cClassIdx = cHeaders.indexOf('班級');
  const cSeatIdx = cHeaders.indexOf('座號');

  let recordValues = [];
  let rIdIdx, rCaseIdIdx;
  if (recordSheet) {
    recordValues = recordSheet.getDataRange().getValues();
    const rHeaders = recordValues[0];
    rCaseIdIdx = rHeaders.indexOf('個案編號');
  }
  
  let count = 0;
  for (let i = 1; i < caseValues.length; i++) {
    const oldId = String(caseValues[i][cIdIdx]);
    const newId = generateSystemId(caseValues[i][cGradeIdx], caseValues[i][cClassIdx], caseValues[i][cSeatIdx]);
    
    if (oldId !== newId) {
      // 1. 更新個案表陣列
      caseValues[i][cIdIdx] = newId;
      
      // 2. 更新紀錄表陣列
      for (let j = 1; j < recordValues.length; j++) {
        if (String(recordValues[j][rCaseIdIdx]) === oldId) {
          recordValues[j][rCaseIdIdx] = newId;
        }
      }
      count++;
    }
  }

  if (count > 0) {
    caseSheet.getRange(1, 1, caseValues.length, caseValues[0].length).setValues(caseValues);
    if (recordSheet && recordValues.length > 0) {
      recordSheet.getRange(1, 1, recordValues.length, recordValues[0].length).setValues(recordValues);
    }
    CacheService.getScriptCache().remove('sheet_data_' + SHEET_CASES);
    CacheService.getScriptCache().remove('sheet_data_' + SHEET_RECORDS);
  }

  return { success: true, message: `已完成 ${count} 筆個案編號轉換。` };
}

/**
 * 批次將「提報日期」欄位舊有的日期格式轉換為「提報學期」格式 (114-1)
 */
function handleUpdateAllSemesters(data) {
  if (!checkAdminRole(data.role)) return { success: false, error: '權限不足' };
  
  const ss = getSpreadsheet();
  const caseSheet = ss.getSheetByName(SHEET_CASES);
  const cases = getSheetData(SHEET_CASES);
  
  const reportCol = getColumnIndex(SHEET_CASES, '提報日期');
  
  let count = 0;
  cases.forEach(c => {
    let raw = String(c['提報日期'] || '').trim();
    // 如果長得不像 11x-x (如果是日期格式如 2024/01/01 或 2024-01-01)
    if (raw && !/^\d+-\d$/.test(raw)) {
      const date = new Date(raw);
      if (!isNaN(date.getTime())) {
        const semester = getSemester(date);
        caseSheet.getRange(c._rowIndex, reportCol).setValue(semester);
        count++;
      }
    }
  });
  CacheService.getScriptCache().remove('sheet_data_' + SHEET_CASES); // Added cache clear

  return { success: true, message: `已完成 ${count} 筆資料由日期轉換為學期格式。` };
}

// ============ 晤談紀錄（右側時間軸紀錄）============

function handleGetRecords(data) {
  ensureRecordTimeColumn();
  const records = getSheetData(SHEET_RECORDS);
  let filtered = records;

  // 1. 強制字串比對：解決「型別不一致」導致匹配不到的問題
  if (data.caseId) {
    const targetId = String(data.caseId).trim();
    filtered = records.filter(r => String(r['個案編號'] || '').trim() === targetId);
  }

  // 2. 專輔教師權限過濾
  if (data.role === '專輔教師' && data.account) {
    const user = getSheetData(SHEET_USERS).find(u => u['帳號'] === data.account);
    const userName = user ? user['姓名'] : '';
    
    const cases = getSheetData(SHEET_CASES);

    // 找出該老師負責的個案 ID (僅以專輔欄位為準)
    const myCaseIds = cases.filter(c => {
      const assigned = String(c['專輔'] || '');
      return assigned === String(data.account) || (userName && assigned === String(userName));
    }).map(c => String(c['個案編號'] || '').trim());
    
    filtered = filtered.filter(r => {
      const recordCaseId = String(r['個案編號'] || '').trim();
      return myCaseIds.includes(recordCaseId) || 
             String(r['記錄者帳號']) === String(data.account) ||
             (userName && String(r['記錄者姓名']) === String(userName));
    });
  }

  return {
    success: true,
    data: filtered.map(r => ({
      id: r['紀錄編號'],
      caseId: r['個案編號'],
      dateTime: r['日期時間'],
      time: r['時間'] || '',
      target: r['對象'],
      method: r['方式'],
      service: r['服務項目'] || '', // 新增服務項目支援
      content: r['輔導服務紀錄'],
      attachments: (() => {
        try {
          return r['附件檔案'] ? JSON.parse(r['附件檔案']) : [];
        } catch(e) {
          console.error("解析附件失敗:", r['附件檔案']);
          return [];
        }
      })(),
      recorderAccount: r['記錄者帳號'],
      recorderName: r['記錄者姓名'],
      createdAt: r['建立日期']
    }))
  };
}

function handleAddRecord(data) {
  ensureRecordTimeColumn();
  // 權限檢查：專輔教師只能為自己負責的個案新增紀錄
  if (data.role === '專輔教師') {
    const user = getSheetData(SHEET_USERS).find(u => u['帳號'] === data.account);
    const userName = user ? user['姓名'] : '';
    const cases = getSheetData(SHEET_CASES);
    const myCase = cases.find(c => {
      if (c['個案編號'] !== data.caseId) return false;
      const val = String(c['專輔'] || '');
      return val === String(data.account) || (userName && val === String(userName));
    });
    if (!myCase) {
      return { success: false, error: '您只能為自己負責的個案新增紀錄' };
    }
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  const now = new Date().toLocaleString('zh-TW');
  const id = generateId('R');

  // 重新命名附件檔案 (先更名後再存入試算表，確保檔名一致)
  if (data.attachments && Array.isArray(data.attachments)) {
    data.attachments.forEach((att, idx) => {
      try {
        const file = DriveApp.getFileById(att.fileId);
        const ext = att.fileName.split('.').pop();
        const newName = `${data.caseId}_${id}_${idx + 1}.${ext}`;
        if (att.fileName !== newName) {
           file.setName(newName);
           att.fileName = newName; // 同步更新陣列中的名稱
        }
      } catch(e) {}
    });
  }

  const attachmentsStr = data.attachments ? JSON.stringify(data.attachments) : '[]';
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => String(h).trim());
  const valuesByHeader = {
    '紀錄編號': id,
    '個案編號': data.caseId || '',
    '日期時間': data.dateTime || '',
    '時間': data.time || '',
    '對象': data.target || '',
    '方式': data.method || '',
    '輔導服務紀錄': data.content || '',
    '記錄者帳號': data.account || '',
    '記錄者姓名': data.recorderName || '',
    '服務項目': data.service || '',
    '建立日期': now,
    '附件檔案': attachmentsStr
  };
  const rowData = headers.map(header => Object.prototype.hasOwnProperty.call(valuesByHeader, header)
    ? valuesByHeader[header]
    : '');
  sheet.appendRow(rowData);
  CacheService.getScriptCache().remove('sheet_data_' + SHEET_RECORDS);

  return { success: true, message: '[v2] 晤談紀錄新增成功', id: id };
}

function handleUpdateRecord(data) {
  ensureRecordTimeColumn();
  const records = getSheetData(SHEET_RECORDS);
  const record = records.find(r => r['紀錄編號'] === data.id);

  if (!record) {
    return { success: false, error: '找不到該紀錄' };
  }

  // 權限檢查
  if (data.role === '專輔教師' && record['記錄者帳號'] !== data.account) {
    return { success: false, error: '您只能編輯自己的紀錄' };
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  const row = record._rowIndex;

  const fieldMap = {
    dateTime: '日期時間', time: '時間', target: '對象', method: '方式', content: '輔導服務紀錄', service: '服務項目', attachments: '附件檔案'
  };

  // 🎯 效能優化：批次寫回整列
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => String(h).trim());
  const rowDataArr = sheet.getRange(row, 1, 1, headers.length).getValues()[0];

  // 重新命名附件檔案 (先更名後再存入試算表，確保檔名一致)
  if (data.attachments && Array.isArray(data.attachments)) {
    data.attachments.forEach((att, idx) => {
      try {
        const caseId = record['個案編號'];
        const file = DriveApp.getFileById(att.fileId);
        const ext = att.fileName.split('.').pop();
        const newName = `${caseId}_${data.id}_${idx + 1}.${ext}`;
        if (att.fileName !== newName) {
           file.setName(newName);
           att.fileName = newName; // 同步更新陣列中的名稱
        }
      } catch(e) {}
    });
  }

  for (const [key, colName] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      const colIdx = headers.indexOf(colName);
      if (colIdx >= 0) {
        let val = data[key];
        // 🎯 確保附件是以 JSON 字串形式儲存
        if (key === 'attachments' && Array.isArray(val)) {
          val = JSON.stringify(val);
        }
        rowDataArr[colIdx] = val;
      }
    }
  }

  sheet.getRange(row, 1, 1, headers.length).setValues([rowDataArr]);
  CacheService.getScriptCache().remove('sheet_data_' + SHEET_RECORDS);

  return { success: true, message: '紀錄更新成功' };
}

function handleDeleteRecord(data) {
  const records = getSheetData(SHEET_RECORDS);
  const record = records.find(r => r['紀錄編號'] === data.id);

  if (!record) {
    return { success: false, error: '找不到該紀錄' };
  }

  // 權限：行政可刪除所有、專輔只能刪自己的
  if (data.role === '專輔教師' && record['記錄者帳號'] !== data.account) {
    return { success: false, error: '您只能刪除自己的紀錄' };
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RECORDS);
  sheet.deleteRow(record._rowIndex);

  // 刪除對應的 Google Drive 附件檔案
  const attachmentsRaw = record['附件檔案'];
  if (attachmentsRaw) {
    try {
      const attachments = JSON.parse(attachmentsRaw);
      attachments.forEach(att => {
        try {
          DriveApp.getFileById(att.fileId).setTrashed(true);
        } catch(e) { console.error('Failed to trash file:', att.fileId); }
      });
    } catch(e) {}
  }

  CacheService.getScriptCache().remove('sheet_data_' + SHEET_RECORDS);

  return { success: true, message: '紀錄已刪除' };
}

// ============ 儀表板統計 ============

function handleGetDashboard(data) {
  ensureRecordTimeColumn();
  const casesRaw = getSheetData(SHEET_CASES);
  const classes = getSheetData(SHEET_CLASSES);
  const allUsers = getSheetData(SHEET_USERS);

  // 🎯 效能優化：單獨讀取紀錄表的元資訊欄位（不含大段文字的「輔導服務紀錄」）
  const records = getSheetData(SHEET_RECORDS);

  // 建立班級配置地圖以加速查詢 (O(1) 替代 O(n))
  const classMap = {};
  classes.forEach(c => {
    classMap[`${c['年級']}_${c['班級']}`] = c;
  });

  // 動態整合班級配置的人員
  const cases = casesRaw.map(c => {
    const cfg = classMap[`${c['年級']}_${c['班級']}`];
    return {
      ...c,
      '導師': cfg ? cfg['導師'] : '-',
      '班輔': cfg ? cfg['班輔'] : '-',
      '專輔': c['專輔'] || (cfg ? cfg['專輔'] : '-')
    };
  });

  let myCases = cases;
  let myRecords = records;

  // 專輔教師權限：嚴格篩選負責個案
  if (data.role === '專輔教師' && data.account) {
    const user = allUsers.find(u => u['帳號'] === data.account);
    const userName = user ? user['姓名'] : '';
    myCases = cases.filter(c => {
      const val = String(c['專輔'] || '');
      return val === String(data.account) || (userName && val === String(userName));
    });
    const myCaseIds = new Set(myCases.map(c => String(c['個案編號']))); // 使用 Set 加速
    myRecords = records.filter(r => myCaseIds.has(String(r['個案編號'])));
  }

  const activeCases = myCases.filter(c => c['狀態'] === '進行中').length;
  const closedCases = myCases.filter(c => c['狀態'] === '已結案').length;
  const observingCases = myCases.filter(c => c['狀態'] === '觀察中').length;

  // 本月紀錄數 (排除「單純紀錄」以對齊正式月報表)
  const today = new Date();
  const thisYear = today.getFullYear();
  const thisMonth = today.getMonth() + 1; // 1-12
  const monthlyRecords = myRecords.filter(r => {
    // 🎯 核心過濾：只要包含「純紀錄」字眼即排除（相容舊有的長標籤）
    if (String(r['服務項目'] || '').includes('純紀錄')) return false;

    const dStr = String(r['日期時間'] || r['建立日期'] || '');
    if (!dStr) return false;
    const rd = new Date(dStr);
    return rd.getFullYear() === thisYear && (rd.getMonth() + 1) === thisMonth;
  }).length;

  // 個案類型統計
  const typeStatsMap = {};
  myCases.forEach(c => {
    const types = String(c['個案類型'] || '未分類').split(',');
    types.forEach(t => {
      const trimmed = t.trim();
      if (trimmed) typeStatsMap[trimmed] = (typeStatsMap[trimmed] || 0) + 1;
    });
  });
  
  // 🎯 需求優化：依人數多到少排序
  const typeStats = Object.entries(typeStatsMap)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const recentRecords = myRecords
    .sort((a, b) => {
      const tA = parseStable(a['日期時間']);
      const tB = parseStable(b['日期時間']);
      if (tB !== tA) return tB - tA; // 主排序：最新日期在前面
      
      const cA = parseStable(a['建立日期']);
      const cB = parseStable(b['建立日期']);
      return cB - cA; // 次排序：最新建立在前面
    })
    .slice(0, 20)
   .map(r => {
      // 🎯 Boy Scout Rule: 忽略編號中的連字號進行比對，解決「未知」姓名問題
      const rId = String(r['個案編號'] || '').replace(/-/g, '');
      const studentCase = myCases.find(c => String(c['個案編號'] || '').replace(/-/g, '') === rId);
      return {
        id: r['紀錄編號'], 
        caseId: r['個案編號'], 
        studentName: studentCase ? studentCase['姓名'] : '未知',
        dateTime: r['日期時間'] || r['建立日期'], 
        time: r['時間'] || '',
        target: r['對象'], 
        method: r['方式'],
        service: r['服務項目'],
        recorderName: r['記錄者姓名']
      };
    });

  const counselorList = allUsers
    .filter(u => u['狀態'] === '啟用' && u['身份'] === '專輔教師')
    .map(u => u['姓名']);

  // 統一映射為前端英文 Key
  // 💡 效能優化：只回傳列表與篩選需要的欄位，重型文字留給 getCaseDetail
  const mappedCases = myCases.map(c => {
    const cfg = classMap[`${c['年級']}_${c['班級']}`];
    return mapCaseToFrontend(c, cfg);
  });

  return {
    success: true,
    data: {
      cases: mappedCases,
      totalCases: mappedCases.length,
      activeCases,
      observingCases,
      closedCases,
      monthlyRecords,
      typeStats,
      recentRecords,
      configs: {
        allCounselors: [...new Set(counselorList)],
        classes: classes, // 確保前端設定頁面可以取得班級配置
        systemSettings: getSheetData(SHEET_SETTINGS)
      }
    }
  };
}

// ============ 取得個案完整詳情 (含綜述文字) ============

function handleGetCaseFull(data) {
  const caseId = data.caseId || data.id;
  if (!caseId) return { success: false, error: '未提供個案編號' };

  const detailRes = handleGetCaseDetail({ id: caseId, ...data });
  if (!detailRes.success) return detailRes;

  const recordsRes = handleGetRecords({ caseId: caseId, ...data });

  return {
    success: true,
    data: {
      detail: detailRes.data,
      records: recordsRes.success ? recordsRes.data : []
    }
  };
}

function handleGetCaseDetail(data) {
  const { id, sheetName } = data;
  if (!id) return { success: false, error: '未提供個案編號' };

  let c;
  let cfg = null;

  if (sheetName && sheetName !== SHEET_CASES) {
    // 從歷史分頁讀取
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, error: '找不到該歷史工作表' };
    const historyData = getSheetData(sheetName);
    c = historyData.find(u => String(u['個案編號']) === String(id));
  } else {
    const cases = getSheetData(SHEET_CASES);
    c = cases.find(u => String(u['個案編號']) === String(id));
    
    // 查找班級配置 (僅當前個案有配置)
    if (c) {
      const classes = getSheetData(SHEET_CLASSES);
      cfg = classes.find(cl => cl['年級'] === c['年級'] && cl['班級'] === c['班級']);
    }
  }

  if (!c) return { success: false, error: '找不到該個案' };

  return {
    success: true,
    data: mapCaseToFrontend(c, cfg)
  };
}

// ============ 月報表資料 ============

function handleGetMonthlyReportData(data) {
  ensureRecordTimeColumn();
  const { year, month, role, account } = data;
  if (!year || !month) return { success: false, error: '缺少年月參數' };

  const casesRaw = getSheetData(SHEET_CASES);
  const recordsRaw = getSheetData(SHEET_RECORDS);
  const allUsers = getSheetData(SHEET_USERS);

  // 🎯 建立 帳號 -> 教師編碼 的對照表
  const userMap = {};
  allUsers.forEach(u => {
    userMap[String(u['帳號'])] = u['教師編碼'] || '1';
  });

  // 取得目前使用者的教師編碼
  const currentUser = allUsers.find(u => u['帳號'] === account);
  const teacherCode = currentUser ? (currentUser['教師編碼'] || '1') : '1';
  const userName = currentUser ? (currentUser['姓名'] || '') : '';

  // 專輔教師只能匯出自己負責的個案
  let myCases = casesRaw;
  if (role === '專輔教師' && account) {
    myCases = casesRaw.filter(c => {
      const val = String(c['專輔'] || '');
      return val === String(account) || (userName && val === String(userName));
    });
  }

  const myCaseIds = new Set(myCases.map(c => String(c['個案編號'])));
  
  // 篩選指定年月的紀錄
  const targetYear = parseInt(year, 10);
  const targetMonth = parseInt(month, 10);

  const monthlyRecords = recordsRaw.filter(r => {
    const cId = String(r['個案編號']);
    if (!myCaseIds.has(cId)) return false;

    // 🎯 只要編號以 S- 開頭，就排除在月報表之外
    if (cId.startsWith('S-')) return false;
    
    const dStr = String(r['日期時間'] || r['建立日期'] || '');
    if (!dStr) return false;
    const rd = new Date(dStr);
    return rd.getFullYear() === targetYear && (rd.getMonth() + 1) === targetMonth;
  }).map(r => ({
    id: String(r['紀錄編號'] || ''),
    caseId: String(r['個案編號'] || ''),
    studentName: r['學生姓名'],
    dateTime: r['日期時間'] || r['建立日期'],
    time: r['時間'] || '',
    target: r['對象'],
    method: r['方式'],
    service: r['服務項目'] || '',
    content: r['輔導服務紀錄'],
    recorderAccount: r['記錄者帳號'],
    recorderName: r['記錄者姓名'],
    teacherCode: userMap[String(r['記錄者帳號'])] || '1' // 注入老師編碼
  }));

  const mappedCases = myCases.map(c => {
    const cId = String(c['個案編號'] || '');

    // 判斷新舊案：個案「建立日期」在該月份內 → 新案(1)；否則 → 舊案(2)
    const caseCreatedStr = c['建立日期'];
    let isNew = 2; // 預設舊案
    if (caseCreatedStr) {
      const cd = new Date(parseStable(caseCreatedStr));
      if (!isNaN(cd.getTime())) {
        if (cd.getFullYear() === targetYear && (cd.getMonth() + 1) === targetMonth) {
          isNew = 1; // 該月建立 → 新案
        }
      }
    }

    return {
      id: cId,
      grade: String(c['年級'] || ''),
      class: String(c['班級'] || ''),
      seatNo: String(c['座號'] || ''),
      name: String(c['姓名'] || ''),
      gender: String(c['性別'] || ''),
      counselor: String(c['專輔'] || ''),
      caseType: String(c['個案類型'] || ''),
      caseSource: String(c['個案來源'] || ''),
      specialEdu: c['特教身分'] || '',
      identity: c['身分背景'] || '',
      status: c['狀態'] || '進行中',
      // 對齊月報表需求：抽取狀態編號 (1, 2, 3, 4)
      referralStatus: (function() {
        const mapped = mapCaseToFrontend(c, null, new Date(targetYear, targetMonth - 1, 1));
        const match = String(mapped.referralStatus).match(/^(\d)/);
        return match ? match[1] : '2';
      })(),
      isNew: isNew
    };
  });

  return {
    success: true,
    data: {
      records: monthlyRecords,
      cases: mappedCases,
      teacherCode: teacherCode
    }
  };
}

/**
 * 根據雲端硬碟相對路徑尋找檔案 (遞迴尋找)
 */
function getFileByPath(pathStr) {
  const parts = pathStr.split('/').filter(Boolean);
  let currentFolder = DriveApp.getRootFolder();
  
  for (let i = 0; i < parts.length - 1; i++) {
    const folders = currentFolder.getFoldersByName(parts[i]);
    if (folders.hasNext()) {
      currentFolder = folders.next();
    } else {
      return null;
    }
  }
  
  const files = currentFolder.getFilesByName(parts[parts.length - 1]);
  if (files.hasNext()) {
    return files.next();
  }
  return null;
}

/**
 * 讀取空白月報表 Excel 範本並轉換成 Base64 回傳前端
 */
function handleGetMonthlyReportTemplate(data) {
  if (!checkAdminRole(data.role) && data.role !== '專輔教師') {
    return { success: false, error: '權限不足' };
  }
  
  try {
    const path = "工作/0輔導組長/00行政業務/00系統回報及索資(輔導月報+二代+會計公務+就學)/【每月】輔導月報表/輔導教師工作成果表格-空白.xlsx";
    const file = getFileByPath(path);
    if (!file) {
      return { success: false, error: '找不到空白月報表範本，請確認已放置於 Google Drive 指定路徑下：\n工作/0輔導組長/00行政業務/00系統回報及索資(輔導月報+二代+會計公務+就學)/【每月】輔導月報表/輔導教師工作成果表格-空白.xlsx' };
    }
    
    const bytes = file.getBlob().getBytes();
    const base64 = Utilities.base64Encode(bytes);
    
    return {
      success: true,
      base64: base64
    };
  } catch (e) {
    return { success: false, error: '讀取範本失敗：' + e.message };
  }
}

// ============ 配置管理 ============

function handleSaveConfig(data) {
  if (!checkAdminRole(data.role)) return { success: false, error: '權限不足' };
  
  const ss = getSpreadsheet();
  if (data.configType === 'classes') {
    const sheet = ss.getSheetByName(SHEET_CLASSES);
    sheet.clearContents();
    sheet.getRange(1, 1, 1, HEADERS[SHEET_CLASSES].length).setValues([HEADERS[SHEET_CLASSES]]);
    if (data.items && data.items.length) {
      const rows = data.items.map(it => [it.grade, it.class, it.homeroom, it.classGuidance, it.counselor]);
      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
  }
  CacheService.getScriptCache().remove('sheet_data_' + SHEET_CLASSES); // Added cache clear

  return { success: true, message: '配置儲存成功' };
}

// ============ 工具函式 ============

/**
 * 系統健檢：偵測資料不一致問題 (Data Integrity Check)
 */
function handleCheckIntegrity(data) {
  if (!checkAdminRole(data.role)) {
    return { success: false, error: '權限不足，僅限管理員執行健檢' };
  }

  const cases = getSheetData(SHEET_CASES);
  const records = getSheetData(SHEET_RECORDS);
  
  const report = {
    orphans: [],      // 資料孤兒 (紀錄找不到個案)
    duplicates: [],   // 重複編號
    invalidIds: [],   // 格式錯誤編號 (非 7 碼)
    missingFields: [], // 關鍵欄位缺失
    logicErrors: [],   // 紀錄配對邏輯錯誤
    orphanAttachments: [], // 孤兒附件 (雲端有，紀錄沒引用)
    totalCases: cases.length,
    totalRecords: records.length,
    timestamp: new Date().toISOString()
  };

  const caseIds = new Set();
  const duplicateSet = new Set();

  // 1. 檢查個案檔
  cases.forEach((c, idx) => {
    const id = String(c['個案編號'] || '').trim();
    if (!id) {
      report.missingFields.push({ type: '個案', row: idx + 2, detail: '個案編號空白' });
      return;
    }

    // 檢查編號格式 (114-0118 規範 / 暫時編號 S- 開頭不列入錯誤)
    if (!id.startsWith('S-') && !/^\d{3}-\d{4}$/.test(id)) {
      report.invalidIds.push({ id, name: c['姓名'], row: idx + 2 });
    }

    // 檢查重複編號
    if (caseIds.has(id)) {
      if (!duplicateSet.has(id)) {
        report.duplicates.push({ id, name: c['姓名'] });
        duplicateSet.add(id);
      }
    } else {
      caseIds.add(id);
    }

    // 檢查關鍵欄位 (姓名、年級、班級)
    if (!c['姓名'] || !c['年級'] || !c['班級']) {
      report.missingFields.push({ type: '個案', id, name: c['姓名'] || '(未填)', detail: '基本資料缺漏' });
    }
  });

  // 2. 檢查紀錄檔
  records.forEach((r, idx) => {
    const id = String(r['個案編號'] || '').trim();
    if (!id) {
      report.missingFields.push({ type: '紀錄', row: idx + 2, detail: '紀錄中個案編號空白' });
      return;
    }

    // 檢查資料孤兒 (紀錄表中存在的 ID 在個案表中找不到)
    if (!caseIds.has(id)) {
      report.orphans.push({ id, date: r['日期時間'] || '(未填)', row: idx + 2 });
    }

    // 🎯 邏輯檢查：僅針對 2026/4/1 以後的紀錄
    const LOGIC_CHECK_CUTOFF = new Date('2026-04-01');
    const recDateRaw = r['日期時間'] || r['建立日期'] || '';
    const recDate = recDateRaw ? new Date(recDateRaw) : new Date(0);

    if (recDate >= LOGIC_CHECK_CUTOFF) {
      const sStr = String(r['服務項目'] || '').trim();
      const tStr = String(r['對象'] || '').trim();

      if (sStr && !sStr.includes('純紀錄')) {
        const sArr = sStr.split(',').map(s => s.trim());
        const tArr = tStr.split(',').map(s => s.trim());
        const maxLen = Math.max(sArr.length, tArr.length);
        let logicError = false;
        for (let i = 0; i < maxLen; i++) {
          const s = sArr[i] || '';
          const t = tArr[i] || '';
          const sc = parseInt(s.match(/^\d+/)?.[0]);
          if (sc === 3 && !t.includes('家長')) logicError = true;
          if (sc === 4 && !t.includes('教職員')) logicError = true;
          if (sc === 0 && !t.includes('學生')) logicError = true;
          if (t.includes('11.學生')) logicError = true;
        }
        if (logicError) {
          report.logicErrors.push({ row: idx + 2, id, date: r['日期時間'] || '(未填)' });
        }
      }
    }
  });

  // 3. 檢查孤兒附件 (雲端硬碟中有，但試算表中沒紀錄)
  const usedFileIds = new Set();
  records.forEach(r => {
    if (r['附件檔案']) {
      try {
        const atts = JSON.parse(r['附件檔案']);
        atts.forEach(a => { if (a.fileId) usedFileIds.add(a.fileId); });
      } catch(e) {}
    }
  });

  try {
    const folderName = "個案管理系統_附件";
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      const folder = folders.next();
      const files = folder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        const fid = file.getId();
        if (!usedFileIds.has(fid)) {
          // ⚠️ 排除剛建立不久的檔案 (例如 10 分鐘內)，避免使用者正在編輯時被刪除
          const ageInMinutes = (new Date() - file.getDateCreated()) / (1000 * 60);
          if (ageInMinutes > 10) {
            report.orphanAttachments.push({ id: fid, name: file.getName() });
          }
        }
      }
    }
  } catch(e) {
    console.error('掃描附件失敗', e);
  }

  const hasIssues = report.orphans.length > 0 || 
                    report.duplicates.length > 0 || 
                    report.invalidIds.length > 0 || 
                    report.missingFields.length > 0 ||
                    report.logicErrors.length > 0 ||
                    report.orphanAttachments.length > 0;

  return { 
    success: true, 
    report, 
    hasIssues,
    message: hasIssues ? '發現資料一致性問題' : '系統資料目前非常健康' 
  };
}

/**
 * 執行一鍵修復資料邏輯 (處方箋)
 */
function handleRepairData(data) {
  if (!checkAdminRole(data.role)) return { success: false, error: '權限不足' };
  
  const repairType = data.repairType || 'all';
  const repairAll = repairType === 'all';
  
  const ss = getSpreadsheet();
  const casesSheet = ss.getSheetByName(SHEET_CASES);
  const recordsSheet = ss.getSheetByName(SHEET_RECORDS);
  
  const casesRange = casesSheet.getDataRange();
  const casesValues = casesRange.getValues();
  const casesHeaders = casesValues[0].map(h => String(h).trim());
  const idColIdx = casesHeaders.indexOf('個案編號');
  
  const recordsRange = recordsSheet.getDataRange();
  const recordsValues = recordsRange.getValues();
  const recordsHeaders = recordsValues[0].map(h => String(h).trim());
  const recIdColIdx = recordsHeaders.indexOf('個案編號');
  
  let repairCount = 0;
  
  // 1. 修復個案檔：統一編號格式 (不限 repairType)
  if (repairAll || repairType === 'invalidIds') {
  for (let i = 1; i < casesValues.length; i++) {
    let id = String(casesValues[i][idColIdx] || '').trim();
    if (!id) continue;
    
    // ⚠️ 保護暫存編號 (S- 開頭)，絕對不修改
    if (id.startsWith('S-')) continue;
    
    // 正確格式為 XXX-XXXX
    if (/^\d{3}-\d{4}$/.test(id)) continue;
    
    // 嘗試修復 (如果是 7 位純數字)
    if (/^\d{7}$/.test(id)) {
      const fixed = id.slice(0, 3) + '-' + id.slice(3);
      casesSheet.getRange(i + 1, idColIdx + 1).setValue(fixed);
      repairCount++;
    }
    // 其他格式（含連字號但不符規範等）→ 不動，由人工確認
  }
  
  }  // end if invalidIds
  
  // 3. 修復紀錄檔：對齊編號格式 & 校正服務對象配對邏輯
  const serviceColIdx = recordsHeaders.indexOf('服務項目');
  const targetColIdx = recordsHeaders.indexOf('對象');

  for (let i = 1; i < recordsValues.length; i++) {
    let id = String(recordsValues[i][recIdColIdx] || '').trim();
    if (!id) continue;

    // ⚠️ 保護暫存編號 (S- 開頭)，絕對不修改
    if (id.startsWith('S-')) continue;

    let rowChanged = false;

    // A. 編號校正
    if (repairAll || repairType === 'invalidIds') {
      if (!/^\d{3}-\d{4}$/.test(id)) {
        if (/^\d{7}$/.test(id)) {
          id = id.slice(0, 3) + '-' + id.slice(3);
          recordsSheet.getRange(i + 1, recIdColIdx + 1).setValue(id);
          rowChanged = true;
        }
        // 其他格式不強制修改，避免誤改
      }
    } // end invalidIds guard

    // B. 服務對象邏輯校正（僅限 2026/4/1 後的紀錄）
    if (repairAll || repairType === 'logicErrors') {
      const dateColIdx = recordsHeaders.indexOf('日期時間');
      const createdColIdx = recordsHeaders.indexOf('建立日期');
      const rawDate = recordsValues[i][dateColIdx] || recordsValues[i][createdColIdx] || 0;
      const LOGIC_CUTOFF = new Date('2026-04-01');
      const recDate = rawDate ? new Date(rawDate) : new Date(0);
      const sStr = String(recordsValues[i][serviceColIdx] || '');
      const tStr = String(recordsValues[i][targetColIdx] || '');

      if (sStr && tStr && !sStr.includes('純紀錄') && recDate >= LOGIC_CUTOFF) {
        const sArr = sStr.split(',').map(s => s.trim());
        const tArr = tStr.split(',').map(s => s.trim());
        const maxLen = Math.max(sArr.length, tArr.length);
        let logicChanged = false;

        for (let j = 0; j < maxLen; j++) {
          const s = sArr[j] || '';
          let t = tArr[j] || '';
          const gender = t.match(/\[(.*?)\]/)?.[0] || '';
          const sc = parseInt(s.match(/^\d+/)?.[0]);

          if (t.includes('11.學生')) {
            t = t.replace('11.學生', '學生');
            logicChanged = true;
          }
          if (sc === 3 && !t.includes('家長')) {
            t = `14.家長${gender}`;
            logicChanged = true;
          } else if (sc === 4 && !t.includes('教職員')) {
            t = `13.教職員${gender}`;
            logicChanged = true;
          } else if (sc === 0 && !t.includes('學生')) {
            t = `學生${gender}`;
            logicChanged = true;
          }
          if (logicChanged) tArr[j] = t;
        }

        if (logicChanged) {
          recordsSheet.getRange(i + 1, targetColIdx + 1).setValue(tArr.join(', '));
          rowChanged = true;
        }
      }
    } // end logicErrors guard

    if (rowChanged) repairCount++;
  }

  
  SpreadsheetApp.flush();
  
  // 3. 清理孤兒附件 (再次掃描並直接刪除)
  let orphanCount = 0;
  try {
    const recordsData = getSheetData(SHEET_RECORDS);
    const usedFileIds = new Set();
    recordsData.forEach(r => {
      if (r['附件檔案']) {
        try {
          const atts = JSON.parse(r['附件檔案']);
          atts.forEach(a => { if (a.fileId) usedFileIds.add(a.fileId); });
        } catch(e) {}
      }
    });

    const folderName = "個案管理系統_附件";
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      const folder = folders.next();
      const files = folder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        const fid = file.getId();
        if (!usedFileIds.has(fid)) {
          const ageInMinutes = (new Date() - file.getDateCreated()) / (1000 * 60);
          if (ageInMinutes > 10) { // 同樣保留 10 分鐘寬限期
            file.setTrashed(true);
            orphanCount++;
          }
        }
      }
    }
  } catch(e) {
    console.error('清理附件失敗', e);
  }

  CacheService.getScriptCache().removeAll(['sheet_data_' + SHEET_CASES, 'sheet_data_' + SHEET_RECORDS]);

  let msg = `修復完成！共校正了 ${repairCount} 處資料異常點。`;
  if (orphanCount > 0) msg += ` 同時清理了 ${orphanCount} 個孤兒附件。`;
  return { success: true, message: msg };
}

function checkAdminRole(role) {
  return role === '管理員';
}

function handleResetSystem(data) {
  if (!checkAdminRole(data.role)) return { success: false, error: '權限不足' };
  
  const ss = getSpreadsheet();
  const targets = [SHEET_CASES, SHEET_RECORDS]; // 僅重置個案與紀錄，保留帳號與配置
  
  targets.forEach(name => {
    const sheet = ss.getSheetByName(name);
    sheet.clearContents();
    const h = HEADERS[name];
    sheet.getRange(1, 1, 1, h.length).setValues([h]);
    CacheService.getScriptCache().remove('sheet_data_' + name); // Added cache clear for each target
  });
  
  return { success: true, message: '系統資料已歸零並套用新欄位結構' };
}

// ============ 批次操作 ============

function handleBatchUpdate(data) {
  const { ids, field, value } = data;
  if (!ids || !ids.length) return { success: false, error: '未選取個案' };

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CASES);
  const dataRange = sheet.getDataRange().getValues();
  const headers = dataRange[0];
  const colIdx = headers.indexOf(field);
  const lastUpdateIdx = headers.indexOf('最後更新');
  
  if (colIdx === -1) return { success: false, error: '無效的欄位：' + field };

  const targetIds = ids.map(id => String(id));
  let count = 0;
  const now = new Date();

  for (let i = 1; i < dataRange.length; i++) {
    const caseId = String(dataRange[i][0]);
    if (targetIds.includes(caseId)) {
      dataRange[i][colIdx] = value;
      if (lastUpdateIdx !== -1) {
        dataRange[i][lastUpdateIdx] = now;
      }
      count++;
    }
  }

  if (count > 0) {
    sheet.getRange(1, 1, dataRange.length, dataRange[0].length).setValues(dataRange);
    CacheService.getScriptCache().remove('sheet_data_' + SHEET_CASES);
  }
  
  return { success: true, message: `成功更新 ${count} 筆個案` };
}

function handleBatchDelete(data) {
  const { ids } = data;
  if (!ids || !ids.length) return { success: false, error: '未選取個案' };

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CASES);
  const dataRange = sheet.getDataRange().getValues();
  const targetIds = ids.map(id => String(id));

  // 🎯 效能優化：不使用 deleteRow 迴圈，改用記憶體過濾後寫回
  const headers = dataRange[0];
  const newRows = dataRange.filter((row, i) => {
    if (i === 0) return true; // 保留標題
    const caseId = String(row[0]);
    return !targetIds.includes(caseId);
  });

  const count = dataRange.length - newRows.length;
  if (count > 0) {
    sheet.clearContents();
    sheet.getRange(1, 1, newRows.length, headers.length).setValues(newRows);
    CacheService.getScriptCache().remove('sheet_data_' + SHEET_CASES);
  }
  
  return { success: true, message: `成功刪除 ${count} 筆個案` };
}

// ============ 資料重整與修復 ============

/**
 * 💡 後台手動執行入口：
 * 在 GAS 編輯器上方選取此函式並點擊「執行」，即可一鍵整理所有資料。
 */
function manualRunAlignment() {
  const result = handleDataAlignment({ role: '行政' });
  Logger.log(result.message);
}

function handleDataAlignment(data) {
  if (!checkAdminRole(data.role)) return { success: false, error: '權限不足' };
  
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CASES);
  const rawData = sheet.getDataRange().getValues();
  if (rawData.length <= 1) return { success: true, message: '目前尚無個案資料可整理。' };

  const oldHeaders = rawData[0];
  const newHeaders = HEADERS[SHEET_CASES];
  
  // 目前系統標準選項清單 (依欄位區分)
  const masterOpts = {
    '個案類型': [
      '1.學習困擾', '2.人際困擾', '3.自傷行為', '4.偏差行為', '5.情緒困擾', 
      '6.中輟背景', '7.一般個案', '8.情緒困擾', '9.霸凌行為', '10.高風險', 
      '11.家暴背景', '12.學習困擾', '13.心理困擾', '14.人際衝突', '15.偏差行為', 
      '16.中離(輟)拒學', '17.網路霸凌', '18.精神疾患', '19.其他'
    ],
    '個案服務方式': [
      '1.團體輔導', '2.入班輔導', '3.家長諮詢', '4.教師諮詢', '5.個案會議',
      '6.心理測驗', '7.安心服務', '8.家庭處遇', '9.資源連結', '10.系統會談',
      '11.學生諮詢', '12.臨案協處', '13.方案計畫', '14.各項宣講', '15.危機處理',
      '16.轉銜輔導', '17.其他'
    ],
    '身分背景': [
      '1.新住民子女', '2.低收入戶', '3.中低收入戶', '4.身心障礙', '5.原住民', 
      '6.單親家庭', '7.隔代教養', '8.外配子女', '9.兒少保護', '10.其他'
    ]
  };

  // 1. 建立索引映射
  const oldMap = {};
  oldHeaders.forEach((h, i) => { if (h) oldMap[h] = i; });
  
  // 2. 智能對齊與格式化
  const newRows = rawData.slice(1).map(oldRow => {
    return newHeaders.map(h => {
      let val = (oldMap[h] !== undefined) ? oldRow[oldMap[h]] : '';
      
      // 核心補全邏輯：處理個案類型、服務方式、身分背景
      if (['個案類型', '個案服務方式', '身分背景'].indexOf(h) !== -1 || h.includes('內容')) {
        let combineVal = val;
        // 如果目前是身分背景，則嘗試併入原本的家庭狀況
        if (h === '身分背景' && oldMap['家庭狀況'] !== undefined) {
          const oldFamily = oldRow[oldMap['家庭狀況']];
          if (oldFamily) combineVal += ',' + oldFamily;
        }
        
        if (combineVal) {
          // 支援使用全形頓號分隔的舊資料 (例如：小團體、學扶)，然後打散
          const rawItems = String(combineVal).replace(/、/g, ',').split(',').map(s => s.trim()).filter(Boolean);
          
          let translatedItems = [];
          rawItems.forEach(s => {
             // 舊版服務方式智慧轉換地圖
             const oldServiceMap = {
               '特教介入': '09.資源連結', '特教主責': '09.資源連結',
               '個案輔導': '11.學生諮詢', '個案晤談': '11.學生諮詢',
               '固定個案': '11.學生諮詢', '不定期晤談': '11.學生諮詢', 
               '固定晤談': '11.學生諮詢', '個案': '11.學生諮詢',
               '晤談': '11.學生諮詢', '個輔': '11.學生諮詢', '不易晤談': '11.學生諮詢',
               '學習扶助': '9.資源連結', '學扶': '9.資源連結',
               '課堂觀察': '2.入班輔導', '課堂關懷': '2.入班輔導', '課堂': '2.入班輔導',
               '危機處理': '15.危機處理',
               '個案小團體': '1.團體輔導', '小團體觀察': '1.團體輔導',
               '小團體': '1.團體輔導', '小團輔': '1.團體輔導', '小團體輔導': '1.團體輔導',
               '追蹤觀察': '12.臨案協處', '親師面談': '3.家長諮詢',
               '醫療': '9.資源連結', '中大': '9.資源連結', '社工': '9.資源連結', 
               '資源整合': '9.資源連結', '輔導及尋求諮商': '11.學生諮詢,9.資源連結',
               '醫療.社工': '9.資源連結'
             };

             let resolved = s;
             // 如果是舊關鍵字，直接轉換為標準格式
             if (h === '個案服務方式' && oldServiceMap[s]) {
               resolved = oldServiceMap[s];
             } else {
               // 統一清除開頭數字後面多餘的「點」或「空格」，強制轉換為單點號
               resolved = s.replace(/^(\d+)[\.\s]*/, '$1.');
               
               // 模糊補全：如果開頭有數字與點，則從對應欄位的選項池中尋找
               const matchNum = resolved.match(/^(\d+)\./);
               const list = masterOpts[h];
               if (matchNum && list) {
                 const full = list.find(m => m.startsWith(matchNum[0]));
                 if (full) resolved = full;
               }
             }
             
             // 如果映射結果為多個（例如逗號分隔），將它們拆開後加入陣列
             resolved.split(',').forEach(res => {
               if(res.trim()) translatedItems.push(res.trim());
             });
          });
          val = [...new Set(translatedItems)].join(',');
        }
      }
      return val;
    });
  });
  
  // 3. 全面重刷結構
  sheet.clearContents();
  sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
  sheet.getRange(2, 1, newRows.length, newHeaders.length).setValues(newRows);
  
  return { 
    success: true, 
    message: `完成！已整理 ${newRows.length} 筆個案。已執行：號碼模糊補全、欄位對齊、去重清理。` 
  };
}

// ============ 備份、歸檔、升級 API ============

/**
 * 取得特定年級（或全部）的個案與紀錄供前端備份 (匯出 Excel / Word)
 */
function handleBackupData(data) {
  if (!checkAdminRole(data.role)) return { success: false, error: '權限不足' };
  
  const targetGrade = data.grade || '全部';
  const allCases = getSheetData(SHEET_CASES);
  const allRecords = getSheetData(SHEET_RECORDS);
  
  let targetCases = allCases;
  if (targetGrade !== '全部') {
    targetCases = allCases.filter(c => c['年級'] === targetGrade);
  }
  
  const caseIds = targetCases.map(c => String(c['個案編號']));
  const targetRecords = allRecords.filter(r => caseIds.includes(String(r['個案編號'])));
  
  return {
    success: true,
    data: {
      cases: targetCases,
      records: targetRecords
    }
  };
}

/**
 * ============================================================
 * 每月自動備份核心邏輯
 * ============================================================
 */

/**
 * 核心自動執行函式 (由 Time Trigger 呼叫)
 */
/**
 * 💡 確保 Google Apps Script 自動偵測並包含必要的 OAuth 權限範圍：
 * 這是為了防止 Time-driven Trigger 在背景執行 UrlFetchApp 時遇到 401/403 權限不足問題。
 * 
 * DriveApp.getFiles(); 
 * SpreadsheetApp.getActiveSpreadsheet(); 
 * UrlFetchApp.fetch("");
 */

/**
 * 核心自動執行函式 (由 Time Trigger 呼叫)
 */
function autoBackupMonthly() {
  // 🎯 型態安全防禦：防止試算表將 'true' 自動存成布林值 TRUE，導致 === 'true' 判定失效
  const enabled = String(getSetting('BACKUP_ENABLED')).toLowerCase() === 'true';
  const email = getSetting('BACKUP_EMAIL');
  
  if (!enabled || !email) {
    console.warn('自動備份未啟用或未填寫信箱。');
    return;
  }

  try {
    const ss = getSpreadsheet();
    // 🎯 效能與資料完整性優化：在匯出 Excel 前，強制將記憶體中所有待寫入資料同步至試算表
    SpreadsheetApp.flush();
    
    const id = ss.getId();
    // 使用 Google Sheets 的導出 URL
    const url = "https://docs.google.com/spreadsheets/d/" + id + "/export?format=xlsx";
    const token = ScriptApp.getOAuthToken();
    const response = UrlFetchApp.fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    const dateStr = Utilities.formatDate(new Date(), "GMT+8", "yyyyMMdd");
    const monthStr = Utilities.formatDate(new Date(), "GMT+8", "yyyy/MM");
    const fileName = `個案管理系統_全體備份_${dateStr}.xlsx`;
    const blob = response.getBlob().setName(fileName);

    MailApp.sendEmail({
      to: email,
      subject: `【系統自動備份】${ss.getName()} 資料庫備份 - ${monthStr}`,
      body: `您好：\n\n這是一份系統自動產生的每月資料庫備份（Excel 格式）。\n由系統排程於每月 1 號自動執行。\n\n產生時間：${new Date().toLocaleString('zh-TW')}\n包含所有個案、紀錄與系統設定。`,
      attachments: [blob]
    });
    
    console.log('每月自動備份發送成功: ' + email);
  } catch (e) {
    console.error('自動備份發送失敗:', e.message);
  }
}

/**
 * 更新備份設定與觸發器
 */
function handleUpdateBackupSettings(data) {
  if (!checkAdminRole(data.role)) return { success: false, error: '權限不足' };
  
  const { backupEmail, backupEnabled } = data;
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_SETTINGS);
  
  // 如果工作表不存在，則建立
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SETTINGS);
  }

  // 取得現有資料 (含標題)
  let lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    // 初始化標題
    sheet.appendRow(['設定項目', '設定值']);
    lastRow = 1;
  }
  
  const settingsData = sheet.getRange(1, 1, lastRow, 2).getValues();
  
  // 更新或回寫 (支援自動新增項目)
  const updateSet = (key, val) => {
    const idx = settingsData.findIndex(row => row[0] === key);
    if (idx !== -1) {
      sheet.getRange(idx + 1, 2).setValue(String(val));
    } else {
      sheet.appendRow([key, String(val)]);
    }
  };

  updateSet('BACKUP_EMAIL', backupEmail || '');
  updateSet('BACKUP_ENABLED', String(!!backupEnabled));
  
  // 管理錄屬觸發器
  const handler = 'autoBackupMonthly';
  const triggers = ScriptApp.getProjectTriggers();
  
  if (!!backupEnabled && backupEmail) {
    if (!triggers.some(t => t.getHandlerFunction() === handler)) {
      setupBackupTrigger();
    }
  } else {
    triggers.forEach(t => {
      if (t.getHandlerFunction() === handler) ScriptApp.deleteTrigger(t);
    });
  }
  
  // 強制清除所有相關快取，確保重新整理後能看到新設定
  const cache = CacheService.getScriptCache();
  cache.remove('sheet_data_' + SHEET_SETTINGS);
  
  return { success: true, message: '備份設定已更新' + (!!backupEnabled ? '，自動排程已啟動。' : '，自動排程已暫停。') };
}

/**
 * 確保觸發器存在
 */
function setupBackupTrigger() {
  const handler = 'autoBackupMonthly';
  const triggers = ScriptApp.getProjectTriggers();
  const exists = triggers.some(t => t.getHandlerFunction() === handler);
  
  if (!exists) {
    // 建立每月 1 號凌晨 3 點備份
    ScriptApp.newTrigger(handler)
      .timeBased()
      .onMonthDay(1)
      .atHour(3)
      .create();
  }
}

/**
 * 測試發送
 */
function handleTestBackupEmail(data) {
  if (!checkAdminRole(data.role)) return { success: false, error: '權限不足' };
  
  const email = data.backupEmail;
  if (!email) return { success: false, error: '請填寫測試信箱' };

  try {
    const ss = getSpreadsheet();
    // 🎯 資料完整性優化：測試發送前排空記憶體緩衝區
    SpreadsheetApp.flush();
    
    const id = ss.getId();
    const url = "https://docs.google.com/spreadsheets/d/" + id + "/export?format=xlsx";
    const token = ScriptApp.getOAuthToken();
    const response = UrlFetchApp.fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const blob = response.getBlob().setName(`個案系統_手動測試備份_${Utilities.formatDate(new Date(), "GMT+8", "yyyyMMdd")}.xlsx`);
    
    MailApp.sendEmail({
      to: email,
      subject: `【手動測試】${ss.getName()} 備份功能測試`,
      body: `這是一封由管理員 ${data.recorderName} 觸發的測試郵件，附件為目前的資料庫備份副本。`,
      attachments: [blob]
    });
    
    return { success: true, message: '測試郵件已發送至 ' + email + '，請查收收件匣。' };
  } catch (e) {
    return { success: false, error: '發送測試信失敗：' + e.message };
  }
}

/**
 * 九年級畢業歸檔：將該學年度的九年級資料移至新的歷史分頁
 */
function handleArchiveGraduates(data) {
  if (!checkAdminRole(data.role)) return { success: false, error: '權限不足' };
  
  const ss = getSpreadsheet();
  const caseSheet = ss.getSheetByName(SHEET_CASES);
  const recordSheet = ss.getSheetByName(SHEET_RECORDS);
  ensureRecordTimeColumn();
  
  const now = new Date();
  let sy = now.getFullYear() - 1911; // 目前學年度的計算基準，視乎執行月份
  if (now.getMonth() + 1 < 8) sy -= 1; // 8月前算前一學年度
  const archiveCaseSheetName = `${sy}畢業-個案`;
  const archiveRecordSheetName = `${sy}畢業-服務`;
  
  let archCaseSheet = ss.getSheetByName(archiveCaseSheetName);
  if (!archCaseSheet) {
    archCaseSheet = ss.insertSheet(archiveCaseSheetName);
    archCaseSheet.getRange(1, 1, 1, HEADERS[SHEET_CASES].length).setValues([HEADERS[SHEET_CASES]]).setFontWeight('bold');
    archCaseSheet.setFrozenRows(1);
  } else {
    // 🛡️ 確保封存表的欄位數與主表一致 (處理新增欄位情況)
    const archHeaders = archCaseSheet.getRange(1, 1, 1, archCaseSheet.getLastColumn()).getValues()[0];
    if (archHeaders.length < HEADERS[SHEET_CASES].length) {
      archCaseSheet.getRange(1, 1, 1, HEADERS[SHEET_CASES].length).setValues([HEADERS[SHEET_CASES]]).setFontWeight('bold');
    }
  }
  
  let archRecordSheet = ss.getSheetByName(archiveRecordSheetName);
  if (!archRecordSheet) {
    archRecordSheet = ss.insertSheet(archiveRecordSheetName);
    archRecordSheet.getRange(1, 1, 1, HEADERS['HISTORY_RECORDS'].length).setValues([HEADERS['HISTORY_RECORDS']]).setFontWeight('bold');
    archRecordSheet.setFrozenRows(1);
  } else {
    const archHeaders = archRecordSheet.getRange(1, 1, 1, Math.max(archRecordSheet.getLastColumn(), 1)).getValues()[0]
      .map(h => String(h).trim());
    const missingHeaders = HEADERS['HISTORY_RECORDS'].filter(h => !archHeaders.includes(h));
    if (missingHeaders.length > 0) {
      const startCol = archRecordSheet.getLastColumn() + 1;
      archRecordSheet.getRange(1, startCol, 1, missingHeaders.length)
        .setValues([missingHeaders]).setFontWeight('bold');
    }
  }
  
  // 搬移個案
  const caseData = caseSheet.getDataRange().getValues();
  const cHeaders = caseData[0];
  const cGradeIdx = cHeaders.indexOf('年級');
  const cIdIdx = cHeaders.indexOf('個案編號');
  
  const casesToKeep = [cHeaders];
  const casesToArchive = [];
  const gradCaseIds = new Set();
  
  for (let i = 1; i < caseData.length; i++) {
    const row = caseData[i];
    if (row[cGradeIdx] === '九') {
      const archRow = [...row];
      archRow[cGradeIdx] = '畢業';
      casesToArchive.push(archRow);
      gradCaseIds.add(String(row[cIdIdx]));
    } else {
      casesToKeep.push(row);
    }
  }
  
  if (casesToArchive.length === 0) {
    return { success: false, error: '沒有找到任何九年級個案需要歸檔' };
  }
  
  // 搬移紀錄
  const recordData = recordSheet.getDataRange().getValues();
  const rHeaders = recordData[0];
  const rCaseIdIdx = rHeaders.indexOf('個案編號');
  const archRecordHeaders = archRecordSheet
    .getRange(1, 1, 1, archRecordSheet.getLastColumn()).getValues()[0]
    .map(h => String(h).trim());
  
  const recordsToKeep = [rHeaders];
  const recordsToArchive = [];
  
  const caseNameMap = {};
  for (let i = 1; i < caseData.length; i++) {
    caseNameMap[String(caseData[i][cIdIdx])] = String(caseData[i][cHeaders.indexOf('姓名')]);
  }

  for (let i = 1; i < recordData.length; i++) {
    const row = [...recordData[i]];
    const cId = String(row[rCaseIdIdx]);
    if (gradCaseIds.has(cId)) {
      // 歸檔時記錄當時的學生姓名
      recordsToArchive.push(archRecordHeaders.map(header => {
        if (header === '學生姓名') return caseNameMap[cId] || '';
        const sourceIdx = rHeaders.indexOf(header);
        return sourceIdx >= 0 ? row[sourceIdx] : '';
      }));
    } else {
      recordsToKeep.push(row);
    }
  }
  
  // 寫入歸檔表
  if(casesToArchive.length > 0) {
    archCaseSheet.getRange(archCaseSheet.getLastRow() + 1, 1, casesToArchive.length, casesToArchive[0].length).setValues(casesToArchive);
  }
  if (recordsToArchive.length > 0) {
    archRecordSheet.getRange(archRecordSheet.getLastRow() + 1, 1, recordsToArchive.length, recordsToArchive[0].length).setValues(recordsToArchive);
  }
  
  // 更新原表 (刪除已歸檔的資料)
  caseSheet.clearContents();
  caseSheet.getRange(1, 1, casesToKeep.length, casesToKeep[0].length).setValues(casesToKeep);
  
  recordSheet.clearContents();
  recordSheet.getRange(1, 1, recordsToKeep.length, recordsToKeep[0].length).setValues(recordsToKeep);

  // 清除快取
  CacheService.getScriptCache().remove('sheet_data_' + SHEET_CASES);
  CacheService.getScriptCache().remove('sheet_data_' + SHEET_RECORDS);

  return { 
    success: true, 
    message: `已成功將 ${casesToArchive.length} 位九年級個案及 ${recordsToArchive.length} 筆紀錄移至「${sy}畢業」分頁。` 
  };
}

/**
 * 升級功能：
 * 1. 刪除班級配置與個案中的九年級資料（如果尚未歸檔，此步驟會導致當下九年級與其紀錄被清除）
 * 2. 七升八，八升九
 * 3. 班級配置自動產生 新的七年級1~7班 空紀錄
 */
function handlePromoteGrades(data) {
  if (!checkAdminRole(data.role)) return { success: false, error: '權限不足' };
  
  const ss = getSpreadsheet();
  
  // 1. 處理個案名單的升級
  const caseSheet = ss.getSheetByName(SHEET_CASES);
  const caseData = caseSheet.getDataRange().getValues();
  const cHeaders = caseData[0];
  const cGradeIdx = cHeaders.indexOf('年級');
  
  const newCaseData = [cHeaders];
  for (let i = 1; i < caseData.length; i++) {
    const row = [...caseData[i]];
    if (row[cGradeIdx] === '九') {
      continue; // 刪除九年級
    } else if (row[cGradeIdx] === '八') {
      row[cGradeIdx] = '九';
      newCaseData.push(row);
    } else if (row[cGradeIdx] === '七') {
      row[cGradeIdx] = '八';
      newCaseData.push(row);
    } else if (row[cGradeIdx] === '新生') {
      row[cGradeIdx] = '七';
      newCaseData.push(row);
    } else {
      newCaseData.push(row); // 其他異常年級保留
    }
  }
  caseSheet.clearContents();
  caseSheet.getRange(1, 1, newCaseData.length, newCaseData[0].length).setValues(newCaseData);
  
  // 2. 處理班級配置的升級
  const classSheet = ss.getSheetByName(SHEET_CLASSES);
  const classData = classSheet.getDataRange().getValues();
  const clsHeaders = classData[0];
  const clsGradeIdx = clsHeaders.indexOf('年級');
  const clsClassIdx = clsHeaders.indexOf('班級');
  
  let newClassData = [clsHeaders];
  for (let i = 1; i < classData.length; i++) {
    const row = [...classData[i]];
    if (row[clsGradeIdx] === '九') {
      continue; // 刪除原九年級配置
    } else if (row[clsGradeIdx] === '八') {
      row[clsGradeIdx] = '九';
      newClassData.push(row);
    } else if (row[clsGradeIdx] === '七') {
      row[clsGradeIdx] = '八';
      newClassData.push(row);
    } else if (row[clsGradeIdx] === '新生') {
      row[clsGradeIdx] = '七';
      newClassData.push(row);
    } else {
      newClassData.push(row); 
    }
  }
  
  // 自動新增七年級 1~7 班空配置
  for (let c = 1; c <= 7; c++) {
    const emptyRow = new Array(clsHeaders.length).fill('');
    emptyRow[clsGradeIdx] = '七';
    emptyRow[clsClassIdx] = String(c);
    newClassData.push(emptyRow);
  }
  
  classSheet.clearContents();
  classSheet.getRange(1, 1, newClassData.length, newClassData[0].length).setValues(newClassData);
  
  // 3. 處理紀錄表：留下關聯仍存在於最新個案表的紀錄
  const recordSheet = ss.getSheetByName(SHEET_RECORDS);
  const recordData = recordSheet.getDataRange().getValues();
  const rHeaders = recordData[0];
  const rCaseIdIdx = rHeaders.indexOf('個案編號');
  
  const validCaseIds = new Set();
  for (let i = 1; i < newCaseData.length; i++) {
    validCaseIds.add(String(newCaseData[i][cHeaders.indexOf('個案編號')]));
  }
  
  const newRecordData = [rHeaders];
  for (let i = 1; i < recordData.length; i++) {
    if (validCaseIds.has(String(recordData[i][rCaseIdIdx]))) {
      newRecordData.push(recordData[i]);
    }
  }
  recordSheet.clearContents();
  recordSheet.getRange(1, 1, newRecordData.length, newRecordData[0].length).setValues(newRecordData);

  CacheService.getScriptCache().remove('sheet_data_' + SHEET_CASES);
  CacheService.getScriptCache().remove('sheet_data_' + SHEET_RECORDS);
  CacheService.getScriptCache().remove('sheet_data_' + SHEET_CLASSES);
  
  return { 
    success: true, 
    message: '全校升級成功：七升八、八升九，已清空原九年級，並建立七年級 1~7 班空配置' 
  };
}

// ============ 取得全體個案綜述 (報表用) ============
function handleGetBatchSummaries(data) {
  const cases = getSheetData(SHEET_CASES);
  const classes = getSheetData(SHEET_CLASSES);
  const classMap = {};
  classes.forEach(c => { classMap[`${c['年級']}_${c['班級']}`] = c; });

  const allUsers = getSheetData(SHEET_USERS);
  let myCases = cases;
  
  if (data.role === '專輔教師' && data.account) {
    const user = allUsers.find(u => u['帳號'] === data.account);
    const userName = user ? user['姓名'] : '';
    myCases = cases.filter(c => {
      const cfg = classMap[`${c['年級']}_${c['班級']}`];
      const val = String(c['專輔'] || (cfg ? cfg['專輔'] : ''));
      return val === String(data.account) || (userName && val === String(userName));
    });
  }

  // 載入輔導紀錄並以個案編號分類快取 (效能防禦)
  const recordsData = getSheetData(SHEET_RECORDS);
  const recordsByCase = {};
  recordsData.forEach(r => {
    const cId = String(r['個案編號'] || '').replace(/-/g, '');
    if (!recordsByCase[cId]) {
      recordsByCase[cId] = [];
    }
    recordsByCase[cId].push(r);
  });

  // 實際服務判定輔助函式
  const checkActual = (c, gradeNum, semNum, originalVal) => {
    if (!originalVal) return '';
    const entryYear = c['入學學年度'];
    if (!entryYear || isNaN(parseInt(entryYear))) return originalVal; // 安全 fallback
    
    const targetYear = parseInt(entryYear) + (gradeNum - 7);
    const sy = targetYear + 1911;
    const [start, end] = semNum === 1 
      ? [new Date(sy, 7, 1), new Date(sy + 1, 0, 31)] 
      : [new Date(sy + 1, 1, 1), new Date(sy + 1, 6, 31)];
      
    const targetId = String(c['個案編號'] || '').replace(/-/g, '');
    const caseRecords = recordsByCase[targetId] || [];
    
    const semRecords = caseRecords.filter(r => {
      const rd = new Date(r['日期時間'] || r['建立日期']);
      return rd >= start && rd <= end;
    });
    
    if (semRecords.length === 0) return '';
    const hasActual = semRecords.some(r => !String(r['服務項目'] || '').includes('純紀錄'));
    return hasActual ? originalVal : '';
  };

  const summaries = myCases.map(c => {
    const cfg = classMap[`${c['年級']}_${c['班級']}`];
    return {
      id: String(c['個案編號']),
      name: String(c['姓名'] || ''),
      caseType: String(c['個案類型'] || ''),
      s_7a: checkActual(c, 7, 1, c['七上綜述'] || ''),
      s_7b: checkActual(c, 7, 2, c['七下綜述'] || ''),
      s_8a: checkActual(c, 8, 1, c['八上綜述'] || ''),
      s_8b: checkActual(c, 8, 2, c['八下綜述'] || ''),
      s_9a: checkActual(c, 9, 1, c['九上綜述'] || ''),
      s_9b: checkActual(c, 9, 2, c['九下綜述'] || ''),
      counselor: String(c['專輔'] || (cfg ? cfg['專輔'] : '')),
      mentorTeacher: c['認輔教師'] || '',
      specialEduTeacher: c['特教個管老師'] || '',
      serviceMethod: c['個案服務方式'] || '',
      status: c['狀態'] || '進行中'
    };
  });
  
  return { success: true, data: summaries };
}

/**
 * 搜尋歷史個案
 * data: { keyword: '編號或姓名' }
 */
function handleSearchHistory(data) {
  if (!checkAdminRole(data.role)) return { success: false, error: '權限不足' };
  
  const keyword = String(data.keyword || '').trim().toLowerCase();
  if (!keyword) return { success: false, error: '請輸入關鍵字' };
  
  const ss = getSpreadsheet();
  const allSheets = ss.getSheets();
  const results = [];
  
  // 遍歷所有以「畢業-個案」結尾的工作表
  allSheets.forEach(sheet => {
    const name = sheet.getName();
    if (name.endsWith('畢業-個案')) {
      const historyData = getSheetData(name);
      historyData.forEach(c => {
        const id = String(c['個案編號'] || '').toLowerCase();
        const studentName = String(c['姓名'] || '').toLowerCase();
        
        if (id.includes(keyword) || studentName.includes(keyword)) {
          results.push({
            ...mapCaseToFrontend(c),
            fromSheet: name // 記錄來源工作表以便前端查詢詳情
          });
        }
      });
    }
  });
  
  return { success: true, data: results };
}

/**
 * 取得歷史個案的紀錄
 * data: { caseId: '...', sheetName: '...畢業-服務' }
 */
function handleGetHistoryRecords(data) {
  if (!checkAdminRole(data.role)) return { success: false, error: '權限不足' };
  
  const { caseId, sheetName } = data;
  if (!caseId || !sheetName) return { success: false, error: '缺少參數' };
  
  const records = getSheetData(sheetName);
  const targetId = String(caseId).trim();
  const filtered = records.filter(r => String(r['個案編號'] || '').trim() === targetId);
  
  return {
    success: true,
    data: filtered.map(r => ({
      id: r['紀錄編號'],
      caseId: r['個案編號'],
      dateTime: r['日期時間'],
      time: r['時間'] || '',
      target: r['對象'],
      method: r['方式'],
      service: r['服務項目'] || '',
      content: r['輔導服務紀錄'],
      recorderAccount: r['記錄者帳號'],
      recorderName: r['記錄者姓名'],
      createdAt: r['建立日期'],
      studentName: r['學生姓名'] // 歷史紀錄有此欄位
    }))
  };
}

/**
 * 產生正式個案編號 (年度-專輔代碼+序號)
 * 邏輯：搜尋該學年度、該老師的最後一個編號，將序號 +1
 */
function handleGenerateOfficialId(data) {
  const ss = getSpreadsheet();
  const cases = getSheetData(SHEET_CASES);
  const users = getSheetData(SHEET_USERS);
  
  // 1. 取得「負責專輔」的教師編碼
  const counselorName = data.counselor || '';
  if (!counselorName) {
    return { success: false, error: '請先在基本資料中選取「專輔」老師。' };
  }
  
  const user = users.find(u => u['帳號'] === counselorName || u['姓名'] === counselorName);
  if (!user || !user['教師編碼']) {
    return { success: false, error: `找不到專輔老師「${counselorName}」的教師編碼，請先至人員管理設定。` };
  }
  const teacherCode = String(user['教師編碼']).padStart(2, '0');
  
  // 2. 取得要生成的學年度
  let reportDate = data.reportDate || '';
  if (!reportDate) {
    return { success: false, error: '請先填寫「提報學期」（如：114-1）。' };
  }
  const yearPrefix = reportDate.split('-')[0];
  const prefixMatch = `${yearPrefix}-${teacherCode}`;
  
  // 3. 找出該年度該老師的最大序號
  let maxSeq = 0;
  cases.forEach(c => {
    const id = String(c['個案編號'] || '');
    if (id.startsWith(prefixMatch)) {
      const seqPart = id.substring(prefixMatch.length);
      const seq = parseInt(seqPart);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });
  
  const nextSeq = String(maxSeq + 1).padStart(2, '0');
  const finalId = `${prefixMatch}${nextSeq}`;
  
  return { success: true, id: finalId };
}

function uploadRecordImage(data) {
  if (!data.account) return { success: false, error: '未登入' };

  try {
    const folderName = "個案管理系統_附件";
    let folder;
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    
    const decodedFile = Utilities.base64Decode(data.fileBase64);
    const blob = Utilities.newBlob(decodedFile, data.mimeType, data.fileName);
    const file = folder.createFile(blob);
    
    // 設定為知道連結的人可以查看，以便前端預覽和匯出
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return {
      success: true,
      data: {
        fileId: file.getId(),
        fileName: file.getName(),
        mimeType: data.mimeType,
        url: file.getUrl(),
        thumbnailUrl: `https://drive.google.com/thumbnail?id=${file.getId()}&sz=w400`
      }
    };
  } catch (err) {
    return { success: false, error: '上傳失敗: ' + err.message };
  }
}

function handleDeleteAttachment(data) {
  try {
    DriveApp.getFileById(data.fileId).setTrashed(true);
    return { success: true, message: '附件已刪除' };
  } catch(e) {
    return { success: false, error: '刪除附件失敗: ' + e.message };
  }
}

// 供系統觸發最高權限授權用
function forceAuth() {
  const folder = DriveApp.createFolder("TempAuthFolder");
  folder.setTrashed(true);
}
