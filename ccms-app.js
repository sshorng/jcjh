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
const TARGET_OPTS = ['學生', '教職員', '家長', '專業人員'];
const STATUS_OPTS = ['進行中', '已結案', '觀察中'];
const SOURCE_OPTS = ['學生主動前來', '導師轉介', '輔導教師發現', '行政轉介', '家長轉介', '轉銜', '其他'];

const SPECIAL_ED_OPTS = [
  '0.以下皆非', '1.智能障礙', '2.視覺障礙', '3.聽覺障礙', '4.語言障礙', '5.肢體障礙',
  '6.腦性麻痺', '7.身體病弱', '8.情緒行為障礙', '9.學習障礙', '10.多重障礙',
  '11.自閉症', '12.發展遲緩', '13.其他障礙'
];
const IDENTITY_OPTS = ['1.新住民子女', '2.低收入戶', '3.中低收入戶', '4.身心障礙', '5.原住民', '6.單親家庭', '7.隔代教養', '8.外配子女', '9.兒少保護', '10.其他'];
const SERVICE_OPTS = [
  '1.團體輔導', '2.入班輔導', '3.家長諮詢', '4.教師諮詢', '5.個案會議',
  '6.心理測驗', '7.安心服務', '8.家庭處遇', '9.資源連結', '10.系統會談',
  '11.學生諮詢', '12.臨案協處', '13.方案計畫', '14.各項宣講', '15.危機處理',
  '16.轉銜輔導', '17.其他'
];

