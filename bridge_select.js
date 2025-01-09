/**
 * bridge_select.js
 * 
 * - クエリパラメータ `bridge=bridge1_20241103` の "bridge1_..." から
 *   アンダースコア(_)区切りで前の部分 ("bridge1") を取り出し、
 * - `/bridge_info.json` を fetch して「bridgeInfo.bridges[]」の中から
 *   `bridgeRomanName === (取り出した文字列)`のオブジェクトを検索し、
 * - そのオブジェクト内 "inspections" と "additional_data" を
 *   セレクトボックス `<select id="documentSelect">` に表示する。
 * - 選択後「GO →」ボタン押下で `data_link` を新ウィンドウで開く。
 */

document.addEventListener("DOMContentLoaded", () => {
    // 例: URLが http://localhost:8000/?bridge=bridge1_20241103
    // => bridgeParam = "bridge1_20241103"
    // => 先頭部は "bridgeParam.split('_')[0]" = "bridge1"
    const urlParams = new URLSearchParams(window.location.search);
    const bridgeParam = urlParams.get("bridge") || "bridge1_20241103";
    const bridgeShortName = bridgeParam.split("_")[0];
  
    // セレクトボックスと「GO→」ボタンのDOM要素
    const documentSelect = document.getElementById("documentSelect");
    const documentOpenButton = document.getElementById("documentOpenButton");
  
    // bridge_info.jsonを読み込む
    fetch("/bridge_info.json")
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to load bridge_info.json");
        }
        return response.json();
      })
      .then(jsonObj => {
        // jsonObjは `{ "bridges": [ ... ] }` の形を想定
        // まず "bridges" プロパティを確認する
        const bridgesArray = jsonObj.bridges;
        if (!bridgesArray || !Array.isArray(bridgesArray)) {
          console.error("jsonObj.bridges is not an array!");
          return;
        }
  
        // bridgeShortNameに合致するオブジェクトを検索
        const targetBridge = bridgesArray.find(
          (item) => item.bridgeRomanName === bridgeShortName
        );
        if (!targetBridge) {
          console.warn("該当するbridgeRomanNameが見つかりません:", bridgeShortName);
          return;
        }
  
        // inspections と additional_data を取得
        const { inspections = [], additional_data = [] } = targetBridge;
  
        // セレクトボックス初期化（先頭は「選択してください」）
        documentSelect.innerHTML = '<option value="">選択してください</option>';
  
        // inspections[] の要素を追加
        inspections.forEach(insp => {
          // ただし `inspectionLink` が存在しない場合もあるので注意
          // JSON側では "inspectionLink" というキーを使っているっぽいので
          // rename して value に使う
          const option = document.createElement("option");
          option.textContent = insp.inspectionName;
          option.value = insp.inspectionLink || "";
          documentSelect.appendChild(option);
        });
  
        // additional_data[] の要素を追加
        additional_data.forEach(dataItem => {
          const option = document.createElement("option");
          option.textContent = dataItem.data_name;
          option.value = dataItem.data_link || "";
          documentSelect.appendChild(option);
        });
      })
      .catch(error => {
        console.error("Error loading or parsing bridge_info.json:", error);
      });
  
    // 「GO →」ボタン押下で、新しいタブ(ウィンドウ)で documentSelect.value を開く
    documentOpenButton.addEventListener("click", () => {
        let linkUrl = documentSelect.value;
        if (!linkUrl) {
          alert("資料を選択してください。");
          return;
        }
    
        // リンクが "http://" または "https://" で始まるかチェック
        const isRemoteUrl = linkUrl.startsWith("http://") || linkUrl.startsWith("https://");
        if (!isRemoteUrl) {
          // ローカルファイルの場合
          // 例: linkUrl = "additional_data/sonshouzu.xlsx" など
          // => 最終的には "/bridge1_20241103/additional_data/sonshouzu.xlsx"
          linkUrl = `/${bridgeParam}/${linkUrl}`;
        }
    
        // 最終的に open
        window.open(linkUrl, "_blank");
    });
  });
  