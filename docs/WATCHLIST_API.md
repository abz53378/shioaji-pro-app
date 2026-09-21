# 自選清單 API（Agent 指南）

此文件描述 Shioaji Pro 目前實際使用的本機 Shioaji server API。用途是讓 Agent 或排程程式管理使用者的自選清單；它不是券商雲端 API，也不負責登入。

## 連線前提

- Shioaji Pro Desktop sidecar 預設位址：`http://127.0.0.1:21322`。
- Server 必須已啟動並以目標使用者登入。排程不應自行管理登入憑證。
- 對本機 HTTPS server，將 base URL 改為 `https://127.0.0.1:<port>`；憑證驗證應維持開啟。
- 所有 mutation 使用 JSON，header 為 `Content-Type: application/json`。
- 先呼叫 `GET /api/v1/health` 確認 server 可用；非 2xx 回應格式通常是 `{ "code": ..., "message": ..., "details": ... }`。
- 自選清單的順序由 `contracts` 陣列順序決定。完整更新時務必傳入預期的完整清單。

## 商品 contract

不要自行猜測 `exchange`。先以商品查詢端點取得 contract，再將回傳的識別欄位傳入自選 API：

```http
GET /api/v1/data/contracts/2330?security_type=STK&region=TW
```

自選 API 使用的 contract key：

```json
{
  "security_type": "STK",
  "region": "TW",
  "exchange": "TSE",
  "code": "2330",
  "target_code": null
}
```

可用 `security_type`：`IND`、`STK`、`FUT`、`OPT`、`WRT`。組合商品不支援加入自選清單。

## 自選清單端點

### 讀取全部清單

```http
GET /api/v1/watchlist
```

成功回傳：

```json
[
  {
    "id": "server-generated-id",
    "name": "每日觀察",
    "contracts": [
      { "security_type": "STK", "exchange": "TSE", "code": "2330" }
    ]
  }
]
```

清單名稱不是唯一鍵。以名稱查找時若有多個同名清單，Agent 必須拒絕 mutation 並要求人工處理。

### 建立清單

```http
POST /api/v1/watchlist
Content-Type: application/json

{
  "name": "每日觀察",
  "contracts": [
    {
      "security_type": "STK",
      "region": "TW",
      "exchange": "TSE",
      "code": "2330",
      "target_code": null
    }
  ]
}
```

回傳新建的清單物件及其 `id`。

### 完整同步／取代清單

```http
PUT /api/v1/watchlist/{id}
Content-Type: application/json

{
  "contracts": [
    {
      "security_type": "STK",
      "region": "TW",
      "exchange": "TSE",
      "code": "2330",
      "target_code": null
    }
  ]
}
```

這是每日選股同步的建議操作：同一份輸入重跑結果相同，不會累積舊商品。此操作會移除 payload 未列出的既有商品，執行前必須確認輸入是完整目標集合。

### 追加商品

```http
POST /api/v1/watchlist/{id}/contracts
Content-Type: application/json

{
  "contracts": [
    {
      "security_type": "STK",
      "region": "TW",
      "exchange": "TSE",
      "code": "2330",
      "target_code": null
    }
  ]
}
```

只新增，不移除既有商品。適合人工清單要保留、排程只補充訊號商品的情境。

### 移除指定商品

```http
DELETE /api/v1/watchlist/{id}/contracts
Content-Type: application/json

{
  "contracts": [
    {
      "security_type": "STK",
      "region": "TW",
      "exchange": "TSE",
      "code": "2330",
      "target_code": null
    }
  ]
}
```

只移除 payload 指定的商品。刪除前先讀取並核對清單 `id` 與內容。

### 刪除清單

```http
DELETE /api/v1/watchlist/{id}
```

不可逆。一般每日排程不應使用；只有明確要求刪除該 `id` 時才能呼叫。

## 改名限制

Server 沒有改名 endpoint，且 `PUT /api/v1/watchlist/{id}` 只同步 `contracts`、不會更新 `name`。改名必須依序：建立同 contracts 的新清單、確認成功、刪除舊清單。這是非原子操作，失敗時保留兩份清單比遺失原清單安全。

## Agent 操作規則

1. 任何 mutation 前先做 health check，並讀取清單找出精確 `id`。
2. 名稱找到零份時，只有 create-or-replace 類操作可以建立新清單；找到多份時停止。
3. `replace` 是破壞性同步：不得以「此次掃描失敗或空結果」覆寫既有清單。空清單必須是明確指定的目標狀態。
4. 每一個股票先解析 contract；無法解析的代碼要報告並停止 replace，避免部分結果意外覆寫完整清單。
5. 對排程保留 execution log：時間、清單 id、模式、輸入代碼、成功後的 contracts 數量與 API 錯誤。

## 可執行範例

`examples/watchlist_api.py` 預設連線 Shioaji Pro Desktop sidecar 的 `http://127.0.0.1:21322`，示範 health、list、create-or-replace、append 與 remove。它只使用 Python 標準函式庫。

```bash
python3 examples/watchlist_api.py list
python3 examples/watchlist_api.py replace --name 每日觀察 --contracts STK:2330,STK:2317,STK:2454
python3 examples/watchlist_api.py append --name 每日觀察 --contracts STK:2308
python3 examples/watchlist_api.py remove --name 每日觀察 --contracts STK:2308
```

透過 `SHIOAJI_SERVER` 改用其他 server；例如 HTTPS server：

```bash
SHIOAJI_SERVER=https://127.0.0.1:21322 python3 examples/watchlist_api.py list
```
