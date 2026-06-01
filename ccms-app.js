/**
 * 輔導室個案管理系統 - 前端 Vue 3 應用程式
 * 架構：獨立 HTML + GAS API
 */

// ========== GAS URL 設定 ==========
// 若要固定網址，請在此填入已部署的 GAS Web App URL
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbxnX1x-huPp_UOQVJos4jSX_tbIv9wwpDXIuVfw6SOnmaWfeS-fIxaMPOl8rM4lvJB8kg/exec';

const { createApp } = Vue;

const CASE_TYPES = [
  '1.人際困擾', '2.師生關係', '3.家庭困擾', '4.自我探索', '5.情緒困擾',
  '6.生活壓力', '7.創傷反應', '8.自我傷害', '9.性別議題', '10.脆弱家庭',
  '11.兒少保護議題', '12.學習困擾', '13.生涯輔導', '14.偏差行為', '15.網路沉迷',
  '16.中離(輟)拒學', '17.藥物濫用', '18.精神疾患', '19.其他'
];
const METHOD_OPTS = ['面談', '電聯', '訊息', '校訪', '其他'];
const TARGET_OPTS = ['學生', '12.導師', '13.教職員', '14.家長', '15.專業人員'];
const STATUS_OPTS = ['進行中', '已結案', '觀察中'];
const SOURCE_OPTS = [
  '1.學生主動求助',
  '2.家長轉介',
  '3.教師轉介（含教職員工）',
  '4.同儕轉介',
  '5.輔導老師約談',
  '6.線上預約管道（僅限高中階段）',
  '7.其他'
];

const SPECIAL_ED_OPTS = [
  '0.以下皆非', '1.智能障礙', '2.視覺障礙', '3.聽覺障礙', '4.語言障礙', '5.肢體障礙',
  '6.腦性麻痺', '7.身體病弱', '8.情緒行為障礙', '9.學習障礙', '10.多重障礙',
  '11.自閉症', '12.發展遲緩', '13.其他障礙'
];
const IDENTITY_OPTS = ['1.新住民子女', '2.低收入戶', '3.中低收入戶', '4.身心障礙', '5.原住民', '6.單親家庭', '7.隔代教養', '8.外配子女', '9.兒少保護', '10.其他'];
const SERVICE_OPTS = [
  '0.晤談',
  '1.團體輔導', '2.入班輔導', '3.家長諮詢', '4.教師諮詢', '5.個案會議',
  '6.心理測驗', '7.安心服務', '8.家庭處遇', '9.資源連結', '10.系統會談',
  '11.學生諮詢', '12.臨案協處', '13.方案計畫', '14.各項宣講', '15.危機處理',
  '16.轉銜輔導', '17.其他'
];
const REFERRAL_OPTS = [
  '1.本月轉介輔諮中心',
  '2.無轉介',
  '3.已轉介輔諮中心且該中心持續服務中',
  '4.已轉介輔諮中心，該中心服務至本月結案'
];

