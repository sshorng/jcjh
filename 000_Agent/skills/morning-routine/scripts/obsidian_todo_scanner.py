import os
import re

def safe_print(text):
    # 將所有要印出的文字以 cp950 編碼嘗試轉換，遇無法解碼字元則用 '?' 替換，防範 Windows 終端 UnicodeEncodeError
    print(text.encode('cp950', errors='replace').decode('cp950'))

def scan_obsidian_tasks():
    # 使用者真實的 Obsidian Vault 根目錄
    base_dir = r"G:\我的雲端硬碟\Obsidian\sshorng"
    
    # 預先處理好路徑中的反斜線，避免在 f-string 中使用反斜線導致舊版 Python 報錯
    base_dir_clean = base_dir.replace('\\', '/')
    
    # 若該目錄不存在，提供友善提示
    if not os.path.exists(base_dir):
        safe_print(f"[錯誤] 找不到您的 Obsidian 資料庫，請確認路徑是否正確: {base_dir}")
        return

    todo_pattern = re.compile(r"^\s*-\s*\[\s*\]\s*(.+)$")
    tasks_found = {}

    # 遍歷整個 Obsidian Vault
    for root, _, files in os.walk(base_dir):
        # 排除 Obsidian 設定資料夾與常見的封存、垃圾桶、範本資料夾，避免干擾
        root_lower = root.lower()
        if ".obsidian" in root_lower or ".git" in root_lower or "archive" in root_lower or "templates" in root_lower or ".trash" in root_lower:
            continue
            
        for file in files:
            if file.endswith(".md"):
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, base_dir)
                
                try:
                    # 使用 utf-8 讀取檔案
                    with open(file_path, "r", encoding="utf-8") as f:
                        for line in f:
                            match = todo_pattern.match(line)
                            if match:
                                task_content = match.group(1).strip()
                                # 排除空任務或只包含符號的任務
                                if task_content and not task_content.startswith(("`[ ]`", "`[/]`", "`[x]`")):
                                    if rel_path not in tasks_found:
                                        tasks_found[rel_path] = []
                                    tasks_found[rel_path].append(task_content)
                except Exception as e:
                    # 略過讀取錯誤的檔案
                    continue

    if not tasks_found:
        safe_print(f"未在 Obsidian 資料庫 ({base_dir}) 中找到任何未完成的待辦任務！")
        return

    safe_print("\n=== Obsidian 未完成待辦任務 ===")
    for file_path, tasks in tasks_found.items():
        # 轉換為 Windows 正斜線以符合連結規範
        clean_path = file_path.replace("\\", "/")
        safe_print(f"\n來源檔案: [{clean_path}](file:///{base_dir_clean}/{clean_path})")
        for task in tasks:
            safe_print(f"  - [ ] {task}")

if __name__ == "__main__":
    scan_obsidian_tasks()