createApp({
  data() {
    return {
      // 系統狀態
      gasUrl: '', loading: false, sidebarOpen: false,
      page: 'dashboard',
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
      searchQuery: '', userSearchQuery: '',
      filterGrade: '', filterStatus: '', filterCounselor: '',
      // Modal 控制
      showCaseModal: false, showRecordModal: false, showUserModal: false,
      showSettings: false, showHelp: false, showConfigModal: false, showChangePwd: false,
      pwdForm: { oldPwd: '', newPwd: '', confirmPwd: '' },
      exportModal: { show: false, yearMonth: '' },
      backupGrade: '全部',
      selectedCaseIds: [], // 用於批次操作勾選
      // 配置管理
      configType: 'classes', configItems: [],
      // 分頁與效能優化
      recordPage: 1, recordPageSize: 15,
      casesPage: 1, casesPageSize: 50, casesTotal: 0,
      hasMoreCases: true, casesLoading: false,
      dashLoading: false,
      // 表單
      caseForm: this.emptyCaseForm(),
      recordForm: this.emptyRecordForm(),
      userForm: { account: '', password: '', name: '', role: '專輔教師' },
      editingId: null, editingRecordId: null, editingUserId: null,
      // 選項
      CASE_TYPES, SOURCE_OPTS, METHOD_OPTS, TARGET_OPTS, STATUS_OPTS, SPECIAL_ED_OPTS, IDENTITY_OPTS, SERVICE_OPTS
    };
  },

  computed: {
    isAdmin() { return this.user && this.user.role === '管理員'; },
    filteredCases() {
      // 🎯 效能優化：主要過濾與排序由後端 API (getCases) 處理。
      // 這裡僅提供極速的「局部」本地搜尋，直到伺服器結果返回。
      if (!this.searchQuery) return this.cases;
      const q = this.searchQuery.toLowerCase();
      return this.cases.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.id || '').toLowerCase().includes(q)
      );
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
        const diff = tB - tA;
        if (diff !== 0) return diff;

        const cA = parseDate(a.createdAt);
        const cB = parseDate(b.createdAt);
        return cB - cA;
      });
    },
    totalRecordPages() {
      return Math.ceil(this.records.length / this.recordPageSize) || 1;
    },
    paginatedRecords() {
      const start = (this.recordPage - 1) * this.recordPageSize;
      return this.sortedRecords.slice(start, start + this.recordPageSize);
    }
  },
  watch: {
    // 當晤談紀錄內容變動時，自動儲存至草稿
    recordForm: {
      deep: true,
      handler(val) {
        if (!this.editingRecordId && this.showRecordModal) {
          localStorage.setItem('cms_record_draft', JSON.stringify(val));
        }
      }
    },
    // 🎯 狀態持久化：紀錄當前頁面與個案 ID，避免刷新跳回首頁
    page(val) { localStorage.setItem('cms_page', val); },
    currentCase(val) { 
      if (val) localStorage.setItem('cms_case_id', val.id);
      else localStorage.removeItem('cms_case_id');
    },
    // 過濾器變動時自動重載首頁個案
    filterGrade() { this.loadCases(1); },
    filterStatus() { this.loadCases(1); },
    filterCounselor() { this.loadCases(1); },
    searchQuery() {
       // 實作簡單的防抖 (Debounce)
       clearTimeout(this._searchTimer);
       this._searchTimer = setTimeout(() => {
          this.loadCases(1);
       }, 500);
    }
  },

  methods: {
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
        serviceMethod: '', caseSource: '', caseType: '', identity: '',
        caseTypeArr: [], identityArr: [],
        s_7a: '', s_7b: '', s_8a: '', s_8b: '', s_9a: '', s_9b: ''
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
        content: '',
        excludeFromReport: false
      };
    },

    // ===== API 呼叫 =====
    async api(action, data = {}) {
      if (!this.gasUrl) {
        this.showToast('請先設定 GAS API 網址', 'error');
        this.showSettings = true;
        return null;
      }
      const payload = {
        action,
        account: this.user?.account,
        role: this.user?.role,
        ...data
      };
      try {
        // 使用 text/plain 避免 Preflight (CORS) 預檢請求
        const r = await fetch(this.gasUrl, {
          method: 'POST',
          mode: 'cors', // 顯式要求 cors 模式
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          redirect: 'follow'
        });

        if (!r.ok) {
          throw new Error(`HTTP 錯誤: ${r.status}`);
        }

        const text = await r.text();
        let result;
        try {
          result = JSON.parse(text);
        } catch (err) {
          console.error('Raw Response:', text);
          throw new Error('服務端回應格式非 JSON，可能是 GAS 腳本出現錯誤。');
        }

        if (!result.success && result.error) {
          this.showToast(result.error, 'error');
        }
        return result;
      } catch (e) {
        console.error('API Error:', e);
        this.showToast('連線失敗：請檢查 GAS 網址是否正確，並確保部署權限為「任何人」。', 'error');
        return null;
      }
    },

    // ===== 登入/登出 =====
    async login() {
      if (!this.loginForm.account || !this.loginForm.password) {
        this.showToast('請輸入帳號和密碼', 'error'); return;
      }
      this.loading = true;
      const r = await this.api('login', this.loginForm);
      this.loading = false;
      if (r?.success) {
        this.user = r.user;
        localStorage.setItem('cms_user', JSON.stringify(r.user));
        this.showToast(`歡迎回來，${r.user.name}`, 'success');

        // 登入後先嘗試載入快取，提升感知速度
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
          // 若快取中有個案清單（舊版或完整回傳時），優先顯示
          if (data.cases) {
             this.cases = data.cases;
             this.casesTotal = data.totalCases || data.cases.length;
          }
          if (data.configs) this.configs = data.configs;
        } catch (e) { }
      }
    },
    logout() {
      this.user = null; this.page = 'dashboard';
      localStorage.removeItem('cms_user');
      this.cases = []; this.records = []; this.users = []; this.dashData = null;
    },

    // ===== 整合資料讀取 (SWR 優化版) =====
    async fetchData(silent = false) {
      if (!this.user) return;
      
      // 1. 優先嘗試讀取快取 (Stale-While-Revalidate)
      if (!this.dashData) this.loadCache();

      // 2. 背景同步儀表板數據 (統計數、配置、最近紀錄)
      this.dashLoading = true;
      try {
        const r = await this.api('getDashboard', { includeCases: false });
        if (r?.success && r.data) {
          this.dashData = r.data;
          if (r.data.configs) {
            this.configs = {
              classes: r.data.configs.classes || [],
              specialStaff: r.data.configs.specialStaff || [],
              allCounselors: r.data.configs.allCounselors || []
            };
          }
          this.casesTotal = r.data.totalCases || 0;
          localStorage.setItem('cms_dash_cache', JSON.stringify(r.data));
        }
      } catch (e) {
        console.error('Dash fetch error:', e);
      } finally {
        this.dashLoading = false;
      }

      // 3. 載入首屏個案清單
      await this.loadCases(1, false, silent);
    },

    /**
     * 分頁載入個案清單
     * @param {number} page 頁碼
     * @param {boolean} append 是否為追加 (用於載入更多)
     * @param {boolean} silent 是否不顯示全螢幕 loading
     */
    async loadCases(page = 1, append = false, silent = false) {
      if (this.casesLoading) return;
      
      this.casesLoading = true;
      if (!silent && !append) this.loading = true;

      try {
        const r = await this.api('getCases', {
          page: page,
          pageSize: this.casesPageSize,
          search: this.searchQuery,
          filterGrade: this.filterGrade,
          filterStatus: this.filterStatus,
          filterCounselor: this.filterCounselor
        });

        if (r?.success && r.data) {
          const newCases = r.data.cases || [];
          if (append) {
            this.cases = [...this.cases, ...newCases];
          } else {
            this.cases = newCases;
          }
          this.casesPage = r.data.page;
          this.casesTotal = r.data.total;
          this.hasMoreCases = (this.cases.length < this.casesTotal);
        }
      } catch (e) {
        console.error('Load cases error:', e);
      } finally {
        this.casesLoading = false;
        if (!silent) this.loading = false;
      }
    },

    async loadMoreCases() {
      if (this.hasMoreCases && !this.casesLoading) {
        await this.loadCases(this.casesPage + 1, true, true);
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
      this.currentCase = c;
      this.page = 'detail';
      this.recordPage = 1;
      this.showRecordModal = false;

      // 優先載入快取中的紀錄 (如果有的話)
      const cacheKey = `cms_records_${c.id}`;
      const cachedRecords = localStorage.getItem(cacheKey);
      if (cachedRecords) {
        this.records = JSON.parse(cachedRecords);
      } else {
        this.records = [];
      }

      this.loading = true;
      const tasks = [this.api('getRecords', { caseId: c.id })];

      // 💡 效能優化：若尚未載入重型內容(綜述、內容)，則在此時補抓 (並行執行)
      const needsDetail = !c.s_7a && !c.situation;
      if (needsDetail) {
        tasks.push(this.api('getCaseDetail', { id: c.id }));
      }

      const results = await Promise.all(tasks);
      this.loading = false;

      const rRec = results[0];
      if (rRec?.success) {
        this.records = rRec.data;
        localStorage.setItem(cacheKey, JSON.stringify(rRec.data));
      }

      if (needsDetail) {
        const rDet = results[1];
        if (rDet?.success) {
          Object.assign(c, rDet.data);
        }
      }
    },
    openCaseModal(c) {
      if (c) {
        this.editingId = c.id;
        // 確保以目前系統有的選項為準，避免新舊格式疊加
        const rawTypes = (c.caseType || '').split(',').map(s => s.trim()).filter(Boolean);
        const rawService = (c.serviceMethod || '').split(',').map(s => s.trim()).filter(Boolean);
        const rawIdentity = (c.identity || '').split(',').map(s => s.trim()).filter(Boolean);

        this.caseForm = {
          ...this.emptyCaseForm(),
          ...c,
          id: c.id,
          // 只保留目前系統選單中存在的項，落實重整更新
          caseTypeArr: rawTypes.filter(t => this.CASE_TYPES.includes(t)),
          identityArr: rawIdentity.filter(id => this.IDENTITY_OPTS.includes(id)),
          counselor: c.counselor || ''
        };
      } else {
        this.editingId = null;
        this.caseForm = this.emptyCaseForm();
      }
      this.showCaseModal = true;
    },
    autoFillStaff() {
      if (!this.caseForm.grade || !this.caseForm.class) return;

      // 1. 自動產生 7 碼個案編號 (入學年+班級+座號)
      // 計算入學年：當前民國年 (如果是 8 月前算去年學期，如果是 8 月後算今年學期)
      const now = new Date();
      let sy = now.getFullYear() - 1911;
      if (now.getMonth() + 1 < 8) sy -= 1; // 尚未開學，算前一年的學期

      const gradeMap = { '七': 0, '八': 1, '九': 2 };
      const entryYear = sy - (gradeMap[this.caseForm.grade] || 0);

      const c = String(this.caseForm.class || '').padStart(2, '0');
      const s = String(this.caseForm.seatNo || '').padStart(2, '0');

      // 只有在還沒填 ID 或正在新增時才自動覆蓋，避免誤改
      if (!this.editingId) {
        this.caseForm.id = `${entryYear}${c}${s}`;
      }

      // 自動帶入當前學期 (如果還沒填)
      if (!this.caseForm.reportDate) {
        const month = now.getMonth() + 1;
        this.caseForm.reportDate = (month >= 8) ? `${sy}-1` : (month >= 2 ? `${sy - 1}-2` : `${sy - 1}-1`);
      }

      // 2. 代入相關人員
      const cfg = this.configs.classes.find(it => it['年級'] === this.caseForm.grade && String(it['班級']) === String(this.caseForm.class));
      if (cfg) {
        this.caseForm.homeroom = cfg['導師'] || '';
        this.caseForm.classGuidance = cfg['班輔'] || '';
        this.caseForm.counselor = cfg['專輔'] || '';
        this.showToast(`已自動代入人員與產生編號 ${this.caseForm.id}`, 'info');
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
    async saveCaseForm() {
      if (!this.caseForm.id || !this.caseForm.name) {
        this.showToast('請填寫個案編號與姓名', 'error'); return;
      }

      // 檢查 ID 是否重複（新增時）
      if (!this.editingId && this.cases.find(c => c.id === this.caseForm.id)) {
        this.showToast('個案編號已存在，請使用其他編號', 'error'); return;
      }

      const data = {
        ...this.caseForm,
        '導師提報內容': this.caseForm.teacherReport,
        caseType: this.caseForm.caseTypeArr.join(','),
        identity: this.caseForm.identityArr.join(','),
        serviceMethod: this.caseForm.serviceMethod // 已經變為字串手動輸入
      };
      this.loading = true;
      let r;
      if (this.editingId) {
        r = await this.api('updateCase', { ...data, id: this.editingId });
      } else {
        r = await this.api('addCase', data);
      }
      this.loading = false;
      if (r?.success) {
        this.showToast(r.message, 'success');
        this.showCaseModal = false;
        await this.fetchData();
        // 如果正在詳情頁，同步更新詳情個案資訊
        if (this.page === 'detail' && this.currentCase) {
          const updated = this.cases.find(c => c.id === this.currentCase.id);
          if (updated) this.currentCase = updated;
        }
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
      const docxLib = window.docx || docx;
      if (!docxLib) {
        this.showToast("Word 匯出元件尚未載入完成，請稍候或重新整理頁面", "error");
        return;
      }
      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, VerticalAlign, BorderStyle } = docxLib;
      const c = this.currentCase;
      const recs = [...this.records].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

      // 共用樣式設定
      const KAI_FONT = "標楷體";
      const TEXT_SIZE = 24; // 12pt

      const createCell = (text, widthPercent, isLabel = false) => {
        return new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: text || "", font: KAI_FONT, size: TEXT_SIZE, bold: isLabel })],
            alignment: isLabel ? AlignmentType.CENTER : AlignmentType.LEFT,
          })],
          width: { size: widthPercent, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          shading: isLabel ? { fill: "F5F5F5" } : undefined,
        });
      };

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({ text: "學生輔導紀錄表", font: KAI_FONT, size: 40, bold: true })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),

            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    createCell("姓名", 15, true),
                    createCell(c.name, 35),
                    createCell("性別", 15, true),
                    createCell(c.gender, 35),
                  ],
                }),
                new TableRow({
                  children: [
                    createCell("年/班/座號", 15, true),
                    createCell(`${c.grade}年 ${c.class}班 ${c.seatNo}號`, 35),
                    createCell("個案編號", 15, true),
                    createCell(c.id, 35),
                  ],
                }),
                new TableRow({
                  children: [
                    createCell("個案類別", 15, true),
                    createCell(c.caseType, 85),
                  ],
                }),
                new TableRow({
                  children: [
                    createCell("專輔個案摘要", 15, true),
                    createCell(c.situation, 85),
                  ],
                }),
                new TableRow({
                  children: [
                    createCell("導師提報內容", 15, true),
                    createCell(c.teacherReport, 85),
                  ],
                }),
                new TableRow({
                  children: [
                    createCell("服務方式", 15, true),
                    createCell(c.serviceMethod, 85),
                  ],
                }),
                new TableRow({
                  children: [
                    createCell("特教/身份", 15, true),
                    createCell(`${c.specialEdu} / ${c.identity || '無'}`, 85),
                  ],
                }),
              ],
            }),

            new Paragraph({
              children: [new TextRun({ text: "【 晤談紀錄回顧 】", font: KAI_FONT, size: 32, bold: true })],
              spacing: { before: 500, after: 200 },
            }),

            ...recs.flatMap((r, idx) => [
              new Paragraph({
                children: [
                  new TextRun({ text: `紀錄 ${idx + 1} | 日期：${this.formatDate(r.dateTime)}`, font: KAI_FONT, size: TEXT_SIZE, bold: true }),
                  new TextRun({ text: `  (對象：${r.target} / 方式：${r.method} / 記錄者：${r.recorderName})`, font: KAI_FONT, size: 20, color: "666666" })
                ],
                spacing: { before: 300, after: 100 }
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({
                          children: [new TextRun({ text: r.content, font: KAI_FONT, size: TEXT_SIZE })],
                          spacing: { before: 100, after: 100 }
                        })],
                        margins: { top: 100, bottom: 100, left: 100, right: 100 }
                      })
                    ]
                  })
                ]
              })
            ])
          ]
        }]
      });

      const buffer = await docxLib.Packer.toBlob(doc);
      saveAs(buffer, `${c.name}_輔導紀錄.docx`);
      this.showToast('Word 檔案匯出成功', 'success');
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

      const tCode = parseInt(teacherCode) || 1;
      // 過濾掉註記為不計入月報表的紀錄
      records = records.filter(r => !(r.service || '').includes('純紀錄_不計入月報表'));

      const workbook = new ExcelJS.Workbook();
      workbook.creator = '個案管理系統';
      workbook.created = new Date();

      const caseMap = {};
      cases.forEach(c => { caseMap[String(c.id)] = c; });

      const gradeMap = {
        '一年級': 2, '二年級': 3, '三年級': 4, '四年級': 5, '五年級': 6, '六年級': 7,
        '七年級': 8, '八年級': 9, '九年級': 10, '七': 8, '八': 9, '九': 10
      };
      const getNum = (s) => s ? parseInt((String(s).match(/^(\d+)/) || ['0'])[0]) : 0;

      // ─── 共用樣式 ───
      const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      const headerFont = { name: '標楷體', size: 11, bold: true };
      const dataFont = { name: '標楷體', size: 11 };
      const thinBorder = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };

      // ══════════════════════════════════════════
      //  表 A-1：輔導教師 — 當月個案
      // ══════════════════════════════════════════
      const sheetA1 = workbook.addWorksheet('表A-1-輔導教師-當月個案');

      // 標題列
      sheetA1.mergeCells('A1:O1');
      const titleCellA1 = sheetA1.getCell('A1');
      titleCellA1.value = `${sysYear}年${month}月 輔導教師工作成果 — 表A-1 當月個案`;
      titleCellA1.font = { name: '標楷體', size: 14, bold: true };
      titleCellA1.alignment = { horizontal: 'center', vertical: 'middle' };
      sheetA1.getRow(1).height = 30;

      // 說明列
      sheetA1.mergeCells('A2:O2');
      const noteCellA1 = sheetA1.getCell('A2');
      noteCellA1.value = '填表說明：每一列代表一位當月有服務紀錄的個案';
      noteCellA1.font = { name: '標楷體', size: 9, color: { argb: 'FF888888' } };

      // 欄位標題 (第3列)
      const headersA1 = [
        '教師\n編碼', '身分', '學生\n代號', '年級', '性別',
        '性別\n說明', '特教\n身分', '輔導\n概況', '個案\n來源',
        '轉介\n概況', '個案類別\n(主)', '主類別\n補充', '個案類別\n(副)',
        '副類別\n補充', '當月\n累積次數'
      ];
      const headerRowA1 = sheetA1.getRow(3);
      headersA1.forEach((h, i) => {
        const cell = headerRowA1.getCell(i + 1);
        cell.value = h;
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.border = thinBorder;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });
      headerRowA1.height = 36;

      // 設定欄寬
      sheetA1.columns = [
        { width: 8 }, { width: 6 }, { width: 12 }, { width: 6 }, { width: 8 },
        { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 },
        { width: 8 }, { width: 10 }, { width: 8 }, { width: 10 },
        { width: 8 }, { width: 10 }
      ];

      // 寫入資料 (從第4列開始)
      let rowA1Idx = 4;
      let writtenA1 = 0;

      // 🎯 效能優化：預先對紀錄進行分類 (Map)，避免在迴圈中重複 filter (O(n*m) -> O(n+m))
      const recordMap = new Map();
      records.forEach(r => {
        const cid = String(r.caseId);
        if (!recordMap.has(cid)) recordMap.set(cid, []);
        recordMap.get(cid).push(r);
      });

      cases.forEach(c => {
        const myRecords = recordMap.get(String(c.id)) || [];
        const count = myRecords.length;
        console.log(`[表A-1] 個案 ${c.id} (${c.name}): 找到 ${count} 筆紀錄`);
        if (count === 0) return;

        const isNew = c.isNew || 1;

        let genderText = '其他';
        if (c.gender === '男') genderText = '生理男';
        if (c.gender === '女') genderText = '生理女';

        const sourceMap = {
          '學生主動前來': 1, '家長轉介': 2, '導師轉介': 3, '行政轉介': 3,
          '輔導教師發現': 5, '轉銜': 7, '其他': 7
        };
        const sourceCode = (isNew === 1) ? (sourceMap[c.caseSource] || 0) : 0;

        const types = (c.caseType || '').split(',').map(s => s.trim());
        const mainTypeNum = getNum(types[0]) || 19;
        const subTypeNum = getNum(types[1]) || 0;

        // 學生代號格式化：1140133 → 114-0133
        const idStr = String(c.id);
        const formattedId = idStr.length >= 4 ? idStr.slice(0, 3) + '-' + idStr.slice(3) : idStr;

        const vals = [
          tCode, 1, formattedId,
          gradeMap[c.grade] || 8,
          genderText, '', getNum(c.specialEdu),
          isNew, sourceCode, 2,
          mainTypeNum, 0, subTypeNum, 0, count
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

      // ══════════════════════════════════════════
      //  表 A-2：輔導教師 — 相關服務
      // ══════════════════════════════════════════
      const sheetA2 = workbook.addWorksheet('表A-2-輔導教師-相關服務');

      // 標題列
      sheetA2.mergeCells('A1:H1');
      const titleCellA2 = sheetA2.getCell('A1');
      titleCellA2.value = `${sysYear}年${month}月 輔導教師工作成果 — 表A-2 相關服務`;
      titleCellA2.font = { name: '標楷體', size: 14, bold: true };
      titleCellA2.alignment = { horizontal: 'center', vertical: 'middle' };
      sheetA2.getRow(1).height = 30;

      // 說明列
      sheetA2.mergeCells('A2:H2');
      const noteCellA2 = sheetA2.getCell('A2');
      noteCellA2.value = '填表說明：依服務項目與對象統計人次';
      noteCellA2.font = { name: '標楷體', size: 9, color: { argb: 'FF888888' } };

      // 欄位標題 (第3列)
      const headersA2 = [
        '教師\n編碼', '身分', '服務\n項目', '其他\n說明',
        '對象\n代號', '人次\n(生理男)', '人次\n(生理女)', '人次\n(其他)'
      ];
      const headerRowA2 = sheetA2.getRow(3);
      headersA2.forEach((h, i) => {
        const cell = headerRowA2.getCell(i + 1);
        cell.value = h;
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.border = thinBorder;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });
      headerRowA2.height = 36;

      sheetA2.columns = [
        { width: 8 }, { width: 6 }, { width: 8 }, { width: 8 },
        { width: 8 }, { width: 12 }, { width: 12 }, { width: 12 }
      ];

      // 統計相關服務
      const getTargetCode = (targetStr, gradeStr) => {
        if (targetStr.includes('家長')) return 14;
        if (targetStr.includes('教職員') || targetStr.includes('教師') || targetStr.includes('導師') || targetStr.includes('行政')) return 15;
        if (targetStr.includes('專業人員') || targetStr.includes('社工') || targetStr.includes('專業')) return 16;
        if (targetStr.includes('個案') || targetStr.includes('學生')) {
          return gradeMap[gradeStr] || 8;
        }
        return 17;
      };

      const serviceStats = {};
      records.forEach(r => {
        const c = caseMap[String(r.caseId)] || {};
        const gender = c.gender || '男';
        const gradeStr = c.grade || '七';

        const services = (r.service || '').split(',').map(s => s.trim()).filter(Boolean);
        const targets = (r.target || '').split(',').map(s => s.trim()).filter(Boolean);
        if (services.length === 0) services.push('11.學生諮詢');
        if (targets.length === 0) targets.push('學生');

        services.forEach(s => {
          targets.forEach(t => {
            const sc = getNum(s) || 17;
            const tc = getTargetCode(t, gradeStr);
            const k = `${sc}|${tc}`;
            if (!serviceStats[k]) serviceStats[k] = { s: sc, t: tc, male: 0, female: 0, other: 0 };
            if (gender === '男') serviceStats[k].male++;
            else if (gender === '女') serviceStats[k].female++;
            else serviceStats[k].other++;
          });
        });
      });

      let rowA2Idx = 4;
      Object.values(serviceStats).forEach(stat => {
        const row = sheetA2.getRow(rowA2Idx++);
        const vals = [tCode, 1, stat.s, 0, stat.t, stat.male, stat.female, stat.other];
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
            baseTargetsArr = match[1].split(',').map(s => s.trim()).filter(Boolean);
            if (match[2]) customTxt = match[2];
        }

        const targetArr = [];
        const customTargets = customTxt ? [customTxt] : [];
        baseTargetsArr.forEach(t => {
          if (this.TARGET_OPTS.includes(t)) targetArr.push(t);
          else if (t !== '其他') { 
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

        const serviceArr = (rec.service || '').split(',').map(s => s.trim()).filter(Boolean);
        const excludeFromReport = serviceArr.includes('純紀錄_不計入月報表');
        const cleanServiceArr = serviceArr.filter(s => s !== '純紀錄_不計入月報表');

        this.recordForm = {
          date: rec.dateTime,
          targetArr: targetArr,
          customTarget: customTargets.join(', '),
          methodArr: methodArr,
          customMethod: customMethods.join(', '),
          serviceArr: cleanServiceArr,
          content: rec.content,
          excludeFromReport: excludeFromReport
        };
      } else {
        this.editingRecordId = null;
        const draft = localStorage.getItem('cms_record_draft');
        if (draft) {
          try {
            const parsed = JSON.parse(draft);
            if (!Array.isArray(parsed.serviceArr)) parsed.serviceArr = [];
            if (!Array.isArray(parsed.targetArr)) parsed.targetArr = [];
            if (!Array.isArray(parsed.methodArr)) parsed.methodArr = [];

            // 🎯 關鍵修正：草稿內容保留，但「日期」強制度調整為今日
            const todayForm = this.emptyRecordForm();
            parsed.date = todayForm.date;

            this.recordForm = parsed;
          } catch (e) { this.recordForm = this.emptyRecordForm(); }
        } else {
          this.recordForm = this.emptyRecordForm();
        }
      }
      this.showRecordModal = true;
    },
    async saveRecordForm() {
      if (!this.recordForm.content) { this.showToast('請填寫晤談紀錄', 'error'); return; }

      // 合併對象
      let targetStr = this.recordForm.targetArr.join(', ');
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

      if (!targetStr) {
        this.showToast('請務必選取或填寫對象', 'error'); return;
      }

      if (!this.recordForm.serviceArr.length) {
        this.showToast('請勾選服務項目', 'error'); return;
      }

      this.loading = true;
      const methodStr = combinedMethods.join(',');
      
      const servicesToSave = [...this.recordForm.serviceArr];
      if (this.recordForm.excludeFromReport) {
        servicesToSave.push('純紀錄_不計入月報表');
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
          recorderName: this.user.name // 確保更新時也帶上姓名以供後端記錄（若有需要）
        });
      } else {
        r = await this.api('addRecord', {
          caseId: this.currentCase.id,
          dateTime: this.recordForm.date,
          target: targetStr,
          method: methodStr,
          service: serviceStr,
          content: this.recordForm.content,
          recorderName: this.user.name // 顯式傳遞，對應後端載入與存檔
        });
      }
      this.loading = false;
      if (r?.success) {
        this.showToast(r.message, 'success');
        this.showRecordModal = false; // 這裡的 showRecordModal 控制內嵌表單的收合
        this.editingRecordId = null;
        if (!this.editingRecordId) {
          localStorage.removeItem('cms_record_draft');
        }
        await this.fetchData();
        const rr = await this.api('getRecords', { caseId: this.currentCase.id });
        if (rr?.success) {
          this.records = rr.data;
          this.recordPage = 1; // 回到第一頁看新紀錄
        }
      }
    },
    async deleteRecord(id) {
      this.confirmAction('確定要刪除此晤談紀錄？', async () => {
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
      this.searchQuery = '';
      this.filterGrade = '';
      this.filterStatus = '';
      this.filterCounselor = '';
      this.selectedCaseIds = [];
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

    async exportToWord() {
      if (!this.currentCase) return;
      this.loading = true;
      try {
        const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, VerticalAlign } = window.docx;
        const c = this.currentCase;

        // 字體大小設定 (半點，24 = 12pt)
        const FONT_SIZE = 24;
        const FONT_SIZE_TITLE = 36;
        const FONT_SIZE_LABEL = 24;
        const lightBorder = { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" };
        const modernBorders = { top: lightBorder, bottom: lightBorder, left: lightBorder, right: lightBorder };

        // 建立穩定的 2 欄式表格函式 (左標題 25%、右內容 75%)
        const create2ColRow = (label, value) => new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              shading: { fill: "F8FAFC" },
              verticalAlign: VerticalAlign.CENTER,
              borders: modernBorders,
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: FONT_SIZE_LABEL, color: "475569" })], alignment: AlignmentType.CENTER })],
            }),
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              borders: modernBorders,
              children: [new Paragraph({ children: [new TextRun({ text: String(value || '-'), size: FONT_SIZE, color: "1E293B" })], spacing: { before: 200, after: 200 }, indent: { left: 240, right: 240 } })],
            }),
          ],
        });

        // 1. 基本資料表格
        const infoRows = [
          create2ColRow("個案姓名", c.name),
          create2ColRow("學生性別", c.gender),
          create2ColRow("年/班/座號", `${c.grade}年 ${c.class}班 ${c.seatNo}號`),
          create2ColRow("個案編號", c.id),
          create2ColRow("個案類別", c.caseType),
          create2ColRow("專輔個案摘要", c.situation),
          create2ColRow("導師提報內容", (c.reportDate ? `(${c.reportDate}) ` : '') + (c.teacherReport || '-')),
          create2ColRow("主要服務方式", c.serviceMethod),
          create2ColRow("身份背景標籤", c.identity),
        ];

        // 2. 加入學期綜述
        const semesterKeys = [
          { k: 's_7a', l: '七年級上學期綜述' }, { k: 's_7b', l: '七年級下學期綜述' },
          { k: 's_8a', l: '八年級上學期綜述' }, { k: 's_8b', l: '八年級下學期綜述' },
          { k: 's_9a', l: '九年級上學期綜述' }, { k: 's_9b', l: '九年級下學期綜述' }
        ];
        semesterKeys.forEach(s => {
          if (c[s.k]) infoRows.push(create2ColRow(s.l, c[s.k]));
        });

        // 3. 建立服務紀錄表格
        const recordRows = [
          // 表格標題行 (再次拆分獨立欄位，記錄者移至最右)
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" }, borders: modernBorders, children: [new Paragraph({ children: [new TextRun({ text: "項次", bold: true, size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" }, borders: modernBorders, children: [new Paragraph({ children: [new TextRun({ text: "日期", bold: true, size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" }, borders: modernBorders, children: [new Paragraph({ children: [new TextRun({ text: "對象", bold: true, size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" }, borders: modernBorders, children: [new Paragraph({ children: [new TextRun({ text: "方式", bold: true, size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ width: { size: 62, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" }, borders: modernBorders, children: [new Paragraph({ children: [new TextRun({ text: "紀錄內容", bold: true, size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ width: { size: 7, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" }, borders: modernBorders, children: [new Paragraph({ children: [new TextRun({ text: "記錄者", bold: true, size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
            ]
          })
        ];

        this.records.forEach((r, idx) => {
          recordRows.push(new TableRow({
            children: [
              new TableCell({ borders: modernBorders, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: String(idx + 1), size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ borders: modernBorders, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: this.formatDate(r.dateTime), size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ borders: modernBorders, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: String(r.target || '-'), size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ borders: modernBorders, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: String(r.method || '-'), size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ borders: modernBorders, children: [new Paragraph({ children: [new TextRun({ text: r.content, size: FONT_SIZE })], spacing: { before: 160, after: 160 }, indent: { left: 160, right: 160 } })] }),
              new TableCell({ borders: modernBorders, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: String(r.recorderName || '-'), size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
            ]
          }));
        });

        const recordTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: recordRows
        });

        const doc = new Document({
          creator: "輔導個案管理系統",
          title: `個案紀錄-${c.name}`,
          styles: {
            default: {
              document: { run: { font: "微軟正黑體", size: FONT_SIZE, color: "1E293B" } },
            },
          },
          sections: [{
            properties: {
              page: {
                margin: { top: 720, bottom: 720, left: 720, right: 720 },
              },
            },
            children: [
              new Paragraph({
                children: [new TextRun({ text: "學生輔導紀錄總表", bold: true, size: FONT_SIZE_TITLE, color: "0F172A" })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 600 }
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: infoRows
              }),
              new Paragraph({
                children: [new TextRun({ text: "【 輔導歷程與服務紀錄回顧 】", bold: true, size: FONT_SIZE + 6, color: "1E293B" })],
                spacing: { before: 800, after: 300 }
              }),
              recordTable
            ],
          }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${c.id}${c.name}個案紀錄.docx`);
        this.showToast("標準 12pt 表格化 Word 文件已匯出", "success");
      } catch (e) {
        console.error("Word Export Error:", e);
        this.showToast("匯出 Word 失敗：" + e.message, "error");
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

    // ===== 系統備份與維護 =====
    generateWordDocDef(c, records) {
      const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, VerticalAlign, BorderStyle } = window.docx;
      
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
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: FONT_SIZE_LABEL, color: "475569" })], alignment: AlignmentType.CENTER })],
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER, borders: modernBorders,
            children: [new Paragraph({ children: [new TextRun({ text: String(value || '-'), size: FONT_SIZE, color: "1E293B" })], spacing: { before: 200, after: 200 }, indent: { left: 240, right: 240 } })],
          }),
        ],
      });

      const infoRows = [
        create2ColRow("個案姓名", c.name),
        create2ColRow("學生性別", c.gender),
        create2ColRow("年/班/座號", `${c.grade}年 ${c.class}班 ${c.seatNo}號`),
        create2ColRow("個案編號", c.id),
        create2ColRow("個案類別", c.caseType),
        create2ColRow("專輔個案摘要", c.situation),
        create2ColRow("導師提報內容", (c.reportDate ? `(${c.reportDate}) ` : '') + (c.teacherReport || '-')),
        create2ColRow("主要服務方式", c.serviceMethod),
        create2ColRow("身份背景標籤", c.identity),
      ];

      ['s_7a', 's_7b', 's_8a', 's_8b', 's_9a', 's_9b'].forEach(k => {
        const l = { 's_7a': '七年級上學期綜述', 's_7b': '七年級下學期綜述', 's_8a': '八年級上學期綜述', 's_8b': '八年級下學期綜述', 's_9a': '九年級上學期綜述', 's_9b': '九年級下學期綜述' }[k];
        if (c[k]) infoRows.push(create2ColRow(l, c[k]));
      });

      const recordRows = [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" }, borders: modernBorders, children: [new Paragraph({ children: [new TextRun({ text: "項次", bold: true, size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" }, borders: modernBorders, children: [new Paragraph({ children: [new TextRun({ text: "日期", bold: true, size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" }, borders: modernBorders, children: [new Paragraph({ children: [new TextRun({ text: "對象", bold: true, size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" }, borders: modernBorders, children: [new Paragraph({ children: [new TextRun({ text: "方式", bold: true, size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 62, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" }, borders: modernBorders, children: [new Paragraph({ children: [new TextRun({ text: "紀錄內容", bold: true, size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 7, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" }, borders: modernBorders, children: [new Paragraph({ children: [new TextRun({ text: "記錄者", bold: true, size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
          ]
        })
      ];

      records.forEach((r, idx) => {
        recordRows.push(new TableRow({
          children: [
            new TableCell({ borders: modernBorders, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: String(idx + 1), size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ borders: modernBorders, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: this.formatDate(r.dateTime), size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ borders: modernBorders, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: String(r.target || '-'), size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ borders: modernBorders, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: String(r.method || '-'), size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ borders: modernBorders, children: [new Paragraph({ children: [new TextRun({ text: r.content, size: FONT_SIZE })], spacing: { before: 160, after: 160 }, indent: { left: 160, right: 160 } })] }),
            new TableCell({ borders: modernBorders, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: String(r.recorderName || '-'), size: FONT_SIZE })], alignment: AlignmentType.CENTER })] }),
          ]
        }));
      });

      return new Document({
        creator: "輔導個案管理系統", title: `個案紀錄-${c.name}`,
        styles: { default: { document: { run: { font: "微軟正黑體", size: FONT_SIZE, color: "1E293B" } } } },
        sections: [{
          properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
          children: [
            new Paragraph({ children: [new TextRun({ text: "學生輔導紀錄總表", bold: true, size: FONT_SIZE_TITLE, color: "0F172A" })], alignment: AlignmentType.CENTER, spacing: { after: 600 } }),
            new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: infoRows }),
            new Paragraph({ children: [new TextRun({ text: "【 輔導歷程與服務紀錄回顧 】", bold: true, size: FONT_SIZE + 6, color: "1E293B" })], spacing: { before: 800, after: 300 } }),
            new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: recordRows })
          ],
        }],
      });
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
            id: c['個案編號'], name: c['姓名'], grade: c['年級'], class: c['班級'], seatNo: c['座號'], gender: c['性別'],
            caseType: c['個案類別(主)'] || c['個案類型'] || '-', situation: c['遭遇情況'], teacherReport: c['導師提報內容'],
            serviceMethod: c['個案服務方式'], identity: c['身分背景'], specialEdu: c['特教身分'], reportDate: c['提報學期'],
            s_7a: c['七上綜述'], s_7b: c['七下綜述'], s_8a: c['八上綜述'], s_8b: c['八下綜述'], s_9a: c['九上綜述'], s_9b: c['九下綜述']
          };
          const rawRecords = recordMap[String(c['個案編號'])] || [];
          rawRecords.sort((a,b) => new Date(a.dateTime) - new Date(b.dateTime));

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
            id: c['個案編號'], name: c['姓名'], grade: c['年級'], class: c['班級'], seatNo: c['座號'], gender: c['性別'],
            caseType: c['個案類別(主)'] || c['個案類型'] || '-', situation: c['遭遇情況'], teacherReport: c['導師提報內容'],
            serviceMethod: c['個案服務方式'], identity: c['身分背景'], specialEdu: c['特教身分'], reportDate: c['提報學期'],
            s_7a: c['七上綜述'], s_7b: c['七下綜述'], s_8a: c['八上綜述'], s_8b: c['八下綜述'], s_9a: c['九上綜述'], s_9b: c['九下綜述']
          };
          const rawRecords = recordMap[String(c['個案編號'])] || [];
          rawRecords.sort((a,b) => new Date(a.dateTime) - new Date(b.dateTime));

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
    const saved = localStorage.getItem('cms_user');
    if (saved) {
      try {
        this.user = JSON.parse(saved);
        // 先載入資料
        this.fetchData().then(() => {
          // 資料載入後再恢復頁面狀態
          const savedPage = localStorage.getItem('cms_page');
          const savedCaseId = localStorage.getItem('cms_case_id');
          if (savedPage) this.page = savedPage;
          if (savedPage === 'detail' && savedCaseId) this.viewCaseById(savedCaseId);
        });
        if (this.isAdmin) this.loadUsers();
      } catch (e) { localStorage.removeItem('cms_user'); }
    }
  }
}).mount('#app');