createApp({
  data() {
    return {
      // 系統狀態
      gasUrl: '', loading: false, loadingMsg: '讀取中...', sidebarOpen: false,
      page: 'dashboard',
      // 主題 (dark | light)
      theme: localStorage.getItem('cms_theme') || 'dark',
      // 登入
      user: null, loginForm: { account: '', password: '' },
      // Toast
      toast: { show: false, msg: '', type: 'info' }, toastTimer: null,
      // 確認對話框
      confirm: { show: false, msg: '', callback: null },
      // 資料
      cases: [], records: [], users: [], dashData: null,
      configs: { classes: [] },
      // 當前選取的個案
      currentCase: null,
      // 搜尋與篩選
      searchQuery: '', searchInputStr: '', userSearchQuery: '',
      filterGrade: '', filterStatus: '', filterCounselor: '', filterIdentity: '',
      // Modal 控制
      showCaseModal: false, showRecordModal: false, showUserModal: false,
      showSettings: false, showHelp: false, showConfigModal: false, showChangePwd: false,
      showHealthModal: false, healthReport: null, healthDetail: null,
      isDragging: false, // 拖曳上傳狀態
      pwdForm: { oldPwd: '', newPwd: '', confirmPwd: '' },
      exportModal: { show: false, yearMonth: '' },
      feedbackModal: { show: false, targetSem: '', currentSem: '' },
      backupGrade: '全部',
      selectedCaseIds: [], // 用於批次操作勾選
      recordDrafts: {}, // 🎨 新增案例草稿暫存
      todoNote: '', // 📌 待辦隨手記事本
      isPrivacyMode: localStorage.getItem('cms_privacy_mode') === 'true', // 🔒 隱私遮罩模式
      // 配置與設定分頁
      settingsTab: 'export',
      backupSettings: { email: '', enabled: false },
      systemSettings: [],
      // 配置管理
      configType: 'classes', configItems: [],
      // 分頁
      casePage: 1, casePageSize: 30,
      recordPage: 1, recordPageSize: 15,
      // 表單
      caseForm: this.emptyCaseForm(),
      recordForm: this.emptyRecordForm(),
      userForm: { account: '', password: '', name: '', role: '專輔教師' },
      editingId: null, editingRecordId: null, editingUserId: null,
      targetCaseId: null,
      batchConfig: {
        grade: '7',
        sem: '1',
        semesterStr: '',
        force: false
      },
      batchProgress: {
        running: false,
        current: 0,
        total: 0,
        lastMsg: ''
      },
      // 選項
      CASE_TYPES, SOURCE_OPTS, METHOD_OPTS, TARGET_OPTS, STATUS_OPTS, SPECIAL_ED_OPTS, IDENTITY_OPTS, SERVICE_OPTS, REFERRAL_OPTS
    };
  },

  computed: {
    isAdmin() { return this.user && this.user.role === '管理員'; },
    // 主題 CSS 統一綁定
    themeClass() { return this.theme === 'light' ? 'light-theme' : ''; },
    filteredCases() {
      let result = this.cases;

      // 1. 下拉篩選
      if (this.filterGrade) result = result.filter(c => c.grade === this.filterGrade);
      if (this.filterStatus) result = result.filter(c => c.status === this.filterStatus);
      if (this.filterCounselor) result = result.filter(c => c.counselor === this.filterCounselor);

      if (this.filterIdentity) {
        const q = this.filterIdentity.trim();
        const pureQ = q.replace(/^\d+\./, '');
        if (q === '特教生') {
          result = result.filter(c => c.specialEdu && String(c.specialEdu).trim() !== '0.以下皆非' && String(c.specialEdu).trim() !== '-');
        } else {
          result = result.filter(c => {
            const val = String(c.identity || '');
            return val.includes(q) || val.includes(pureQ);
          });
        }
      }
      // 2. 關鍵字搜尋 (擴大範圍至全域欄位)
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        result = result.filter(c =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.id || '').toLowerCase().includes(q) ||
          (c.class || '').toString().includes(q) ||
          (c.caseType || '').toLowerCase().includes(q) ||
          (c.counselor || '').toLowerCase().includes(q) ||
          (c.mentorTeacher || '').toLowerCase().includes(q) ||
          (c.homeroom || '').toLowerCase().includes(q) ||
          (c.identity || '').toLowerCase().includes(q) ||
          (c.situation || '').toLowerCase().includes(q) ||
          (c.teacherReport || '').toLowerCase().includes(q) ||
          (c.caseSource || '').toLowerCase().includes(q)
        );
      }

      // 3. 排序：依年級、班級、座號順序排列
      const gradeMap = { '新生': 6, '七': 7, '八': 8, '九': 9, '畢業': 10 };
      result.sort((a, b) => {
        const gA = gradeMap[a.grade] || 99;
        const gB = gradeMap[b.grade] || 99;
        if (gA !== gB) return gA - gB;

        const cA = parseInt(a.class) || 999;
        const cB = parseInt(b.class) || 999;
        if (cA !== cB) return cA - cB;

        const sA = parseInt(a.seatNo) || 999;
        const sB = parseInt(b.seatNo) || 999;
        return sA - sB;
      });

      return result;
    },
    filteredUsers() {
      if (!this.userSearchQuery) return this.users;
      const q = this.userSearchQuery.toLowerCase();
      return this.users.filter(u =>
        u.account.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
      );
    },
    counselorList() {
      return this.users.filter(u => u.role === '專輔教師' && u.status === '啟用');
    },
    isAllSelected() {
      return this.filteredCases.length > 0 && this.selectedCaseIds.length === this.filteredCases.length;
    },
    sortedRecords() {
      // 穩定解析日期字串
      const parseDate = (val) => {
        if (!val) return 0;
        const pts = String(val).match(/\d+/g);
        if (!pts || pts.length < 3) return 0;
        return new Date(pts[0], pts[1] - 1, pts[2], pts[3] || 0, pts[4] || 0, pts[5] || 0).getTime();
      };

      // 依據日期（新至舊）進行主排序，若日期相同則依建立時間（新至舊）次排序
      return [...this.records].sort((a, b) => {
        const tA = parseDate(a.dateTime);
        const tB = parseDate(b.dateTime);
        if (tA !== tB) return tB - tA;
        return parseDate(b.createdAt) - parseDate(a.createdAt);
      });
    },
    hasHealthIssues() {
      return this.healthReport && this.healthReport.hasIssues;
    },
    totalRecordPages() {
      return Math.ceil(this.records.length / this.recordPageSize) || 1;
    },
    paginatedRecords() {
      const start = (this.recordPage - 1) * this.recordPageSize;
      return this.sortedRecords.slice(start, start + this.recordPageSize);
    },
    // 🎯 效能優化：個案列表分頁，減少 DOM 節點
    totalCasePages() {
      return Math.ceil(this.filteredCases.length / this.casePageSize) || 1;
    },
    paginatedCases() {
      const start = (this.casePage - 1) * this.casePageSize;
      return this.filteredCases.slice(start, start + this.casePageSize);
    },
    // 🎨 裝修提醒專區：從保險櫃找出所有「施工中」的案子，並與全案名單比對以獲取姓名
    casesWithDrafts() {
      if (!this.recordDrafts) return [];
      const draftIds = Object.keys(this.recordDrafts);
      // 🎯 只回傳有草稿存在，且該個案確實存在的清單
      return this.cases.filter(c => draftIds.includes(String(c.id)));
    },
    // 📅 當前民國年月字符串 (格式: 115-04)
    currentROCMonth() {
      const now = new Date();
      const rocYear = now.getFullYear() - 1911;
      const month = String(now.getMonth() + 1).padStart(2, '0');
      return `${rocYear}-${month}`;
    }
  },
  watch: {
    // 🎨 個案專屬全表單自動存檔：當任何欄位變動，立刻鎖定存入該個案的專屬 ID 下
    recordForm: {
      deep: true,
      handler(val) {
        if (this.currentCase && this.currentCase.id && this.showRecordModal && !this.editingRecordId) {
          const def = this.emptyRecordForm();
          const p = val;
          const isServiceItemsEmpty = (p.serviceItems || []).every(it => !it.service && !it.target);
          const isEmpty = (!p.content.trim()) &&
            isServiceItemsEmpty && (p.methodArr.length === 0) &&
            (!p.customTarget.trim()) && (!p.customMethod.trim()) && (!p.excludeFromReport) &&
            (p.date === def.date);

          if (isEmpty) {
            if (this.recordDrafts[this.currentCase.id]) {
              delete this.recordDrafts[this.currentCase.id];
              localStorage.setItem('cms_record_drafts', JSON.stringify(this.recordDrafts));
            }
          } else {
            this.recordDrafts[this.currentCase.id] = JSON.parse(JSON.stringify(val));
            localStorage.setItem('cms_record_drafts', JSON.stringify(this.recordDrafts));
          }
        }
      }
    },
    page(val) { localStorage.setItem('cms_page', val); },
    currentCase(val) {
      if (val) localStorage.setItem('cms_case_id', val.id);
      else localStorage.removeItem('cms_case_id');
    },
    searchInputStr(val) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.searchQuery = val;
        this.casePage = 1;
      }, 300);
    },
    showRecordModal(val) {
      if (val) {
        this.$nextTick(() => {
          const editor = document.getElementById('record-editor');
          if (editor) {
            editor.innerHTML = this.recordForm.contentHTML || '';
          }
        });
      }
    },
    todoNote(val) {
      localStorage.setItem('cms_todo_note', val);
    },
    filterGrade() { this.casePage = 1; },
    filterStatus() { this.casePage = 1; },
    filterCounselor() { this.casePage = 1; },
    filterIdentity() { this.casePage = 1; },
    theme(val) {
      document.body.className = val === 'light' ? 'light-theme' : '';
    }
  },

  methods: {
    // ===== 主題切換 =====
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('cms_theme', this.theme);
    },
    // ===== 隱私模式切換 =====
    togglePrivacy() {
      // 🚨 哨子測試：若彈窗沒出現，代表 Vue 指令完全沒被觸發
      console.log('[Privacy Mode] Toggling from', this.isPrivacyMode);
      this.isPrivacyMode = !this.isPrivacyMode;
      localStorage.setItem('cms_privacy_mode', this.isPrivacyMode ? 'true' : 'false');
      // 提示使用者
      this.showToast(this.isPrivacyMode ? '隱私模式：姓名保密狀態' : '隱私模式：校閱全名模式', 'info');
    },
    // 🎨 姓名精準拆解邏輯
    splitName(name) {
      if (!name || typeof name !== 'string') return { first: name || '', mid: '', last: '' };
      const len = name.length;
      if (len <= 1) return { first: name, mid: '', last: '' };
      if (len === 2) return { first: name[0], mid: name[1], last: '' };
      return { first: name[0], mid: name.substring(1, len - 1), last: name[len - 1] };
    },

    // ===== 表單初始化 =====
    emptyCaseForm() {
      // 自動計算當前學期
      const now = new Date();
      let sy = now.getFullYear() - 1911;
      const month = now.getMonth() + 1;
      let semester = (month >= 8) ? `${sy}-1` : (month >= 2 ? `${sy - 1}-2` : `${sy - 1}-1`);

      return {
        id: '', grade: '', class: '', seatNo: '', name: '', gender: '', reportDate: semester,
        situation: '', specialEdu: '0.以下皆非', foreignLowIncome: '',
        teacherReport: '',
        serviceMethod: '', caseSource: '', customCaseSource: '', caseType: '', identity: '',
        referralStatus: '2.無轉介', referralMonth: '', // 🎯 預計格式: 115-03
        caseTypeArr: [], identityArr: [],
        caseTypeMainOther: '', caseTypeSubOther: '',
        entrySY: '',
        s_7a: '', s_7b: '', s_8a: '', s_8b: '', s_9a: '', s_9b: '',
        generatingSummary: false 
      };
    },
    emptyRecordForm() {
      // 取得本地日期 (YYYY-MM-DD)
      const now = new Date();
      const localDate = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');
      return {
        date: localDate,
        targetArr: [],
        customTarget: '',
        methodArr: [],
        customMethod: '',
        serviceArr: [],
        serviceItems: [{ service: '', target: '', gender: this.currentCase?.gender || '男' }], // 🎯 預設帶入個案性別
        content: '',
        contentHTML: '', 
        excludeFromReport: false,
        attachments: []
      };
    },

    // ===== API 呼叫 =====
    async api(action, data = {}, _isRetry = false) {
      if (!this.gasUrl) {
        this.showToast('請先設定 GAS API 網址', 'error');
        this.showSettings = true;
        return null;
      }

      // 從本地取得 Token
      const token = localStorage.getItem('cms_token');

      const payload = {
        action,
        token, // 🎯 安全加固：注入 Token
        ...data,
        _retried: _isRetry // 🎯 修正：將重試狀態標記在 Payload 中
      };
      try {
        const r = await fetch(this.gasUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          redirect: 'follow'
        });

        if (!r.ok) throw new Error(`HTTP 錯誤: ${r.status}`);

        const text = await r.text();
        let result;
        try {
          result = JSON.parse(text);
        } catch (err) {
          throw new Error('服務端回應格式非 JSON，可能是 GAS 腳本出現錯誤。');
        }

        // 🎯 處理 Session 過期 (Code 401) - 增加一次自動重試機制，防範 CacheService 偶發失效
        if (result.code === 401) {
          if (!_isRetry) {
            console.warn('Session 偵測失敗，正在嘗試自動重連...');
            await new Promise(res => setTimeout(res, 500));
            return this.api(action, data, true); // 🎯 修正：傳遞 true 給下一次呼叫以終止遞迴
          }
          this.showToast('Session 已過期，請重新登入', 'error');
          this.logout(true); // 強制登出
          return null;
        }

        if (!result.success && result.error) {
          this.showToast(result.error, 'error');
        }
        return result;
      } catch (e) {
        console.error('API Error:', e);
        this.showToast('連線失敗：請檢查 GAS 網址是否正確。', 'error');
        return null;
      }
    },

    // ===== 登入/登出 =====
      // === 📎 附件上傳與處理邏輯 ===
      async triggerUpload() {
        document.getElementById('attachmentInput').click();
      },
      async handleFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        await this.processFiles(files);
        event.target.value = '';
      },
      async handleDrop(event) {
        this.isDragging = false;
        const files = event.dataTransfer.files;
        if (!files || files.length === 0) return;
        await this.processFiles(files);
      },
      async processFiles(files) {
        this.loading = true;
        const total = files.length;
        const results = [];
        
        for (let i = 0; i < total; i++) {
          const file = files[i];
          this.loadingMsg = `[${i+1}/${total}] 正在處理: ${file.name}...`;
          
          if (file.size > 10 * 1024 * 1024) { // 稍微放寬到 10MB，反正會壓縮
            this.showToast(`檔案 ${file.name} 超過 10MB 限制`, 'error');
            continue;
          }

          try {
            let compressedDataUrl;
            if (file.type.startsWith('image/')) {
              try {
                compressedDataUrl = await this.compressImage(file);
              } catch(e) {
                compressedDataUrl = await this.toBase64(file);
              }
            } else {
              compressedDataUrl = await this.toBase64(file);
            }

            const base64Str = compressedDataUrl.split(',')[1];
            let thumbnailBase64 = null;
            if (file.type.startsWith('image/')) {
              try {
                const thumbUrl = await this.compressImage(file, 400, 0.5);
                thumbnailBase64 = thumbUrl.split(',')[1];
              } catch(e) {}
            }
            
            this.loadingMsg = `[${i+1}/${total}] 正在上傳: ${file.name}...`;
            const res = await this.api('uploadRecordImage', {
              caseId: this.currentCase ? this.currentCase.id : '',
              fileName: file.name,
              mimeType: file.type,
              fileBase64: base64Str
            });
            
            if (res && res.success) {
              const attData = res.data;
              if (thumbnailBase64) attData.thumbnailBase64 = thumbnailBase64;
              results.push(attData);
            } else {
              this.showToast(`上傳失敗: ${file.name} (${res ? res.error : '無回應'})`, 'error');
            }
          } catch (err) {
            console.error('處理檔案出錯', err);
            this.showToast(`檔案 ${file.name} 處理錯誤: ${err.message}`, 'error');
          }
        }
        
        if (results.length > 0) {
          this.recordForm.attachments = [...(this.recordForm.attachments || []), ...results];
          this.showToast(`成功上傳 ${results.length} 個附件`, 'success');
        }
        this.loading = false;
      },
      toBase64(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });
      },
      compressImage(file, maxWidth = 1000, quality = 0.6) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = maxWidth;
              const MAX_HEIGHT = maxWidth;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = error => reject(error);
          };
          reader.onerror = error => reject(error);
        });
      },
      async deleteAttachmentItem(idx) {
        const att = this.recordForm.attachments[idx];
        if (!att) return;
        if (!confirm(`確定要刪除附件「${att.fileName}」嗎？這會從 Google Drive 中移至垃圾桶。`)) return;
        
        this.loading = true;
        this.loadingMsg = '刪除附件中...';
        const res = await this.api('deleteAttachment', { fileId: att.fileId });
        this.loading = false;
        
        if (res && res.success) {
          this.recordForm.attachments.splice(idx, 1);
          this.showToast('附件已刪除', 'success');
        } else {
          this.showToast('刪除失敗: ' + (res ? res.error : ''), 'error');
        }
      },
      
    async checkToken() {
      const token = localStorage.getItem('cms_token');
      if (!token) return;

      const r = await this.api('checkToken');
      if (r && r.success) {
        this.user = r.user;
        this.loadCache();
        await this.fetchData();
        if (this.isAdmin) this.loadUsers();
      } else {
        this.logout(true);
      }
    },
    async login() {
      if (!this.loginForm.account || !this.loginForm.password) {
        this.showToast('請輸入帳號和密碼', 'error'); return;
      }
      this.loadingMsg = '登入中...';
      this.loading = true;
      const r = await this.api('login', this.loginForm);
      this.loading = false;
      if (r?.success) {
        this.user = r.user;
        // 🎯 儲存 Token
        localStorage.setItem('cms_token', r.token);
        localStorage.setItem('cms_user', JSON.stringify(r.user));
        this.showToast(`歡迎回來，${r.user.name}`, 'success');

        this.loadCache();
        await this.fetchData();
        if (this.isAdmin) this.loadUsers();
      }
    },
    loadCache() {
      const cached = localStorage.getItem('cms_dash_cache');
      if (cached) {
        try {
          const data = JSON.parse(cached);
          this.dashData = data;
          this.cases = data.cases || [];
          if (data.configs) this.configs = data.configs;
        } catch (e) { }
      }
    },
    async logout(force = false) {
      if (!force) {
        // 通知後端登出
        await this.api('logout');
      }
      this.user = null;
      this.page = 'dashboard';
      localStorage.removeItem('cms_user');
      localStorage.removeItem('cms_token');
      localStorage.removeItem('cms_dash_cache');
      this.cases = []; this.records = []; this.users = []; this.dashData = null;
      this.showToast('已安全登出', 'info');
    },

    async runHealthCheck() {
      if (this.loading) return;
      this.loading = true;
      this.loadingMsg = '正在執行全系統通盤診斷...';
      const r = await this.api('checkIntegrity');
      this.loading = false;
      if (r?.success) {
        this.healthReport = r.report;
        this.healthDetail = null; // 重置展開明細
        if (r.hasIssues) {
          this.showToast('掃描完成，系統發現異常狀況', 'warning');
        } else {
          this.showToast('診斷完畢，系統狀況極佳', 'success');
        }
      }
    },
    async repairData(repairType = 'all') {
      const typeLabels = {
        orphans: '孤兒紀錄',
        invalidIds: '編號格式錯誤',
        logicErrors: '對應邏輯錯誤',
        orphanAttachments: '孤兒附件',
        all: '全部異常'
      };
      const label = typeLabels[repairType] || '異常';
      if (!confirm(`💡 確認修復【${label}】\n系統將自動修復選定項目。確認執行？`)) return;

      this.loading = true;
      this.loadingMsg = `正在修復《${label}》...`;
      const r = await this.api('repairData', { repairType });
      this.loading = false;

      if (r?.success) {
        this.showToast(r.message, 'success');
        this.healthDetail = null;
        // 修復完後自動重新診斷，展現成果
        this.runHealthCheck();
      }
    },
    async updateBackupSettings() {
      if (!this.backupSettings.email) {
        this.showToast('請填寫備份電子郵件', 'warning');
        this.backupSettings.enabled = false;
        return;
      }
      const originalEnabled = !this.backupSettings.enabled;
      this.loading = true;
      this.loadingMsg = '正在更新備份設定...';
      try {
        const r = await this.api('updateBackupSettings', {
          backupEmail: this.backupSettings.email,
          backupEnabled: this.backupSettings.enabled
        });
        if (r?.success) {
          this.showToast(r.message, 'success');
          if (this.systemSettings) {
            // 更新或新增 Email 設定
            let emailSet = this.systemSettings.find(s => s['設定項目'] === 'BACKUP_EMAIL');
            if (emailSet) emailSet['設定值'] = this.backupSettings.email;
            else this.systemSettings.push({ '設定項目': 'BACKUP_EMAIL', '設定值': this.backupSettings.email });

            // 更新或新增啟用狀態
            let enabledSet = this.systemSettings.find(s => s['設定項目'] === 'BACKUP_ENABLED');
            if (enabledSet) enabledSet['設定值'] = String(this.backupSettings.enabled);
            else this.systemSettings.push({ '設定項目': 'BACKUP_ENABLED', '設定值': String(this.backupSettings.enabled) });
          }
        } else {
          this.backupSettings.enabled = originalEnabled;
        }
      } catch (e) {
        this.backupSettings.enabled = originalEnabled;
        this.showToast('更新失敗，請檢查網路連線', 'error');
      } finally {
        this.loading = false;
      }
    },
    async testBackupEmail() {
      if (!this.backupSettings.email) {
        this.showToast('請填寫備份電子郵件', 'warning'); return;
      }
      this.loading = true;
      this.loadingMsg = '正在發送測試郵件...';
      const r = await this.api('testBackupEmail', {
        backupEmail: this.backupSettings.email
      });
      this.loading = false;
      if (r?.success) {
        this.showToast(r.message, 'success');
      }
    },

    // ===== 整合資料讀取 =====
    async fetchData(silent = false) {
      // 1. 如果不是靜默更新，且目前沒有資料，先從快取載入（秒開）
      if (!silent && (!this.cases || this.cases.length === 0)) {
        this.loadCache();
      }

      // 只有在完全沒資料或是手動刷新的情況下才顯示全螢幕 loading
      const showLoading = !silent && (!this.cases || this.cases.length === 0);
      if (showLoading) {
        this.loadingMsg = '同步資料中...';
        this.loading = true;
      }

      try {
        const r = await this.api('getDashboard');
        if (r?.success && r.data) {
          this.dashData = r.data;
          this.cases = r.data.cases || [];
          if (r.data.configs) {
            this.configs = {
              ...this.configs,
              allCounselors: r.data.configs.allCounselors || [],
              classes: r.data.configs.classes || []
            };
            if (r.data.configs.systemSettings) {
              this.systemSettings = r.data.configs.systemSettings;
              const emailSet = this.systemSettings.find(s => s['設定項目'] === 'BACKUP_EMAIL');
              const enabledSet = this.systemSettings.find(s => s['設定項目'] === 'BACKUP_ENABLED');
              if (emailSet) this.backupSettings.email = emailSet['設定值'];
              if (enabledSet) {
                this.backupSettings.enabled = (String(enabledSet['設定值']).toLowerCase() === 'true');
              } else {
                // 如果後端沒這項設定，預設為關閉
                this.backupSettings.enabled = false;
              }
            }
            if (this.page === 'settings') {
              this.openConfigModal('classes');
            }
          }

          // 3. 異步寫入快取，不阻塞 UI
          setTimeout(() => {
            try {
              localStorage.setItem('cms_dash_cache', newDataStr);
            } catch (e) { }
          }, 0);

          this.selectedCaseIds = [];

          // 🚀 [智慧維護門戶] 載入資料後，立即進行 15 號轉介跳轉檢測
          this.runAutoMaintenance();
        }
      } catch (e) {
        console.error('Fetch error:', e);
      } finally {
        if (showLoading) this.loading = true; // 這裡改為 true 是為了配合下一步的整體流程，但其實下方會關掉
        this.loading = false;
      }
    },
    // 為了相容性保留舊名稱，但直接轉發至 fetchData
    async loadDashboard() { await this.fetchData(); },
    async loadCases() { await this.fetchData(); },
    async viewCaseById(caseId) {
      if (!caseId) return;
      // 1. 先從本地清單找
      let student = this.cases.find(c => String(c.id) === String(caseId));
      if (student) {
        await this.viewCase(student);
      } else {
        // 2. 找不到則從後端索取詳情 (例如剛換頁)
        this.loading = true;
        const res = await this.api('getCaseDetail', { id: caseId });
        this.loading = false;
        if (res && res.success) {
          await this.viewCase(res.data);
        } else {
          this.showToast('找不到該個案或權限不足', 'error');
        }
      }
    },
    async viewCase(c) {
      if (!c || !c.id) return;

      // --- 核心狀態切換 ---
      this.currentCase = c;
      this.page = 'detail';
      this.recordPage = 1;
      this.showRecordModal = false;
      this.editingRecordId = null;

      // 🎯 進入詳情頁時，只需確保 Modal 是關閉狀態，表單初始化交給 openRecordModal
      this.recordForm = this.emptyRecordForm();

      // 優先載入快取中的紀錄
      const cacheKey = `cms_records_${c.id}`;
      const cachedRecords = localStorage.getItem(cacheKey);
      if (cachedRecords) {
        try {
          this.records = JSON.parse(cachedRecords);
        } catch (e) { this.records = []; }
      } else {
        this.records = [];
      }

      this.loadingMsg = '正在讀取個案詳情...';
      this.loading = true;

      // ⭐ 嘗試使用合併 API：cgetCaseFull 一次回傳個案詳情 + 紀錄
      const rFull = await this.api('getCaseFull', { caseId: c.id });
      this.loading = false;

      if (rFull?.success && rFull.data) {
        // 後端支援合併 API 成功
        const { detail, records } = rFull.data;
        if (records) {
          this.records = records;
          localStorage.setItem(cacheKey, JSON.stringify(records));
        }
        if (detail) {
          this.currentCase = { ...c, ...detail };
          const idx = this.cases.findIndex(x => String(x.id) === String(c.id));
          if (idx >= 0) this.cases[idx] = this.currentCase;
        }
      } else {
        // 後端尚未支援合併 API，降級把 Promise.all 並行請求
        this.loadingMsg = '正在同步晤談紀錄...';
        this.loading = true;
        const [rRec, rDet] = await Promise.all([
          this.api('getRecords', { caseId: c.id }),
          this.api('getCaseDetail', { id: c.id })
        ]);
        this.loading = false;

        if (rRec?.success) {
          this.records = rRec.data;
          localStorage.setItem(cacheKey, JSON.stringify(rRec.data));
        }
        if (rDet?.success) {
          this.currentCase = { ...c, ...rDet.data };
          const idx = this.cases.findIndex(x => String(x.id) === String(c.id));
          if (idx >= 0) this.cases[idx] = this.currentCase;
        }
      }

      // 🎯 智慧自動展開：進入詳情後，若發現有「施工中」的草稿，直接為您展開編輯欄
      if (this.recordDrafts && this.recordDrafts[c.id]) {
        this.openRecordModal(null);
      }
    },
    openCaseModal(c) {
      this.editingId = c ? c.id : null;

      if (c) {
        // 直接使用傳入的資料 c (已經由 fetchData 或 getCaseFull 確保最新)
        const base = c;
        const rawTypesRaw = (base.caseType || '').split(',').map(s => s.trim()).filter(Boolean);
        let mainOther = '', subOther = '';
        const rawTypes = rawTypesRaw.map((t, idx) => {
          if (t.startsWith('19.其他') && t.includes('_')) {
            const parts = t.split('_');
            if (idx === 0) mainOther = parts[1];
            else if (idx === 1) subOther = parts[1];
            return parts[0]; // 回傳 '19.其他' 供勾選清單比對
          }
          return t;
        });
        const rawService = (base.serviceMethod || '').split(',').map(s => s.trim()).filter(Boolean);
        const rawIdentity = (base.identity || '').split(',').map(s => s.trim()).filter(Boolean);

        let cs = base.caseSource || '';
        let ccs = '';
        const csMatch = cs.match(/^7\.其他\((.*?)\)$/);
        if (csMatch) {
          cs = '7.其他';
          ccs = csMatch[1];
        }

        this.caseForm = {
          ...this.emptyCaseForm(),
          ...base,
          caseSource: cs,
          customCaseSource: ccs,
          caseTypeArr: rawTypes,
          caseTypeMainOther: mainOther,
          caseTypeSubOther: subOther,
          identityArr: rawIdentity.filter(id => id !== '特教生'),
          counselor: base.counselor || ''
        };
      } else {
        this.caseForm = this.emptyCaseForm();
      }
      this.showCaseModal = true;
    },
    async runAutoMaintenance() {
      // 🎯 修正：根據使用者需求，每月 15 號後才進行自動轉換門檻檢測
      if (new Date().getDate() < 15) return;

      const expiredCases = this.cases.filter(c => c.referralStatus && (c.referralStatus.startsWith('1.') || c.referralStatus.startsWith('4.')) && c.referralMonth && c.referralMonth !== this.currentROCMonth);
      if (expiredCases.length === 0) return;

      for (const c of expiredCases) {
        let newStatus = c.referralStatus;
        let newMonth = c.referralMonth;

        if (c.referralStatus.startsWith('1.')) {
          newStatus = '3.已轉介輔諮中心且該中心持續服務中';
          newMonth = this.currentROCMonth; // 🎯 修正：轉換後月份同步更新至目前月份
        } else if (c.referralStatus.startsWith('4.')) {
          newStatus = '2.無轉介';
          newMonth = ''; // 🎯 結案後清空轉介月份
        }

        console.log(`[Maintenance] 自動跳轉: ${c.name} (${c.id}) -> ${newStatus}`);
        
        // 實質寫回資料庫
        await this.api('updateCase', {
          id: c.id,
          referralStatus: newStatus,
          referralMonth: newMonth
        });
      }
      await this.fetchData(true);
    },
    autoFillStaff() {
      if (!this.caseForm.grade) return;

      // 1. 自動填寫學期
      const now = new Date();
      let sy = now.getFullYear() - 1911;
      const month = now.getMonth() + 1;
      if (month < 8) sy -= 1;

      if (!this.caseForm.reportDate) {
        this.caseForm.reportDate = (month >= 8) ? `${sy}-1` : (month >= 2 ? `${sy - 1}-2` : `${sy - 1}-1`);
      }

      // 1.5 自動推算入學學年度 (屆別)
      const gradeMap = {
        '新生': -1,
        '七': 0, '八': 1, '九': 2,
        '七年級': 0, '八年級': 1, '九年級': 2
      };
      const offset = (this.caseForm.grade in gradeMap) ? gradeMap[this.caseForm.grade] : 0;
      this.caseForm.entrySY = String(sy - offset);

      // 2. 代入相關人員 (需有班級才執行)
      if (!this.caseForm.class) return;

      const cfg = this.configs.classes.find(it => it['年級'] === this.caseForm.grade && String(it['班級']) === String(this.caseForm.class));
      if (cfg) {
        this.caseForm.homeroom = cfg['導師'] || '';
        this.caseForm.classGuidance = cfg['班輔'] || '';
        this.caseForm.counselor = cfg['專輔'] || '';
        this.showToast(`已自動代入班級相關人員資訊`, 'info');
      }
    },
    autoFillGender() {
      const n = parseInt(this.caseForm.seatNo);
      if (isNaN(n) || n <= 0) return;
      if (n >= 1 && n <= 20) {
        this.caseForm.gender = '女';
      } else if (n >= 21) {
        this.caseForm.gender = '男';
      }
    },
    async generateOfficialId() {
      if (!this.caseForm.reportDate) {
        this.showToast('請先選取年級或填寫「提報學期」（例：114-1）。', 'error'); return;
      }
      if (!this.caseForm.counselor) {
        this.showToast('請先選取負責之「專輔」老師。', 'error'); return;
      }
      this.loading = true;
      try {
        const r = await this.api('generateOfficialId', {
          reportDate: this.caseForm.reportDate,
          counselor: this.caseForm.counselor
        });
        if (r?.success) {
          this.caseForm.id = r.id;
          this.showToast('正式編號已生成', 'success');
        } else {
          this.showToast(r.error || '生成失敗', 'error');
        }
      } catch (err) {
        this.showToast('系統呼叫失敗', 'error');
      } finally {
        this.loading = false;
      }
    },
    async saveCaseForm() {
      // 統一格式修補：如果輸出的編號是 1140118 (7碼)，自動轉為 114-0118
      if (/^\d{7}$/.test(this.caseForm.id)) {
        this.caseForm.id = this.caseForm.id.slice(0, 3) + '-' + this.caseForm.id.slice(3);
      }

      if (!this.editingId && !this.caseForm.id) {
        // 新增時，若沒填 ID，則依賴後端生成，不擋
      } else if (!this.caseForm.id || !this.caseForm.name) {
        this.showToast('請填寫個案編號與姓名', 'error'); return;
      }

      // 檢查 ID 是否重複（包含新增或修改編號的情況）
      if (this.cases.find(c => c.id === this.caseForm.id && c.id !== this.editingId)) {
        this.showToast('該個案編號已存在，請確認後再使用', 'error'); return;
      }

      // 🎯 自動補齊轉介紀錄月：若選取「本月轉介」或「本月結案」，自動寫入當前民國月
      const rs = this.caseForm.referralStatus || '';
      if (rs.startsWith('1.') || rs.startsWith('4.')) {
        this.caseForm.referralMonth = this.currentROCMonth;
      }

      // 合併個案來源與自填內容
      let finalCaseSource = this.caseForm.caseSource;
      if (finalCaseSource === '7.其他') {
        if (!this.caseForm.customCaseSource || !this.caseForm.customCaseSource.trim()) {
          this.showToast('選取「7.其他」個案來源時，請務必填寫詳細說明', 'error');
          return;
        }
        finalCaseSource = `7.其他(${this.caseForm.customCaseSource})`;
      }

      console.log('[DEBUG] saveCaseForm start', { editingId: this.editingId, formId: this.caseForm.id });

      // 🎯 驗證：如果個案類別包含「19.其他」，說明欄位必填
      if (this.caseForm.caseTypeArr && this.caseForm.caseTypeArr.length > 0) {
        for (let i = 0; i < this.caseForm.caseTypeArr.length; i++) {
          if (this.caseForm.caseTypeArr[i] === '19.其他') {
            const desc = (i === 0) ? this.caseForm.caseTypeMainOther : this.caseForm.caseTypeSubOther;
            if (!desc || !desc.trim()) {
              this.showToast(`選取「19.其他」個案類別時，請務必填寫詳細說明`, 'error');
              return;
            }
          }
        }
      }
      
      const typesToSave = this.caseForm.caseTypeArr.map((t, idx) => {
        if (t === '19.其他') {
          const desc = (idx === 0) ? this.caseForm.caseTypeMainOther : ((idx === 1) ? this.caseForm.caseTypeSubOther : '');
          return desc ? `19.其他_${desc}` : '19.其他';
        }
        return t;
      });

      const data = {
        ...this.caseForm,
        '導師提報內容': this.caseForm.teacherReport,
        '專輔個案摘要': this.caseForm.situation,
        caseType: typesToSave.join(','),
        identity: this.caseForm.identityArr.join(','),
        serviceMethod: this.caseForm.serviceMethod,
        caseSource: finalCaseSource
      };
      this.loadingMsg = '儲存個案...';
      this.loading = true;
      let r;
      if (this.editingId) {
        console.log('[DEBUG] Calling updateCase', { originalId: this.editingId });
        r = await this.api('updateCase', { ...data, originalId: this.editingId });
      } else {
        // 🛡️ 防禦性偵測：若沒有 editingId 但編號已存在，進行最後警告（雖然前面有查重，但這是雙重保險）
        const exists = this.cases.find(c => c.id === this.caseForm.id);
        if (exists) {
          console.warn('[DEBUG] Found existing ID while editingId is null. Redirecting to updateCase?');
          // 如果真的發生這種情況，我們主動幫忙轉向 updateCase 以免重複
          r = await this.api('updateCase', { ...data, originalId: this.caseForm.id });
        } else {
          console.log('[DEBUG] Calling addCase');
          r = await this.api('addCase', data);
        }
      }
      this.loading = false;
      if (r?.success) {
        this.showToast(r.message, 'success');
        this.showCaseModal = false;

        // 🎯 移除草稿清除邏輯 (已不使用草稿)

        await this.fetchData();
        // 如果正在詳情頁，同步更新詳情個案資訊
        if (this.page === 'detail' && this.currentCase) {
          const updated = this.cases.find(c => c.id === this.currentCase.id);
          if (updated) this.currentCase = updated;
        }
      }
    },
    async generateSummary(targetGradeNum, sem) {
      if (!this.currentCase) return;

      const gradeMap = { 7: '七', 8: '八', 9: '九' };
      const semMap = { '1': '上', '2': '下' };
      const label = `${gradeMap[targetGradeNum]}${semMap[sem]}綜述`;

      if (!confirm(`確定要利用 AI 生成 [${label}] 嗎？此操作會直接覆寫現有內容。`)) return;

      try {
        this.loading = true;
        this.loadingMsg = 'AI 正在分析紀錄並生成摘要...';

        // 🔧 修正：正確欄位名是 entrySY（非 schoolYear）
        let entryYearStr = String(this.currentCase.entrySY || '').trim();

        // Fallback 1：從「目前年級 + 目前學年度」反推入學年度（最可靠）
        if (!entryYearStr || isNaN(parseInt(entryYearStr))) {
          const gradeOffsetMap = { '七': 0, '八': 1, '九': 2 };
          if (this.currentCase.grade in gradeOffsetMap) {
            const now = new Date();
            const syNow = (now.getMonth() + 1 >= 8)
              ? (now.getFullYear() - 1911)
              : (now.getFullYear() - 1911 - 1);
            entryYearStr = String(syNow - gradeOffsetMap[this.currentCase.grade]);
          }
        }

        // Fallback 2：從個案編號前三碼推算（此碼是建檔學年，非入學學年，僅最後手段）
        if (!entryYearStr || isNaN(parseInt(entryYearStr))) {
          const match = String(this.currentCase.id || '').replace(/-/g, '').match(/^(\d{3})/);
          if (match) entryYearStr = match[1];
        }

        const entryYear = parseInt(entryYearStr);
        if (isNaN(entryYear)) {
          throw new Error('無法抓取該學生的入學學年度，請至個案資料確認並填寫「入學學年度」欄位。');
        }

        const targetYear = entryYear + (targetGradeNum - 7);
        const semesterStr = `${targetYear}-${sem}`;
        console.log(`[generateSummary] 個案: ${this.currentCase.id}, 年級: ${this.currentCase.grade}, 入學學年: ${entryYear}, 目標學期: ${semesterStr}`);

        const r = await this.api('generateSummary', {
          caseId: this.currentCase.id,
          semester: semesterStr,
          targetGradeNum: targetGradeNum,
          sem: sem
        });

        this.loading = false;

        // 🎯 究極容錯偵測：如果 r 存在，優先從 r.data 中提取結果
        const resData = r && r.data ? r.data : r;
        if (resData && (resData.summary || resData.updatedCase)) {
          const field = `s_${targetGradeNum}${sem === '1' ? 'a' : 'b'}`;
          const newSummary = resData.summary || (resData.updatedCase ? resData.updatedCase[field] : '');

          if (!newSummary && (!resData.updatedCase || !resData.updatedCase[field])) {
            throw new Error('AI 回傳與資料庫同步檢索均為空，請確認資料庫內容。');
          }

          // 1. 同步更換整個 caseForm 的引用 (觸發 Vue 徹底重繪)
          if (this.caseForm) {
            const updatedForm = { ...this.caseForm };
            updatedForm[field] = newSummary;
            this.caseForm = updatedForm; // 絕對路徑替換
          }

          // 2. 同步更換 currentCase 與案例清單
          const targetCase = resData.updatedCase || { ...this.currentCase, [field]: newSummary };
          if (this.currentCase && this.currentCase.id === targetCase.id) {
            this.currentCase = { ...targetCase };
          }
          const idx = this.cases.findIndex(c => c.id === targetCase.id);
          if (idx !== -1) {
            this.cases[idx] = { ...targetCase };
          }

          this.showToast(r.message || 'AI 摘要生成成功！', 'success');
        } else if (r && r.success) {
          this.showToast('AI 生成完成，但回傳解析失敗，請重新整理頁面。', 'warning');
        }
      } catch (err) {
        this.loading = false;
        this.showToast('生成失敗：' + err.message, 'error');
        console.error('[AI-ERROR]', err);
      }
    },
    async deleteCase(id) {
      this.confirmAction('確定要刪除此個案？相關紀錄也會一併影響。', async () => {
        this.loading = true;
        const r = await this.api('deleteCase', { id });
        this.loading = false;
        if (r?.success) {
          this.showToast(r.message, 'success');
          await this.fetchData();
          if (this.currentCase?.id === id) {
            this.currentCase = null;
            this.page = 'dashboard';
          }
        }
      });
    },
    async startBatchSummaries() {
      if (!this.batchConfig.semesterStr) {
        this.showToast('請輸入目標學期名稱 (如: 112-1)', 'warning');
        return;
      }

      // 轉換年級代號 (7 -> 七)
      const gradeMap = { '7': '七', '8': '八', '9': '九' };
      const targetGradeChar = gradeMap[this.batchConfig.grade];
      const targets = this.cases.filter(c => String(c.grade) === targetGradeChar && c.status !== '已結案');

      if (targets.length === 0) {
        this.showToast(`該年級 [${targetGradeChar}] 查無任何在案個案資料。`, 'warning');
        return;
      }

      if (!confirm(`確定要為 [${targetGradeChar}年級] 的 ${targets.length} 位個案批量產製 [${this.batchConfig.semesterStr}] 摘要嗎？`)) return;

      this.batchProgress.running = true;
      this.batchProgress.total = targets.length;
      this.batchProgress.current = 0;
      this.batchProgress.lastMsg = '準備開始...';

      for (const student of targets) {
        if (!this.batchProgress.running) break;

        this.batchProgress.current++;
        this.batchProgress.lastMsg = `正在處理: [${this.batchConfig.grade}年級] ${student.name} (${this.batchProgress.current}/${this.batchProgress.total})`;

        try {
          // 呼叫現有的個別生成 API
          const r = await this.api('generateSummary', {
            caseId: student.id,
            semester: this.batchConfig.semesterStr,
            targetGradeNum: parseInt(this.batchConfig.grade),
            sem: this.batchConfig.sem
          });

          if (r && r.data && r.data.updatedCase) {
            const idx = this.cases.findIndex(c => c.id === r.data.updatedCase.id);
            if (idx !== -1) {
              this.cases[idx] = { ...r.data.updatedCase };
            }
          }
          this.batchProgress.lastMsg = `✅ ${student.name} 完成`;
        } catch (err) {
          console.error(`[BATCH-ERR] ${student.name}:`, err);
          this.batchProgress.lastMsg = `❌ ${student.name} 失敗: ${err.message}`;
          await new Promise(res => setTimeout(res, 2000));
        }
        await new Promise(res => setTimeout(res, 800));
      }

      this.batchProgress.running = false;
      this.showToast(`批量操作結束。`, 'success');
      this.batchProgress.lastMsg = '任務已結束。';
    },
    // --- 批次操作 ---
    toggleSelectAll() {
      if (this.isAllSelected) {
        this.selectedCaseIds = [];
      } else {
        this.selectedCaseIds = this.filteredCases.map(c => c.id);
      }
    },
    isSelected(id) {
      return this.selectedCaseIds.includes(id);
    },
    async batchUpdateField(field, value) {
      if (!value) return;
      this.loading = true;
      const r = await this.api('batchUpdate', { ids: this.selectedCaseIds, field, value });
      this.loading = false;
      if (r?.success) {
        this.showToast(r.message, 'success');
        await this.fetchData();
        this.selectedCaseIds = [];
      }
    },
    async batchDelete() {
      const count = this.selectedCaseIds.length;
      this.confirmAction(`確定要批次刪除選中的 ${count} 筆個案嗎？此操作不可恢復。`, async () => {
        this.loading = true;
        const r = await this.api('batchDelete', { ids: this.selectedCaseIds });
        this.loading = false;
        if (r?.success) {
          this.showToast(r.message, 'success');
          await this.fetchData();
          this.selectedCaseIds = [];
        }
      });
    },
    canEditCase(c) {
      return this.isAdmin || c.counselor === this.user?.account || c.counselor === this.user?.name;
    },

    // --- Word 匯出 ---
    async exportToWord() {
      if (!window.docx || !window.saveAs) {
        this.showToast("Word 匯出元件尚未載入完成，請稍候", "error");
        return;
      }
      this.loading = true;
      try {
        // 從伺服器抓取最即時的完整資料 (對齊勾選匯出的邏輯)
        const r = await this.api('getCaseFull', { id: this.currentCase.id });
        if (!r?.success) throw new Error(r?.error || '無法取得個案完整資料');

        const caseData = r.data.detail;
        const records = (r.data.records || []).sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

        const doc = this.generateWordDocDef(caseData, records);
        const Packer = window.docx.Packer;
        const blob = await Packer.toBlob(doc);

        saveAs(blob, `${caseData.id}${caseData.name}個案紀錄.docx`);
        this.showToast("個案紀錄已匯出", "success");
      } catch (e) {
        console.error("Single Export Error:", e);
        this.showToast("匯出失敗：" + e.message, "error");
      } finally {
        this.loading = false;
      }
    },

    // --- 服務配對操作 ---
    addServiceItem() {
      if (!this.recordForm.serviceItems) this.recordForm.serviceItems = [];
      this.recordForm.serviceItems.push({ 
        service: '', 
        target: '', 
        gender: this.currentCase?.gender || '男' // 🎯 新增時自動預判
      });
    },
    removeServiceItem(idx) {
      this.recordForm.serviceItems.splice(idx, 1);
    },
    handleServiceChange(item) {
      if (item.service === '0.晤談') {
        item.target = '學生';
        item.gender = this.currentCase?.gender || '男';
      } else if (item.service === '3.家長諮詢') {
        item.target = '14.家長';
      } else if (item.service === '4.教師諮詢') {
        item.target = '13.教職員';
      }
    },

    // --- 開啟匯出 Modal ---
    openExportModal() {
      const now = new Date();
      const m = (now.getMonth() + 1).toString().padStart(2, '0');
      this.exportModal = {
        show: true,
        yearMonth: `${now.getFullYear()}-${m}`
      };
    },

    // --- 月報表匯出主要邏輯 ---
    async exportMonthlyReport() {
      if (!this.exportModal.yearMonth) {
        this.showToast('請選擇月份', 'warning');
        return;
      }

      this.loading = true;
      try {
        const [yearStr, monthStr] = this.exportModal.yearMonth.split('-');
        const sysYear = parseInt(yearStr) - 1911; // 轉民國年

        const targetYear = parseInt(yearStr);
        const targetMonth = parseInt(monthStr);

        this.loading = true;
        const res = await this.api('getMonthlyReportData', { year: targetYear, month: targetMonth });

        if (!res?.success || !res.data) {
          throw new Error(res?.error || '無法取得月報表資料');
        }

        const reportRecords = res.data.records || [];
        const reportCases = res.data.cases || [];
        const teacherCode = res.data.teacherCode || '1';

        console.log('[月報表匯出] 取得紀錄數:', reportRecords.length, '個案數:', reportCases.length, '教師編碼:', teacherCode);
        if (reportRecords.length > 0) {
          console.log('[月報表匯出] 第一筆紀錄 caseId:', reportRecords[0].caseId, typeof reportRecords[0].caseId);
        }
        if (reportCases.length > 0) {
          console.log('[月報表匯出] 第一筆個案 id:', reportCases[0].id, typeof reportCases[0].id);
        }

        if (reportRecords.length === 0) {
          this.showToast('該月份無任何輔導紀錄可以匯出', 'info');
        }

        await this.generateExcelFile(reportRecords, reportCases, sysYear, targetMonth, targetYear, teacherCode);
      } catch (err) {
        console.error(err);
        this.showToast('匯出發生未預期錯誤: ' + err.message, 'error');
      } finally {
        this.loading = false;
        this.exportModal.show = false;
      }
    },

    async generateExcelFile(records, cases, sysYear, month, fullYear, teacherCode) {
      if (!window.ExcelJS) {
        throw new Error('ExcelJS 套件載入失敗，無法匯出');
      }

      // 1. 取得空白月報表官方範本 (Base64)
      this.loadingMsg = '正在從雲端硬碟讀取官方空白月報表範本...';
      const templateRes = await this.api('getMonthlyReportTemplate');
      if (!templateRes || !templateRes.success || !templateRes.base64) {
        throw new Error(templateRes?.error || '無法載入月報表官方空白範本，請確認範本是否放置於 Google Drive 指定路徑中。');
      }

      // 2. 轉換 Base64 為 ArrayBuffer 並載入 ExcelJS
      const binaryString = window.atob(templateRes.base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const templateBuffer = bytes.buffer;

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(templateBuffer);

      // 3. 定位範本工作表
      const sheetA1 = workbook.getWorksheet('表A-1-輔導教師-個案');
      const sheetA2 = workbook.getWorksheet('表A-2-輔導教師-服務');

      if (!sheetA1 || !sheetA2) {
        throw new Error('讀取範本工作表失敗，請確認空白範本內包含「表A-1-輔導教師-個案」與「表A-2-輔導教師-服務」分頁！');
      }

      // 4. 防禦性清理：清空工作表第 4 列之後的所有舊數據，保留其樣式（字型、框線等）
      const maxRowsA1 = Math.max(sheetA1.rowCount, 1000);
      for (let r = 4; r <= maxRowsA1; r++) {
        const row = sheetA1.getRow(r);
        for (let c = 1; c <= 15; c++) {
          row.getCell(c).value = null;
        }
      }

      const maxRowsA2 = Math.max(sheetA2.rowCount, 1000);
      for (let r = 4; r <= maxRowsA2; r++) {
        const row = sheetA2.getRow(r);
        for (let c = 1; c <= 8; c++) {
          row.getCell(c).value = null;
        }
      }

      const tCode = parseInt(teacherCode) || 1;
      // 過濾掉註記為不計入月報表的紀錄 (包含舊有的長標籤與新的短標籤)
      records = records.filter(r => !(r.service || '').includes('純紀錄'));

      const caseMap = {};
      cases.forEach(c => { caseMap[String(c.id)] = c; });

      const gradeMap = {
        '一年級': 1, '二年級': 2, '三年級': 3, '四年級': 4, '五年級': 5, '六年級': 6,
        '七年級': 7, '八年級': 8, '九年級': 9, '七': 7, '八': 8, '九': 9,
        '高一': 10, '高二': 11, '高三': 12
      };
      const getNum = (s) => s ? parseInt((String(s).match(/^(\d+)/) || ['0'])[0]) : 0;

      // ─── 共用樣式 ───
      const dataFont = { name: '標楷體', size: 11 };
      const thinBorder = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };

      // 寫入資料 (從第4列開始)
      let rowA1Idx = 4;
      let writtenA1 = 0;

      // 🎯 效能優化：預先對紀錄進行分類 (Map)，避免在迴圈中重複 filter (O(n*m) -> O(n+m))
      // 🎯 核心進化：將紀錄先依據 (教師編碼 x 個案 ID) 進行分組
      // 這樣同一位學生若被多位老師服務，會產出多列資料 (符合分離統計需求)
      const teacherCaseGroups = new Map();
      records.forEach(r => {
        const key = `${r.teacherCode}|${r.caseId}`;
        if (!teacherCaseGroups.has(key)) {
          teacherCaseGroups.set(key, {
            teacherCode: r.teacherCode,
            caseId: r.caseId,
            records: []
          });
        }
        teacherCaseGroups.get(key).records.push(r);
      });

      teacherCaseGroups.forEach(group => {
        const c = caseMap[String(group.caseId)];
        if (!c) return;

        const myRecords = group.records;
        // 🎯 需求調整：表 A-1 的「當月累積次數」僅計算「0.晤談」類別
        const count = myRecords.filter(r => String(r.service || '').includes('0.晤談')).length;
        
        // 若該老師對該案主當月無晤談紀錄，則不列入表 A-1
        if (count === 0) return;

        const isNew = c.isNew || 1;
        let genderText = '其他';
        if (c.gender === '男') genderText = '生理男';
        if (c.gender === '女') genderText = '生理女';

        const sourceCode = (isNew === 1) ? (getNum(c.caseSource) || 0) : 0;
        
        const typeStrings = (c.caseType || '').split(',').map(s => s.trim());
        const mainTypeStr = typeStrings[0] || '';
        const subTypeStr = typeStrings[1] || '';

        const mainTypeNum = getNum(mainTypeStr) || 19;
        const subTypeNum = getNum(subTypeStr) || 0;

        // 解析嵌入式說明 (19.其他_說明)
        const mainOther = mainTypeStr.includes('_') ? mainTypeStr.split('_')[1] : '';
        const subOther = subTypeStr.includes('_') ? subTypeStr.split('_')[1] : '';

        const idStr = String(c.id);
        const formattedId = idStr.includes('-') ? idStr : (idStr.length >= 4 ? idStr.slice(0, 3) + '-' + idStr.slice(3) : idStr);

        const vals = [
          parseInt(group.teacherCode) || 1, // 採用該筆紀錄所屬老師的編碼
          1, formattedId,
          gradeMap[c.grade] || 8,
          genderText, '', getNum(c.specialEdu),
          isNew, sourceCode, c.referralStatus || 2,
          mainTypeNum, mainOther || 0, subTypeNum, subOther || 0, count
        ];

        const row = sheetA1.getRow(rowA1Idx++);
        vals.forEach((v, i) => {
          const cell = row.getCell(i + 1);
          cell.value = v;
          cell.font = dataFont;
          cell.border = thinBorder;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        writtenA1++;
      });

      console.log(`[表A-1] 共寫入 ${writtenA1} 列個案資料`);

      // 統計相關服務
      const getTargetCode = (targetStr, gradeStr) => {
        const t = targetStr || '';
        if (t.includes('教職員') || t.includes('教師') || t.includes('導師') || t.includes('行政')) return 13;
        if (t.includes('家長')) return 14;
        if (t.includes('專業人員') || t.includes('社工') || t.includes('專業') || t.includes('心理師')) return 15;
        if (t.includes('個案') || t.includes('學生')) {
          return gradeMap[gradeStr] || 7; // 預設七年級碼
        }
        return 13; // 預設歸類為教職員/其他
      };

      const serviceStats = {};
      records.forEach(r => {
        const c = caseMap[String(r.caseId)] || {};
        const gender = c.gender || '男';
        const gradeStr = c.grade || '七';

        // 🎯 核心優化：不再使用交叉相乘 (forEach x forEach)，改用同索引對應
        const services = (r.service || '').split(',').map(s => s.trim()).filter(Boolean);
        const targets = (r.target || '').split(',').map(s => s.trim()).filter(Boolean);
        
        // 取得兩者中比例最長的作為基準，並進行同步遍歷
        const maxLen = Math.max(services.length, targets.length);

        for (let i = 0; i < maxLen; i++) {
          const sRaw = services[i] || services[services.length - 1] || '11.學生諮詢';
          
          // 🎯 需求調整：「0.晤談」不列入表 A-2 相關服務統計
          if (sRaw.includes('0.晤談')) continue;

          let tRaw = targets[i] || targets[targets.length - 1] || '學生';

          // 🎯 核心進化：從對象字串中解析出精確性別 (格式：對象[性別])
          let rowGender = gender; // Default to case gender
          const genderMatch = tRaw.match(/(.*?)\[(男|女|其他)\]/);
          if (genderMatch) {
            tRaw = genderMatch[1];
            rowGender = genderMatch[2];
          }

          const sc = getNum(sRaw) || 17;
          
          // 🎯 月報表服務→對象強制修正：以服務代號決定對象代號，避免舊資料錯誤影響統計
          let tc;
          if (sc === 3) {
            tc = 14; // 家長諮詢 → 必定是家長(14)
          } else if (sc === 4) {
            tc = 13; // 教師諮詢 → 必定是教職員(13)
          } else {
            tc = getTargetCode(tRaw, gradeStr);
          }
          
          const k = `${r.teacherCode}|${sc}|${tc}`;

          if (!serviceStats[k]) serviceStats[k] = { tCode: r.teacherCode, s: sc, t: tc, male: 0, female: 0, other: 0 };
          if (rowGender === '男') serviceStats[k].male++;
          else if (rowGender === '女') serviceStats[k].female++;
          else serviceStats[k].other++;
        }
      });

      let rowA2Idx = 4;
      Object.values(serviceStats).forEach(stat => {
        const row = sheetA2.getRow(rowA2Idx++);
        const vals = [parseInt(stat.tCode) || 1, 1, stat.s, 0, stat.t, stat.male, stat.female, stat.other];
        vals.forEach((v, i) => {
          const cell = row.getCell(i + 1);
          cell.value = v;
          cell.font = dataFont;
          cell.border = thinBorder;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      });

      console.log(`[表A-2] 共寫入 ${Object.keys(serviceStats).length} 列服務統計`);

      // 產生檔案並下載
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `11502輔導教師工作成果_${sysYear}年${month}月_${this.user?.name || ''}.xlsx`);
      this.showToast('月報表匯出成功', 'success');
    },

    // ===== 晤談紀錄 =====
    openRecordModal(rec) {
      if (rec) {
        this.editingRecordId = rec.id;

        let rawTarget = rec.target || '';
        let customTxt = '';
        const match = rawTarget.match(/^(.*?)(?:\s*\((.*?)\))?$/);
        let baseTargetsArr = [];
        if (match) {
          // 🎯 修正：不使用 filter(Boolean) 確保與服務項目索引位置對應
          baseTargetsArr = match[1].split(',').map(s => s.trim());
          if (match[2]) customTxt = match[2];
        }

        const targetArr = [];
        const customTargets = customTxt ? [customTxt] : [];
        baseTargetsArr.forEach(t => {
          // 🎯 修正：辨識時需忽略 [性別] 編碼，且支援舊版無數字編號或舊編號 (如 11.學生) 的匹配
          const cleanT = t.replace(/\[.*?\]$/, '').trim();
          const matchedOpt = this.TARGET_OPTS.find(opt => {
            if (opt === cleanT) return true;
            if (!cleanT) return false;
            // 處理「學生」<->「11.學生」的雙向轉換相容
            if (opt === '學生' && cleanT === '11.學生') return true;
            return opt.endsWith(cleanT);
          });
          
          if (matchedOpt || cleanT === '') {
            // 自動更新為目前選單中的標準字串
            const upgradedT = matchedOpt ? t.replace(cleanT, matchedOpt) : t;
            targetArr.push(upgradedT);
          } else if (t.trim() && t.trim() !== '其他') {
            customTargets.push(t);
          }
        });

        const allMethods = (rec.method || '').split(',').map(s => s.trim()).filter(Boolean);
        const methodArr = [];
        const customMethods = [];
        allMethods.forEach(m => {
          if (this.METHOD_OPTS.includes(m)) methodArr.push(m);
          else customMethods.push(m);
        });

        const serviceArr = (rec.service || '').split(',').map(s => s.trim());
        const excludeFromReport = serviceArr.some(s => (s || '').includes('純紀錄'));
        const cleanServiceArr = serviceArr.filter(s => !(s || '').includes('純紀錄'));

        // 🎯 智慧解析對應關係與性別
        const serviceItems = [];
        const maxLen = Math.max(cleanServiceArr.length, targetArr.length);
        if (maxLen === 0) {
          serviceItems.push({ service: '', target: '', gender: this.currentCase?.gender || '男' });
        } else {
          for (let i = 0; i < maxLen; i++) {
            let tVal = targetArr[i] || '';
            let gVal = this.currentCase?.gender || '男';

            // 從編碼字串還原： 對象[性別]
            const m = tVal.match(/(.*?)\[(男|女|其他)\]/);
            if (m) {
              tVal = m[1];
              gVal = m[2];
            }

            serviceItems.push({
              service: cleanServiceArr[i] || '',
              target: tVal,
              gender: gVal
            });
          }
        }

        this.recordForm = {
          date: rec.dateTime,
          targetArr: targetArr,
          customTarget: customTargets.join(', '),
          methodArr: methodArr,
          customMethod: customMethods.join(', '),
          serviceArr: cleanServiceArr,
          serviceItems: serviceItems, // 🎯 放入對應項目
          content: rec.content,
          contentHTML: this.md2html(rec.content), // 🎨 載入時轉換為網頁樣式
          excludeFromReport: excludeFromReport,
          attachments: rec.attachments || []
        };
      } else {
        this.editingRecordId = null;
        // 🎯 新增錄入模式：先初始化一個今日乾淨表單
        this.recordForm = this.emptyRecordForm();
        // 🚀 自動從「隔離櫃 (recordDrafts)」中取出「完整表單狀態」 (包含日期、勾選、內容)
        if (this.currentCase && this.recordDrafts[this.currentCase.id]) {
          const draft = this.recordDrafts[this.currentCase.id];
          // 排除 Null 或是格式錯誤，進行安全深度拷貝還原
          this.recordForm = JSON.parse(JSON.stringify(draft));
          // 🚀 關鍵：從快取草稿恢復後，也要更新編輯器內部 HTML
          this.recordForm.contentHTML = this.md2html(this.recordForm.content);
        }
      }
      this.showRecordModal = true;
    },
    async clearRecordDraft() {
      const atts = this.recordForm.attachments || [];
      this.confirmAction(`🛠️ 確定要清空目前編輯區嗎？\n這將會清除所有內容，且已上傳的 ${atts.length} 個附件也會從雲端硬碟刪除。`, async () => {
        // 1. 刪除雲端硬碟中的附件
        if (atts.length > 0) {
          this.loading = true;
          this.loadingMsg = '正在清理雲端附件...';
          for (const att of atts) {
            try {
              await this.api('deleteAttachment', { fileId: att.fileId });
            } catch (e) { console.error('刪除附件失敗', e); }
          }
          this.loading = false;
        }

        // 2. 初始化表單 (重置為今天與空白)
        this.recordForm = this.emptyRecordForm();

        // 3. 徹底同步保險櫃與緩存
        if (this.currentCase && this.recordDrafts[this.currentCase.id]) {
          delete this.recordDrafts[this.currentCase.id];
          localStorage.setItem('cms_record_drafts', JSON.stringify(this.recordDrafts));
        }
        this.showToast('編輯區已清空且附件已清理', 'info');
      });
    },
    clearRecordDraftById(id) {
      const student = this.cases.find(c => String(c.id) === String(id));
      const name = student ? student.name : id;
      this.confirmAction(`確定要清除個案「${name}」的所有紀錄草稿嗎？\n(此動作無法復原)`, () => {
        if (this.recordDrafts[id]) {
          delete this.recordDrafts[id];
          localStorage.setItem('cms_record_drafts', JSON.stringify(this.recordDrafts));
          this.showToast('草稿已清除', 'success');
        }
      });
    },
    async saveRecordForm() {
      // 🎨 存檔前，強制將編輯器的 HTML 轉譯回 Markdown 語法
      const editorDiv = document.getElementById('record-editor');
      if (editorDiv) {
        this.recordForm.content = this.html2md(editorDiv.innerHTML);
      }

      if (!this.recordForm.content) { this.showToast('請填寫晤談紀錄', 'error'); return; }

      let targetStr = '';
      if (!this.recordForm.excludeFromReport) {
        // 1. 驗證服務項目與對象是否配對完整
        const items = this.recordForm.serviceItems || [];
        let completedItems = [];
        
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (!it.service && !it.target) continue; // 跳過全空的行
          
          if (!it.service || !it.target) {
            this.showToast(`第 ${i+1} 組服務配對未填寫完整（項目與對象皆須選取）`, 'error');
            return;
          }
          completedItems.push(it);
        }
        
        if (completedItems.length === 0) {
          this.showToast('非單純記錄時，請務必至少填寫一組完整的服務項目與對象', 'error');
          return;
        }

        // 2. 驗證服務方式是否已勾選或填寫
        const hasMethod = this.recordForm.methodArr.length > 0 || (this.recordForm.customMethod && this.recordForm.customMethod.trim());
        if (!hasMethod) {
          this.showToast('非單純記錄時，請務必勾選或填寫「服務方式」', 'error');
          return;
        }

        // 3. 通過驗證，處理資料陣列
        this.recordForm.serviceArr = completedItems.map(it => it.service); 
        this.recordForm.targetArr = completedItems.map(it => `${it.target}[${it.gender || '男'}]`);
        
        targetStr = this.recordForm.targetArr.join(', ');
      } else {
        // 單純記錄模式：不強制完整性驗證，但仍提取填寫的項目以供記錄顯示
        const activeItems = (this.recordForm.serviceItems || []).filter(it => it.service || it.target);
        this.recordForm.serviceArr = activeItems.map(it => it.service || ' '); 
        this.recordForm.targetArr = activeItems.map(it => it.target ? `${it.target}[${it.gender || '男'}]` : ' ');
        
        targetStr = this.recordForm.targetArr.join(', ');
      }

      if (this.recordForm.customTarget && this.recordForm.customTarget.trim()) {
        const custom = this.recordForm.customTarget.trim();
        targetStr = targetStr ? `${targetStr}(${custom})` : `(${custom})`;
      }

      // 合併方式
      const combinedMethods = [...this.recordForm.methodArr];
      if (this.recordForm.customMethod && this.recordForm.customMethod.trim()) {
        const custom = this.recordForm.customMethod.split(',').map(s => s.trim()).filter(Boolean);
        custom.forEach(m => { if (!combinedMethods.includes(m)) combinedMethods.push(m); });
      }

      this.loadingMsg = '正在儲存晤談紀錄...';
      this.loading = true;
      const methodStr = combinedMethods.join(',');

      const servicesToSave = [...this.recordForm.serviceArr];
      if (this.recordForm.excludeFromReport) {
        servicesToSave.push('純紀錄');
      }
      const serviceStr = servicesToSave.join(',');

      let r;
      if (this.editingRecordId) {
        r = await this.api('updateRecord', {
          id: this.editingRecordId,
          dateTime: this.recordForm.date,
          target: targetStr,
          method: methodStr,
          service: serviceStr,
          content: this.recordForm.content,
          recorderName: this.user.name,
            attachments: this.recordForm.attachments
          });
      } else {
        r = await this.api('addRecord', {
          caseId: this.currentCase.id,
          dateTime: this.recordForm.date,
          target: targetStr,
          method: methodStr,
          service: serviceStr,
          content: this.recordForm.content,
          recorderName: this.user.name,
            attachments: this.recordForm.attachments
          });
      }
      this.loading = false;
      if (r?.success) {
        this.showToast(r.message, 'success');
        this.showRecordModal = false;
        this.editingRecordId = null;
        if (this.currentCase && this.recordDrafts[this.currentCase.id]) {
          delete this.recordDrafts[this.currentCase.id];
          localStorage.setItem('cms_record_drafts', JSON.stringify(this.recordDrafts));
        }
        this.recordForm = this.emptyRecordForm();

        // 🚀 自動刷新：確保資料庫中最新的 Markdown 序列與渲染效果正確呈現
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    },
    async deleteRecord(id) {
      this.confirmAction('確定要刪除此晤談紀錄？', async () => {
        this.loadingMsg = '正在刪除晤談紀錄...';
        this.loading = true;
        const r = await this.api('deleteRecord', { id });
        this.loading = false;
        if (r?.success) {
          this.showToast(r.message, 'success');
          await this.fetchData(); // 刷新儀表板
          const rr = await this.api('getRecords', { caseId: this.currentCase.id });
          if (rr?.success) this.records = rr.data;
        }
      });
    },
    canEditRecord(rec) {
      return this.isAdmin || rec.recorderAccount === this.user?.account;
    },

    // ===== 使用者管理 =====
    async loadUsers() {
      const r = await this.api('getUsers');
      if (r?.success) this.users = r.data;
    },
    openUserModal(u) {
      if (u) {
        this.editingUserId = u.account;
        this.userForm = { account: u.account, password: '', name: u.name, role: u.role, status: u.status, teacherCode: u.teacherCode || '' };
      } else {
        this.editingUserId = null;
        this.userForm = { account: '', password: '', name: '', role: '專輔教師', status: '啟用', teacherCode: '' };
      }
      this.showUserModal = true;
    },
    async saveUserForm() {
      if (!this.userForm.name) { this.showToast('請填寫姓名', 'error'); return; }
      this.loadingMsg = '正在儲存帳號資訊...';
      this.loading = true;
      let r;
      if (this.editingUserId) {
        r = await this.api('updateUser', {
          targetAccount: this.editingUserId,
          newName: this.userForm.name,
          newRole: this.userForm.role,
          newStatus: this.userForm.status,
          newTeacherCode: this.userForm.teacherCode || '',
          newPassword: this.userForm.password || undefined
        });
      } else {
        if (!this.userForm.account || !this.userForm.password) {
          this.showToast('請填寫帳號和密碼', 'error'); this.loading = false; return;
        }
        r = await this.api('addUser', {
          newAccount: this.userForm.account, newPassword: this.userForm.password,
          newName: this.userForm.name, newRole: this.userForm.role,
          newTeacherCode: this.userForm.teacherCode || ''
        });
      }
      this.loading = false;
      if (r?.success) {
        this.showToast(r.message, 'success');
        this.showUserModal = false;
        await this.fetchData();
        await this.loadUsers();
      }
    },
    async deleteUser(account) {
      this.confirmAction(`確定要刪除帳號「${account}」？`, async () => {
        this.loadingMsg = '正在刪除帳號...';
        this.loading = true;
        const r = await this.api('deleteUser', { targetAccount: account });
        this.loading = false;
        if (r?.success) {
          this.showToast(r.message, 'success');
          await this.fetchData();
          await this.loadUsers();
        }
      });
    },

    // ===== 修改密碼 =====
    async changePassword() {
      const { oldPwd, newPwd, confirmPwd } = this.pwdForm;
      if (!oldPwd || !newPwd || !confirmPwd) {
        this.showToast('請填寫所有欄位', 'error'); return;
      }
      if (newPwd !== confirmPwd) {
        this.showToast('新密碼與確認密碼不一致', 'error'); return;
      }
      if (newPwd.length < 4) {
        this.showToast('新密碼至少需要 4 個字元', 'error'); return;
      }
      this.loading = true;
      const r = await this.api('changePassword', {
        account: this.user.account,
        oldPassword: oldPwd,
        newPassword: newPwd
      });
      this.loading = false;
      if (r?.success) {
        this.showToast('密碼修改成功', 'success');
        this.showChangePwd = false;
        this.pwdForm = { oldPwd: '', newPwd: '', confirmPwd: '' };
      }
    },

    // ===== 配置管理介面 =====
    openConfigModal(type) {
      this.configType = type;
      if (type === 'classes') {
        const list = this.configs.classes || [];
        this.configItems = JSON.parse(JSON.stringify(list)).map(c => ({
          grade: c['年級'] || '', class: c['班級'] || '', homeroom: c['導師'] || '', classGuidance: c['班輔'] || '', counselor: c['專輔'] || ''
        }));
        if (this.configItems.length === 0) this.addConfigRow();
      }
    },
    addConfigRow() {
      if (this.configType === 'classes') {
        this.configItems.push({ grade: '', class: '', homeroom: '', classGuidance: '', counselor: '' });
      }
    },
    removeConfigRow(idx) {
      this.configItems.splice(idx, 1);
    },
    async saveConfigs() {
      this.loading = true;
      const r = await this.api('saveConfig', { configType: this.configType, items: this.configItems });
      this.loading = false;
      if (r?.success) {
        this.showToast(r.message, 'success');
        this.fetchData(); // 自動重整配置與頁面內容
      }
    },

    // ===== 設定 =====
    initGasUrl() {
      const params = new URLSearchParams(window.location.search);
      const configParam = params.get('config');
      if (configParam) {
        try {
          this.gasUrl = atob(configParam);
          localStorage.setItem('cms_gas_url', this.gasUrl);
        } catch (e) { }
      } else {
        this.gasUrl = localStorage.getItem('cms_gas_url') || DEFAULT_GAS_URL;
      }
    },
    generateShareLink() {
      if (!this.gasUrl) { this.showToast('請先設定 GAS URL', 'error'); return; }
      const base = window.location.origin + window.location.pathname;
      const encoded = btoa(this.gasUrl);
      const link = `${base}?config=${encoded}`;
      navigator.clipboard.writeText(link).then(() => {
        this.showToast('分享連結已複製到剪貼簿', 'success');
      });
    },
    async runBatchUpdate(action) {
      const msgs = {
        'updateAllCaseIds': '確定要將所有個案編號轉換為 7 碼規則嗎？系統會同步更新所有關聯紀錄（如晤談紀錄）。',
        'updateAllSemesters': '確定要將所有提報日期轉換為「學期」格式嗎？'
      };

      this.confirmAction(msgs[action] || '確定執行此批次更新？', async () => {
        this.loading = true;
        const r = await this.api(action);
        this.loading = false;

        if (r?.success) {
          this.showToast(r.message, 'success');
          await this.fetchData(); // 重新載入最新資料
        }
      });
    },
    clearSettings() {
      localStorage.removeItem('cms_gas_url');
      localStorage.removeItem('cms_user');
      this.gasUrl = DEFAULT_GAS_URL;
      this.showToast('設定已清除，頁面即將重新整理', 'info');
      setTimeout(() => location.reload(), 1500);
    },

    // ===== 通用 =====
    showToast(msg, type = 'info') {
      clearTimeout(this.toastTimer);
      this.toast = { show: true, msg, type };
      this.toastTimer = setTimeout(() => { this.toast.show = false; }, 3000);
    },
    confirmAction(msg, callback) {
      this.confirm = { show: true, msg, callback };
    },
    doConfirm() {
      if (this.confirm.callback) this.confirm.callback();
      this.confirm = { show: false, msg: '', callback: null };
    },
    // 加入配置標籤切換
    switchConfig(type) {
      if (this.configType === type) return;
      this.openConfigModal(type);
    },
    cancelConfirm() {
      this.confirm = { show: false, msg: '', callback: null };
    },
    resetFilters() {
      this.searchInputStr = '';
      this.searchQuery = '';
      this.filterGrade = '';
      this.filterStatus = '';
      this.filterCounselor = '';
      this.filterIdentity = ''; // 重置身分篩選
      this.selectedCaseIds = [];
      this.casePage = 1;
    },
    navigate(p) {
      this.page = p; this.sidebarOpen = false;
      if (p === 'dashboard') this.loadDashboard();
      if (p === 'cases') this.loadCases();
      if (p === 'users' && this.isAdmin) this.loadUsers();
      if (p === 'settings') {
        this.openConfigModal('classes');
      }
    },
    goBackToCases() {
      this.page = 'cases';
    },

    openFeedbackModal() {
      const now = new Date();
      const sy = now.getFullYear() - 1911;
      const month = now.getMonth() + 1;
      const csem = (month >= 8) ? `${sy}-1` : (month >= 2 ? `${sy - 1}-2` : `${sy - 1}-1`);

      const parts = csem.split('-');
      let ty = parseInt(parts[0], 10);
      let ts = parseInt(parts[1], 10);
      if (ts === 1) { ty -= 1; ts = 2; }
      else { ts = 1; }
      const tsem = `${ty}-${ts}`;

      this.feedbackModal = { show: true, currentSem: csem, targetSem: tsem };
    },

    async exportFeedbackForms() {
      const targetSem = this.feedbackModal.targetSem;
      const currentSem = this.feedbackModal.currentSem;
      if (!targetSem || !currentSem) return;

      this.loading = true;
      try {
        // 先取得全體學生的各學期綜述
        const sumRes = await this.api('getBatchSummaries');
        const summaryMap = {};
        if (sumRes?.success && sumRes.data) {
          sumRes.data.forEach(item => { summaryMap[item.id] = item; });
        } else {
          this.showToast('無法撈取學生綜述，請確認是否已更新 Code.gs 後重新發布部屬！', 'error');
          this.loading = false;
          return;
        }

        const getSemesterField = (tSem, cSem, gradeStr) => {
          const [tY, tS] = tSem.split('-').map(Number);
          const [cY, cS] = cSem.split('-').map(Number);
          if (!tY || !tS || !cY || !cS) return null;
          const diff = (cY - tY) * 2 + (cS - tS);
          const gNum = { '七': 7, '八': 8, '九': 9 }[gradeStr] || parseInt(gradeStr, 10);
          if (!gNum) return null;
          const targetAbs = (gNum - 7) * 2 + cS - diff;
          return ['s_7a', 's_7b', 's_8a', 's_8b', 's_9a', 's_9b'][targetAbs - 1] || null;
        };

        const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, VerticalAlign, PageBreak, SectionType } = window.docx;
        const KAI_FONT = "標楷體";
        const FONT_SIZE = 24; // 12pt
        const FONT_SIZE_TITLE = 32; // 16pt

        let targetCases = [];
        this.cases.forEach(c => {
          const sumField = getSemesterField(targetSem, currentSem, c.grade);
          if (sumField) {
            const caseSums = summaryMap[c.id];
            const text = caseSums ? caseSums[sumField] : '';
            if (text && text.trim() !== '') {
              targetCases.push({
                ...c,
                exportSummary: text,
                counselor: caseSums ? caseSums.counselor : c.counselor,
                mentorTeacher: caseSums ? caseSums.mentorTeacher : '',
                specialEduTeacher: caseSums ? caseSums.specialEduTeacher : '',
                serviceMethod: caseSums ? caseSums.serviceMethod : ''
              });
            }
          }
        });

        targetCases.sort((a, b) => {
          if (a.class !== b.class) return String(a.class).localeCompare(String(b.class));
          return Number(a.seatNo || 0) - Number(b.seatNo || 0);
        });

        if (targetCases.length === 0) {
          this.showToast('該學期沒有任何已填寫綜述的學生', 'error');
          this.loading = false;
          return;
        }

        const modernBorders = {
          top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        };

        const createCell = (text, widthPct, bold = false, align = "left", shading = null) => {
          const opts = {
            width: { size: widthPct, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            borders: modernBorders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: []
          };
          if (shading) {
            opts.shading = { fill: shading };
          }
          const lines = String(text || '').split('\n');
          lines.forEach((line) => {
            opts.children.push(new Paragraph({
              children: [new TextRun({ text: line, font: KAI_FONT, size: FONT_SIZE, bold: bold })],
              alignment: align === "center" ? AlignmentType.CENTER : AlignmentType.LEFT
            }));
          });
          return new TableCell(opts);
        };

        function maskNameVertical(name) {
          if (!name) return '';
          let masked = name;
          if (name.length <= 2) masked = name.charAt(0) + '○';
          else masked = name.charAt(0) + '○' + name.substring(2);
          return masked.split('').join('\n');
        }

        const tParts = targetSem.split('-');
        const tY = tParts[0];
        const tS = tParts[1] === '1' ? '第一學期' : '第二學期';

        const classGroups = {};
        targetCases.forEach(c => {
          const gStr = { '七': '7', '八': '8', '九': '9' }[c.grade] || c.grade || '';
          const cStr = String(c.class || '').padStart(2, '0');
          const cls = (gStr && cStr) ? `${gStr}${cStr}` : '未知班級';

          if (!classGroups[cls]) classGroups[cls] = [];
          classGroups[cls].push(c);
        });

        const sortedClasses = Object.keys(classGroups).sort();
        const docSections = [];

        sortedClasses.forEach((groupClass, index) => {
          const classChildren = [];

          // 標題
          classChildren.push(new Paragraph({
            children: [
              new TextRun({ text: `臺北市立建成國民中學 ${tY} 學年度 `, font: KAI_FONT, size: FONT_SIZE_TITLE, bold: true }),
              new TextRun({ text: `${tS}`, font: KAI_FONT, size: FONT_SIZE_TITLE, bold: true, color: "FF0000" }),
              new TextRun({ text: ` 「優先關懷學生」回覆表`, font: KAI_FONT, size: FONT_SIZE_TITLE, bold: true })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 150 }
          }));

          // 副標題
          classChildren.push(new Paragraph({
            children: [
              new TextRun({ text: "         本文件為", font: KAI_FONT, size: 20 }),
              new TextRun({ text: "保密文件", font: KAI_FONT, size: 24, bold: true, color: "FF0000" }),
              new TextRun({ text: "，請於填報、密封、交回輔導室，日後若有需求可再提報", font: KAI_FONT, size: 20 })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 }
          }));

          // 班級與簽名核對行
          classChildren.push(new Paragraph({
            children: [
              new TextRun({ text: `班級：${groupClass}   `, font: KAI_FONT, size: 28, bold: true }),
              new TextRun({ text: `導師確認簽名：__________________  日期： ${parseInt(tY) + 1} 年   月   日`, font: KAI_FONT, size: 28, bold: true })
            ],
            spacing: { after: 200 }
          }));

          // 建立該班級表格
          const tableRows = [];

          // 表頭
          tableRows.push(new TableRow({
            children: [
              createCell("", 4, true, "center", "F2F2F2"),
              createCell("姓名", 8, true, "center", "F2F2F2"),
              createCell("個案類型", 14, true, "center", "F2F2F2"),
              createCell("上學期處遇方式", 20, true, "center", "F2F2F2"),
              createCell("服務評估概述", 30, true, "center", "F2F2F2"),
              createCell("持續服務評估", 12, true, "center", "F2F2F2"),
              createCell("導師意見", 12, true, "center", "F2F2F2")
            ]
          }));

          // 內容
          classGroups[groupClass].forEach((c, cIdx) => {
            const smParagraphs = [];
            [
              { title: "個案輔導：", val: c.counselor },
              { title: "認輔教師：", val: c.mentorTeacher },
              { title: "特教個管：", val: c.specialEduTeacher },
              { title: "服務方式：", val: c.serviceMethod }
            ].forEach(item => {
              if (item.val && item.val.trim() !== '-') {
                smParagraphs.push(new Paragraph({
                  children: [new TextRun({ text: item.title, font: KAI_FONT, size: FONT_SIZE, bold: true })]
                }));
                // 內容如有換行則分開處理
                const vLines = item.val.split('\n');
                vLines.forEach(vl => {
                  smParagraphs.push(new Paragraph({
                    children: [new TextRun({ text: vl, font: KAI_FONT, size: FONT_SIZE })]
                  }));
                });
              }
            });

            const smCell = new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              borders: modernBorders,
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              children: smParagraphs.length ? smParagraphs : [new Paragraph({ children: [new TextRun({ text: "", font: KAI_FONT, size: FONT_SIZE })] })]
            });

            let evalText = "建議持續二級輔導";
            if (c.status === "已結案") {
              evalText = "結案觀察";
            }

            tableRows.push(new TableRow({
              children: [
                createCell(`${cIdx + 1}`, 4, false, "center"),
                createCell(maskNameVertical(c.name), 8, false, "center"),
                createCell(c.caseType || '', 14, false, "left"),
                smCell,
                createCell(c.exportSummary || '', 30, false, "left"),
                createCell(evalText, 12, false, "center"),
                createCell("", 12, false, "left", "EAEAEA")
              ]
            }));
          });

          classChildren.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows
          }));

          docSections.push({
            properties: {
              type: SectionType ? SectionType.ODD_PAGE : "oddPage",
              page: {
                margin: {
                  top: 720,
                  right: 720,
                  bottom: 720,
                  left: 720
                }
              }
            },
            children: classChildren
          });
        });

        const doc = new Document({
          sections: docSections
        });

        const buffer = await Packer.toBlob(doc);
        window.saveAs(buffer, `導師回覆表_${targetSem}_共${targetCases.length}份.docx`);
        this.feedbackModal.show = false;
        this.showToast('導師回覆表產生成功！', 'success');

      } catch (err) {
        console.error(err);
        this.showToast('生成 Word 失敗，請重試', 'error');
      } finally {
        this.loading = false;
      }
    },


    formatDate(d) {
      if (!d) return '-';
      const s = String(d);
      if (s.length === 10) return s;
      return s.slice(0, 10);
    },

    // 🎨 Markdown <-> HTML 雙向翻譯引擎
    md2html(md) {
      if (!md) return '';
      // 1. 處理底色 ==text== -> <mark>text</mark>
      let html = md.replace(/==(.*?)==/g, '<mark>$1</mark>');
      // 2. 處理粗體 **text** -> <strong>text</strong>
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      const lines = html.split('\n');
      let inUl = false, inOl = false;
      const res = [];

      lines.forEach(line => {
        const ulMatch = line.match(/^[\-\*]\s+(.*)/);
        const olMatch = line.match(/^\d+\.\s+(.*)/);

        if (ulMatch) {
          if (!inUl) { if (inOl) { res.push('</ol>'); inOl = false; } res.push('<ul>'); inUl = true; }
          res.push(`<li>${ulMatch[1]}</li>`);
        } else if (olMatch) {
          if (!inOl) { if (inUl) { res.push('</ul>'); inUl = false; } res.push('<ol>'); inOl = true; }
          res.push(`<li>${olMatch[1]}</li>`);
        } else {
          if (inUl) { res.push('</ul>'); inUl = false; }
          if (inOl) { res.push('</ol>'); inOl = false; }
          res.push(line ? `<div>${line}</div>` : '<div><br></div>');
        }
      });
      if (inUl) res.push('</ul>');
      if (inOl) res.push('</ol>');
      return res.join('');
    },
    html2md(html) {
      const div = document.createElement('div');
      div.innerHTML = html.replace(/<p>/g, '<div>').replace(/<\/p>/g, '</div>'); // 統一轉換

      const process = (node) => {
        let md = '';
        node.childNodes.forEach(child => {
          if (child.nodeType === 3) { // Text
            md += child.textContent;
          } else if (child.nodeType === 1) { // Element
            const tag = child.tagName.toLowerCase();
            if (tag === 'b' || tag === 'strong') md += `**${process(child)}**`;
            else if (tag === 'mark') md += `==${process(child)}==`;
            else if (tag === 'li') {
              const parentTag = child.parentNode.tagName.toLowerCase();
              if (parentTag === 'ol') {
                // 🚀 動態計算序號
                const siblings = Array.from(child.parentNode.children);
                const index = siblings.indexOf(child) + 1;
                md += `${index}. ${process(child)}\n`;
              } else {
                md += `- ${process(child)}\n`;
              }
            } else if (tag === 'div' || tag === 'br') {
              const inner = process(child);
              if (inner || tag === 'br') md += (inner || '') + '\n';
            } else if (tag === 'ul' || tag === 'ol') {
              md += process(child);
            } else {
              md += process(child);
            }
          }
        });
        return md;
      };

      return process(div).trim().replace(/\n{3,}/g, '\n\n');
    },
    execEditorCommand(cmd, val = null) {
      if (cmd === 'highlight') {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        if (!selectedText) return;

        // 檢查是否已經被 mark 包裹
        const parent = range.commonAncestorContainer.parentElement;
        if (parent && parent.tagName.toLowerCase() === 'mark') {
          // 移除 mark (還原)
          const textNode = document.createTextNode(parent.textContent);
          parent.parentNode.replaceChild(textNode, parent);
        } else {
          // 插入 mark
          const mark = document.createElement('mark');
          mark.textContent = selectedText;
          range.deleteContents();
          range.insertNode(mark);
        }
      } else {
        document.execCommand(cmd, false, val);
      }

      // 強制同步回內容
      const editorDiv = document.getElementById('record-editor');
      if (editorDiv) {
        this.recordForm.content = this.html2md(editorDiv.innerHTML);
      }
    },

    // ===== 系統備份與維護 =====
    generateWordDocDef(c, records) {
      const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, VerticalAlign, BorderStyle, ExternalHyperlink } = window.docx;

      const FONT_SIZE = 24;
      const FONT_SIZE_TITLE = 36;
      const FONT_SIZE_LABEL = 24;
      const lightBorder = { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" };
      const modernBorders = { top: lightBorder, bottom: lightBorder, left: lightBorder, right: lightBorder };

      const create2ColRow = (label, value) => new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: "F8FAFC" }, verticalAlign: VerticalAlign.CENTER, borders: modernBorders,
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: FONT_SIZE_LABEL, color: "475569" })], alignment: AlignmentType.CENTER })],
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER, borders: modernBorders,
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: String(value || '-'), size: FONT_SIZE, color: "1E293B" })], spacing: { before: 40, after: 40 } })],
          }),
        ],
      });

      const infoRows = [
        create2ColRow("個案姓名", c.name),
        create2ColRow("學生性別", c.gender),
        create2ColRow("年/班/座號", `${c.grade}年 ${c.class}班 ${c.seatNo}號`),
        create2ColRow("個案編號", c.id),
        create2ColRow("個案類別", c.caseType),
        create2ColRow("個案來源", c.caseSource),
        create2ColRow("專輔個案摘要", c.situation),
        create2ColRow("導師提報內容", (c.reportDate ? `(${c.reportDate}) ` : '') + (c.teacherReport || '-')),
        create2ColRow("主要服務方式", c.serviceMethod),
        create2ColRow("負責專職輔導", c.counselor),
        create2ColRow("認輔教師", c.mentorTeacher),
        create2ColRow("身分背景", c.identity),
      ];

      if (c.specialEdu && c.specialEdu !== '0.以下皆非' && c.specialEdu !== '-') {
        infoRows.push(create2ColRow("特教身分", c.specialEdu + (c.specialEduTeacher ? ` (個管：${c.specialEduTeacher})` : '')));
      }

      ['s_7a', 's_7b', 's_8a', 's_8b', 's_9a', 's_9b'].forEach(k => {
        const l = { 's_7a': '七年級上學期綜述', 's_7b': '七年級下學期綜述', 's_8a': '八年級上學期綜述', 's_8b': '八年級下學期綜述', 's_9a': '九年級上學期綜述', 's_9b': '九年級下學期綜述' }[k];
        if (c[k]) infoRows.push(create2ColRow(l, c[k]));
      });

      const recordRows = [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" }, borders: modernBorders, margins: { top: 120, bottom: 120, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "項次", bold: true, size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" }, borders: modernBorders, margins: { top: 120, bottom: 120, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "日期", bold: true, size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" }, borders: modernBorders, margins: { top: 120, bottom: 120, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "對象", bold: true, size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" }, borders: modernBorders, margins: { top: 120, bottom: 120, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "方式", bold: true, size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 62, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" }, borders: modernBorders, margins: { top: 120, bottom: 120, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "紀錄內容", bold: true, size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 7, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" }, borders: modernBorders, margins: { top: 120, bottom: 120, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "記錄者", bold: true, size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
          ]
        })
      ];

      records.forEach((r, idx) => {
        const createDataCell = (text, width, align = AlignmentType.CENTER) => new TableCell({
          borders: modernBorders, 
          verticalAlign: VerticalAlign.CENTER, 
          margins: { top: 120, bottom: 120, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: String(text || '-'), size: FONT_SIZE })], alignment: align })]
        });

        let contentChildren = this.parseMarkdownToDocx(r.content, FONT_SIZE);
        if (r.attachments && r.attachments.length > 0) {
          const { ImageRun, Paragraph, TextRun, ExternalHyperlink } = window.docx;
          contentChildren.push(new Paragraph({ children: [new TextRun({ text: "【附件】", bold: true, size: FONT_SIZE })], spacing: { before: 100 } }));
          
          for (let att of r.attachments) {
            const displayTitle = att.desc || att.fileName;
            if (att.thumbnailBase64) {
              // 1. 如果是圖片，僅加入圖片，若有說明則加上說明文字
              try {
                const byteCharacters = atob(att.thumbnailBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                
                contentChildren.push(new Paragraph({
                  children: [
                    new ImageRun({
                      data: byteArray,
                      transformation: { width: 160, height: 160 } 
                    }),
                    att.desc ? new TextRun({ text: " " + att.desc, size: FONT_SIZE, bold: true }) : null
                  ].filter(Boolean),
                  spacing: { before: 80 }
                }));
              } catch(e) { 
                console.error('匯出 Word 圖片錯誤', e); 
                contentChildren.push(new Paragraph({ children: [new TextRun({ text: `📎 ${displayTitle}`, size: FONT_SIZE })], spacing: { before: 80 } }));
              }
            } else {
              // 2. 如果是非圖片，加入可點擊的超連結，優先顯示說明
              contentChildren.push(new Paragraph({
                children: [
                  new ExternalHyperlink({
                    children: [
                      new TextRun({ 
                        text: "📎 " + displayTitle, 
                        size: FONT_SIZE, 
                        color: "2563EB", 
                        underline: { color: "2563EB" } 
                      })
                    ],
                    link: att.url
                  })
                ],
                spacing: { before: 80 }
              }));
            }
          }
        }

        recordRows.push(new TableRow({
          children: [
            createDataCell(idx + 1, 5),
            createDataCell(this.formatDate(r.dateTime), 10),
            createDataCell(r.target, 8),
            createDataCell(r.method, 8),
            new TableCell({
              width: { size: 62, type: WidthType.PERCENTAGE },
              borders: modernBorders,
              margins: { top: 120, bottom: 120, left: 120, right: 120 },
              children: contentChildren 
            }),
            createDataCell(r.recorderName, 7),
          ]
        }));
      });

      return new Document({
        creator: "輔導個案管理系統", title: `個案紀錄-${c.name}`,
        styles: { default: { document: { run: { font: "微軟正黑體", size: FONT_SIZE, color: "1E293B" } } } },
        sections: [{
          properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
          children: [
            new Paragraph({ children: [new TextRun({ text: "建成國中學生輔導紀錄", bold: true, size: FONT_SIZE_TITLE, color: "0F172A" })], alignment: AlignmentType.CENTER, spacing: { after: 600 } }),
            new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: infoRows }),
            new Paragraph({ children: [new TextRun({ text: "【 輔導歷程與服務紀錄回顧 】", bold: true, size: FONT_SIZE + 6, color: "1E293B" })], spacing: { before: 800, after: 300 } }),
            new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: recordRows })
          ],
        }],
      });
    },

    // 🎨 Word 專用 Markdown 解析器
    parseMarkdownToDocx(md, fontSize) {
      const { Paragraph, TextRun, AlignmentType } = window.docx;
      if (!md) return [new Paragraph({ children: [new TextRun({ text: "", size: fontSize })] })];

      const lines = md.split('\n');
      const paragraphs = [];

      lines.forEach(line => {
        let text = line.trim();
        if (!text) {
          paragraphs.push(new Paragraph({ children: [new TextRun({ text: "", size: fontSize })], spacing: { before: 80, after: 80 } }));
          return;
        }

        let isBullet = null;
        let isBulletPrefix = '';

        // 偵測清單類型 (區分 ul/ol)
        if (text.startsWith('- ') || text.startsWith('* ')) {
          isBullet = 'ul';
          text = text.trim().substring(2);
        } else {
          // 修正正則：確保能抓到多位數
          const olMatch = text.match(/^(\d+\.)\s+(.*)/);
          if (olMatch) {
            isBullet = 'ol';
            isBulletPrefix = olMatch[1]; // 這裡會抓到正確的 "1.", "2." 等
            text = olMatch[2];
          }
        }

        const children = [];
        // 🚀 將清單符號/序號加回 children
        if (isBullet === 'ol') {
          children.push(new TextRun({
            text: isBulletPrefix + " ",
            bold: true,
            size: fontSize,
            color: "1E293B" // 代碼塊/序號使用深色
          }));
        }

        // 🎨 混合解析：粗體與底色
        const tokens = text.split(/(==.*?==|\*\*.*?\*\*)/g);

        tokens.forEach(token => {
          if (token.startsWith('==') && token.endsWith('==')) {
            // 解析底色：使用 Word 精緻淡藍
            children.push(new TextRun({
              text: token.slice(2, -2),
              size: fontSize,
              shading: { fill: "CCE5FF" }
            }));
          } else if (token.startsWith('**') && token.endsWith('**')) {
            // 解析粗體：官方正式深藍
            children.push(new TextRun({
              text: token.slice(2, -2),
              bold: true,
              size: fontSize,
              color: "1B2E57"
            }));
          } else if (token) {
            children.push(new TextRun({ text: token, size: fontSize }));
          }
        });

        if (children.length === 0) children.push(new TextRun({ text: "", size: fontSize }));

        const pProps = {
          children: children,
          spacing: { before: 40, after: 40 }
        };

        if (isBullet === 'ul') {
          pProps.bullet = { level: 0 };
          pProps.indent = { left: 440, hanging: 440 };
        } else if (isBullet === 'ol') {
          pProps.indent = { left: 440, hanging: 440 };
        }

        paragraphs.push(new Paragraph(pProps));
      });

      return paragraphs;
    },

    async exportBatchWord() {
      if (!window.docx || !window.JSZip || !window.saveAs) {
        this.showToast('需要載入 docx 或 JSZip 套件', 'error');
        return;
      }
      this.loading = true;
      try {
        const res = await this.api('backupData', { grade: this.backupGrade });
        if (!res || !res.success) throw new Error(res?.error || '無法取得備份資料');

        const { cases, records } = res.data;
        if (cases.length === 0) {
          this.showToast('該年級無個案可匯出', 'info');
          return;
        }

        this.showToast('正在產生 Word 檔案...', 'info');
        const zip = new JSZip();
        const Packer = window.docx.Packer;

        // Group records
        const recordMap = {};
        records.forEach(r => {
          const cid = String(r['個案編號']);
          if (!recordMap[cid]) recordMap[cid] = [];

          recordMap[cid].push({
            dateTime: r['日期時間'],
            target: r['對象'],
            method: r['方式'],
            recorderName: r['記錄者姓名'] || r['記錄者帳號'],
            content: r['輔導服務紀錄']
          });
        });

        for (const c of cases) {
          // Normalize formatting mapping
          const mappedCase = {
            id: String(c['個案編號'] || ''),
            name: String(c['姓名'] || ''),
            grade: String(c['年級'] || ''),
            class: String(c['班級'] || ''),
            seatNo: String(c['座號'] || ''),
            gender: String(c['性別'] || ''),
            caseType: String(c['個案類型'] || '-'),
            situation: String(c['專輔個案摘要'] || ''),
            teacherReport: String(c['導師提報內容'] || ''),
            serviceMethod: String(c['個案服務方式'] || ''),
            identity: String(c['身分背景'] || ''),
            specialEdu: String(c['特教身分'] || ''),
            counselor: String(c['專輔'] || ''),
            mentorTeacher: String(c['認輔教師'] || ''),
            specialEduTeacher: String(c['特教個管老師'] || ''),
            caseSource: String(c['個案來源'] || ''),
            reportDate: String(c['提報學期'] || ''),
            s_7a: c['七上綜述'], s_7b: c['七下綜述'], s_8a: c['八上綜述'], s_8b: c['八下綜述'], s_9a: c['九上綜述'], s_9b: c['九下綜述']
          };
          const rawRecords = recordMap[String(c['個案編號'])] || [];
          rawRecords.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

          const doc = this.generateWordDocDef(mappedCase, rawRecords);
          const blob = await Packer.toBlob(doc);
          zip.file(`${mappedCase.id}${mappedCase.name}個案紀錄.docx`, blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `CCMS_個案匯出_${this.backupGrade}年級_${this.formatDate(new Date())}.zip`);
        this.showToast('打包下載完成！', 'success');

      } catch (e) {
        console.error(e);
        this.showToast('批次匯出失敗：' + e.message, 'error');
      } finally {
        this.loading = false;
      }
    },

    async exportSelectedWord() {
      if (!window.docx || !window.JSZip || !window.saveAs) {
        this.showToast('需要載入 docx 或 JSZip 套件', 'error');
        return;
      }
      if (this.selectedCaseIds.length === 0) {
        this.showToast('請先勾選要匯出的個案', 'warning');
        return;
      }
      this.loading = true;
      try {
        const res = await this.api('backupData', { grade: '全部' });
        if (!res || !res.success) throw new Error(res?.error || '無法取得資料');

        const { cases, records } = res.data;
        const selectedCases = cases.filter(c => this.selectedCaseIds.includes(String(c['個案編號'])));

        if (selectedCases.length === 0) {
          this.showToast('找不到所選個案資料', 'info');
          return;
        }

        this.showToast('正在產生 Word 檔案...', 'info');
        const zip = new JSZip();
        const Packer = window.docx.Packer;

        const recordMap = {};
        records.forEach(r => {
          const cid = String(r['個案編號']);
          if (!recordMap[cid]) recordMap[cid] = [];
          recordMap[cid].push({
            dateTime: r['日期時間'], target: r['對象'], method: r['方式'],
            recorderName: r['記錄者姓名'] || r['記錄者帳號'],
            content: r['輔導服務紀錄']
          });
        });

        for (const c of selectedCases) {
          const mappedCase = {
            id: String(c['個案編號'] || ''),
            name: String(c['姓名'] || ''),
            grade: String(c['年級'] || ''),
            class: String(c['班級'] || ''),
            seatNo: String(c['座號'] || ''),
            gender: String(c['性別'] || ''),
            caseType: String(c['個案類型'] || '-'),
            situation: String(c['專輔個案摘要'] || ''),
            teacherReport: String(c['導師提報內容'] || ''),
            serviceMethod: String(c['個案服務方式'] || ''),
            identity: String(c['身分背景'] || ''),
            specialEdu: String(c['特教身分'] || ''),
            counselor: String(c['專輔'] || ''),
            mentorTeacher: String(c['認輔教師'] || ''),
            specialEduTeacher: String(c['特教個管老師'] || ''),
            caseSource: String(c['個案來源'] || ''),
            reportDate: String(c['提報學期'] || ''),
            s_7a: c['七上綜述'], s_7b: c['七下綜述'], s_8a: c['八上綜述'], s_8b: c['八下綜述'], s_9a: c['九上綜述'], s_9b: c['九下綜述']
          };
          const rawRecords = recordMap[String(c['個案編號'])] || [];
          rawRecords.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

          const doc = this.generateWordDocDef(mappedCase, rawRecords);
          const blob = await Packer.toBlob(doc);
          zip.file(`${mappedCase.id}${mappedCase.name}個案紀錄.docx`, blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `CCMS_勾選個案匯出_${this.formatDate(new Date())}.zip`);
        this.showToast('打包下載完成！', 'success');

      } catch (e) {
        console.error(e);
        this.showToast('匯出失敗：' + e.message, 'error');
      } finally {
        this.loading = false;
      }
    },

    async exportBatchExcel() {
      if (!window.ExcelJS || !window.saveAs) {
        this.showToast('需要載入 ExcelJS', 'error');
        return;
      }
      this.loading = true;
      try {
        const res = await this.api('backupData', { grade: this.backupGrade });
        if (!res || !res.success) throw new Error(res?.error || '無法取得備份資料');

        const { cases, records } = res.data;
        if (cases.length === 0) {
          this.showToast('無資料可匯出', 'info');
          return;
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'CCMS';

        const createSheet = (name, rows) => {
          const sheet = workbook.addWorksheet(name);
          if (rows.length > 0) {
            const headers = Object.keys(rows[0]).filter(k => k !== '_rowIndex');
            sheet.addRow(headers).font = { bold: true };
            rows.forEach(r => {
              const rowData = [];
              headers.forEach(h => rowData.push(r[h]));
              sheet.addRow(rowData);
            });
          }
        };

        createSheet('個案總表', cases);
        createSheet('服務紀錄總表', records);

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `CCMS_原始資料備份_${this.backupGrade}年級_${this.formatDate(new Date())}.xlsx`);
        this.showToast('Excel 資料匯出成功', 'success');
      } catch (e) {
        console.error(e);
        this.showToast('Excel 匯出失敗：' + e.message, 'error');
      } finally {
        this.loading = false;
      }
    },

    async archiveGraduates() {
      this.confirmAction('確定要將九年級資料移轉至畢業封存並刪除目前紀錄嗎？建議執行前先進行備份！', async () => {
        this.loading = true;
        const r = await this.api('archiveGraduates');
        this.loading = false;
        if (r?.success) {
          this.showToast(r.message, 'success');
          await this.fetchData();
        } else {
          this.showToast(r?.error || '歸檔失敗', 'error');
        }
      });
    },

    async promoteGrades() {
      this.confirmAction('即將執行全校升級 (七升八、八升九、刪除九年級)。此操作強烈建議於新學年暑假執行。確認升級？', async () => {
        this.loading = true;
        const r = await this.api('promoteGrades');
        this.loading = false;
        if (r?.success) {
          this.showToast(r.message, 'success');
          await this.fetchData();
        } else {
          this.showToast(r?.error || '升級失敗', 'error');
        }
      });
    }
  },

  mounted() {
    this.initGasUrl();

    // 🚀 載入持久化隨手記
    this.todoNote = localStorage.getItem('cms_todo_note') || '';

    // 🚀 載入持久化草稿
    const savedDrafts = localStorage.getItem('cms_record_drafts');
    if (savedDrafts) {
      try { this.recordDrafts = JSON.parse(savedDrafts); } catch (e) { }
    }

    const saved = localStorage.getItem('cms_user');
    if (saved) {
      try {
        this.user = JSON.parse(saved);

        // 🎯 效能優化：先載入快取讓畫面立即顯示
        this.loadCache();
        // 🎯 狀態持久化修復：偵測到目前頁面為 detail 且有個案 ID 時，主動載入完整資料與紀錄
        const savedPage = localStorage.getItem('cms_page');
        const savedCaseId = localStorage.getItem('cms_case_id');

        if (savedPage) this.page = savedPage;

        if (this.page === 'detail' && savedCaseId) {
          // 透過 viewCaseById 觸發 API 請求，獲取最新詳情與紀錄
          this.viewCaseById(savedCaseId);
        }

        // 背景靜默刷新個案列表（不顯示 loading）
        this.fetchData(true);

        if (this.isAdmin) this.loadUsers();
        // 初始化主題類別
        document.body.className = this.theme === 'light' ? 'light-theme' : '';

        // 🛡️ 導航守衛：防止在批量生成時意外重新整理網頁
        window.addEventListener('beforeunload', (e) => {
          if (this.batchProgress && this.batchProgress.running) {
            e.preventDefault();
            e.returnValue = '批量生成任務正在進行中，確定要中斷並離開嗎？';
            return e.returnValue;
          }
        });
      } catch (e) {
        console.error('Mount error:', e);
        localStorage.removeItem('cms_user');
      }
    } else {
      // 未登入也要初始化主題類別（訪客頁面/登入頁面）
      document.body.className = this.theme === 'light' ? 'light-theme' : '';
    }
  }
}).mount('#app');



