/*
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
//ここが上下を決める超重要パラメータ
const upper_lower_border_z = 0.35;
// URLのクエリパラメータから"bridge"を取得する関数
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// "bridge"パラメータを取得し、存在しなければデフォルトで"bridge1"
//const bridge_folder = getQueryParam('bridge') || './bridge1_20241103';// デフォルトは 'bridge1':http://localhost:8000/?bridge=bridge1_20241103
const bridge_folder = getQueryParam('bridge') || 'bridge1_20241103';
console.log(`bridge_folder: ${bridge_folder}`);

// "_" で分割し、後ろ部分を YYYYMMDD とみなす
const parts = bridge_folder.split("_");
let datePart = "";
if (parts.length > 1) {
  datePart = parts[1]; 
  // 例: "20241103"
} else {
  // "_"が無い場合のフォールバック
  datePart = "00000000";
}
const yyyy = datePart.substring(0, 4);
const mm   = datePart.substring(4, 6);
const dd   = datePart.substring(6, 8);
const captureDateText = `${parseInt(yyyy)}年${parseInt(mm)}月${parseInt(dd)}日撮影`;

(function() {
    // ここでinitialize関数を定義
    function initialize() {
      const itemSelectElement = document.getElementById("itemSelect");
      if (!itemSelectElement) {
        console.error("itemSelect 要素が見つかりません");
        return;
      }

      const documentSelect = document.getElementById("documentSelect");
      if (!documentSelect) {
        console.warn("documentSelect 要素(資料セレクト)が見つかりません(デモ)");
      }

  
      fetch(`bridge1_20241103/annotations/annotations.json?folder=${bridge_folder}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to load annotations.json');
          }
          return response.json();
        })
        .then(data => {
          console.log("annotations.jsonの内容:", data);
  
          itemSelectElement.innerHTML = "";
          const blankOption = document.createElement("option");
          blankOption.value = "";
          blankOption.textContent = "選択してください";
          itemSelectElement.appendChild(blankOption);
  
          if (!data.annotations || !Array.isArray(data.annotations)) {
            console.error("annotationsが不正です:", data.annotations);
            return;
          }
  
          data.annotations.forEach(annotation => {
            const option = document.createElement("option");
            option.textContent = `${annotation.member}：${annotation.label}`;
            option.value = annotation.id;
            itemSelectElement.appendChild(option);
            console.log(`オプションを追加しました: ${annotation.member}：${annotation.label}`);
          });
  
          // セレクトボックス初期化
          initializeSelectBox();
        })
        .catch(error => {
          console.error('Error loading annotations:', error);
        });
    }
  
    function initializeSelectBox() {
      console.log("initializeSelectBox 関数が呼び出されました");
      const itemSelectElement = document.getElementById("itemSelect");
      if (!itemSelectElement) {
        console.warn("セレクトボックスが見つかりません");
        return;
      }
  
      if (typeof scenes === "undefined" || typeof getAnnotationById === "undefined") {
        console.error("依存するデータや関数が初期化されていません");
        return;
      }
  
      console.log("セレクトボックスを初期化しました");
      itemSelectElement.addEventListener("change", event => {
        const selectedAnnotationId = event.target.value;
        if (!selectedAnnotationId) {
          console.log("空白が選択されました");
          return;
        }
        console.log(`選択されたアノテーション: ${selectedAnnotationId}`);
  
        getAnnotationById(selectedAnnotationId)
          .then(annotation => {
            if (annotation) {
              const { imageName, vertices } = annotation;
              const targetScene = scenes.find(scene => scene.data.name === imageName);
              if (targetScene) {
                const sumX = vertices.reduce((sum, v) => sum + v.x, 0);
                const sumY = vertices.reduce((sum, v) => sum + v.y, 0);
                const centroidX = sumX / vertices.length;
                const centroidY = sumY / vertices.length;
                const { imageWidth, imageHeight } = targetScene.data;
                const yaw = (centroidX / imageWidth) * 2 * Math.PI - Math.PI;
                const pitch = -(Math.PI / 2 - (centroidY / imageHeight) * Math.PI);
  
                switchScene(targetScene, { fromSelectBox: true });
                targetScene.view.setParameters({ yaw: yaw, pitch: pitch });
              } else {
                console.warn(`シーンが見つかりません: ${imageName}`);
              }
            }
          })
          .catch(error => {
            console.error("Error fetching annotation:", error);
          });
      });
    }
  
    // IIFE内の最後でinitializeを呼び出す
    initialize();

  var Marzipano = window.Marzipano;
  //var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA;

  // Grab elements from DOM.
  var panoElement = document.querySelector('#pano');
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');
  
  // "情報追加" ボタンを取得
  const addAnnotationBtn = document.getElementById("addAnnotationBtn");
  if (addAnnotationBtn) {
    addAnnotationBtn.addEventListener("click", function() {
      startAddAnnotationMode();
      console.log("情報追加ボタンが押されました");
    });
  } else {
    console.warn("addAnnotationBtn が見つかりません");
  }
  // グローバル変数を1つ追加しておく
  let addingLayer = null;
  let addingPoints = [];  // 新規アノテーションの頂点リスト
  let newPolygonId = null; // 新規アノテーションのID

  function startAddAnnotationMode() {
    console.log("新規アノテーションの追加モードを開始します");

      // 1) 「アイテム選択」を非表示
    const itemSelector = document.getElementById("itemSelector");
    if (itemSelector) {
      itemSelector.style.display = "none";
    }

    // 1.5) 「資料」セレクトボックス (#documentSelect) も非表示
    const docContainer = document.getElementById("documentSelectorContainer");
    if (docContainer) {
     //docContainer.style.display = "none";
     docContainer.classList.add('hidden');
    }
  

    // 2) 「情報追加」ボタンを非表示
    const addAnnotationBtn = document.getElementById("addAnnotationBtn");
    if (addAnnotationBtn) {
      addAnnotationBtn.style.display = "none";
    }

    // まず地図や既存SVGを隠したり、ビューアー操作を無効化したりする
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.style.display = 'none';
    }
    viewer.controls().disable();

    addingPoints = [];        // 頂点リストを初期化
    newPolygonId = null;      // IDも初期化
    // すでに addingLayer が存在したら削除 (念のため)
    const existingLayer = document.getElementById('addingLayer');
    if (existingLayer) {
      existingLayer.remove();
    }
  
    // ---- 1) addingLayerを作成 ----
    // ここではポインタ操作を通さない (pointer-events: none) にする
    addingLayer = document.createElement('div');
    addingLayer.id = 'addingLayer';
    addingLayer.style.position = 'absolute';
    addingLayer.style.top = '0';
    addingLayer.style.left = '0';
    addingLayer.style.width = '100%';
    addingLayer.style.height = '100%';
    addingLayer.style.zIndex = '500';
    addingLayer.style.cursor = 'crosshair';     // カーソルは十字に
    addingLayer.style.pointerEvents = 'none';   // クリックをブロックしない
    document.body.appendChild(addingLayer);
  
    // ---- 2) SVGレイヤーを作成 ----
    // z-indexを 600 にして、pointer-events を有効化
    const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgElement.id = 'addingPolylineLayer';
    svgElement.style.position = 'absolute';
    svgElement.style.top = '0';
    svgElement.style.left = '0';
    svgElement.style.width = '100%';
    svgElement.style.height = '100%';
    svgElement.style.zIndex = '600';
    svgElement.style.pointerEvents = 'all';  // ここが重要：SVG/Polygonがクリックを受け取れる
    document.body.appendChild(svgElement);
  
    // 頂点リストとIDを初期化
    addingPoints = [];
    newPolygonId = "annotation_new_" + Date.now();
  
    // ---- 3) 左クリックで頂点追加 ----
    // 以前は addingLayer.addEventListener('click', ...) でしたが、
    // pointer-events:none なのでそこには届きません。
    // 代わりに document 全体 or svgElement で受け取る方法を推奨
    document.addEventListener('click', onAddAnnotationClick);
    document.addEventListener('contextmenu', onNewAnnotationRightClick, { capture: true });
  
    // ---- 4) 「追加終了」ボタンを表示 ----
    createAddEndButton();
  }

  function onNewAnnotationRightClick(event) {
    // デフォルトメニューを出さない
    event.preventDefault();
    event.stopPropagation();
  
    // もし target が <polygon> なら
    if (event.target.tagName.toLowerCase() === 'polygon') {
      console.log("ポリゴンの内側で右クリックされました: 新規アノテーションポップアップを出す");
      finishAddAnnotationMode(); // 既存ロジックでは「ポリゴン内で右クリック→追加終了」でしたが
                                // ここを変更して「新規アノテーションポップアップ」を出すだけでもOK
  
      // 例: finishAddAnnotationMode() の代わりに
      // showNewAnnotationPopup();
  
    } else {
      // それ以外(ポリゴン外側)を右クリックした場合 → 操作キャンセル
      console.log("ポリゴン外側で右クリック: 操作キャンセル");
      cancelAddAnnotationMode();
    }
  }


// 例: index.js 内のどこかに書く
function setMapBackgroundIfExists(bridge_folder) {
  //const mapImagePath = `${basePath}/${bridgeFolder}/map.png`;
  const mapImagePath = `${bridge_folder}/map.png`;
  // HEADリクエストで画像が存在するかチェック
  fetch(mapImagePath, { method: 'HEAD' })
    .then(response => {
      if (response.ok) {
        // 画像が存在している場合だけ背景にする
        const mapDiv = document.getElementById('map');
        if (!mapDiv) return;

        mapDiv.style.backgroundImage = `url("${mapImagePath}")`;
        mapDiv.style.backgroundRepeat = 'no-repeat';
        mapDiv.style.backgroundPosition = 'center';

        // ▼アスペクト比を無視して「枠いっぱいに埋める」なら:
        mapDiv.style.backgroundSize = 'cover';

        // もしアスペクト比を維持したまま全体を表示したいなら "contain" などに変える
        // mapDiv.style.backgroundSize = 'contain';
      } else {
        // 404等で見つからない場合は何もしない（現状の背景）
        console.warn(`map.png not found. Using default background.`);
      }
    })
    .catch(err => {
      console.error('Error checking map.png:', err);
    });
}



  function onAddAnnotationClick(event) {
    // もし "情報追加" ボタンそのもの (またはその子要素) をクリックした場合は頂点を追加しない
    if (
      event.target.id === "addAnnotationBtn" ||
      event.target.closest("#addAnnotationBtn")
    ) {
      console.log("情報追加ボタンがクリックされたので、頂点追加はしない");
      return;
    }

    if (
      event.target.id === "addEndButton" ||
      event.target.closest("#addEndButton")
    ) {
      console.log("追加終了ボタンがクリックされたので、頂点追加はしない");
      return;
    }
    // クリックした座標を取得
    const x = event.clientX;
    const y = event.clientY;
  
    // 頂点を作る
    const point = document.createElement('div');
    point.classList.add('adding-point');
    point.setAttribute('style', `
      position: absolute;
      width: 10px;
      height: 10px;
      background-color: blue;
      border-radius: 50%;
      left: ${x}px;
      top: ${y}px;
      transform: translate(-50%, -50%);
    `);
    addingLayer.appendChild(point);
    addingPoints.push(point);
  
    // 多角形を再描画
    drawNewPolyline();
  }

  function drawNewPolyline() {
    const svgElement = document.getElementById('addingPolylineLayer');
    if (!svgElement) return;
  
    while (svgElement.firstChild) {
      svgElement.removeChild(svgElement.firstChild);
    }
  
    if (addingPoints.length < 2) return;
  
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("fill", "transparent");       // 中を透過
    polygon.setAttribute("stroke", "blue");
    polygon.setAttribute("stroke-width", "2");
    polygon.setAttribute("pointer-events", "all");     // 内側クリックが可能に
  
    const pointsArray = addingPoints.map(pt => {
      const px = parseInt(pt.style.left, 10);
      const py = parseInt(pt.style.top, 10);
      return `${px},${py}`;
    });
    polygon.setAttribute("points", pointsArray.join(' '));
  
    svgElement.appendChild(polygon);
  }
  

  // ※ グローバル変数として、document用のリスナーを保持しておく
  let polygonRightClickHandler = null;

  function createAddEndButton() {
    const button = document.createElement('button');
    button.textContent = '追加終了';
    button.id = 'addEndButton';

    // --- スタイルを調整して、情報追加ボタンの下に設置 ---
    button.style.position = "fixed";
    button.style.top = "60px";
    button.style.right = "10px";
    button.style.zIndex = "1001";
    button.style.padding = "10px 15px";
    button.style.backgroundColor = "orange";
    button.style.color = "white";
    button.style.border = "none";
    button.style.borderRadius = "5px";
    button.style.cursor = "pointer";
    button.style.fontSize = "16px";
    button.style.boxShadow = "0 2px 5px rgba(0,0,0,0.3)";
    button.style.transition = "background-color 0.3s";

    // ホバー時の色変化
    button.addEventListener("mouseover", () => {
      button.style.backgroundColor = "#ff9933";
    });
    button.addEventListener("mouseout", () => {
      button.style.backgroundColor = "orange";
    });

    // 左クリックで「追加終了」
    button.addEventListener('click', function() {
      finishAddAnnotationMode();
    });

    // 右クリックでも「追加終了」にしたい場合
    button.addEventListener('contextmenu', function(e) {
      e.preventDefault();  // デフォルトの右クリックメニューを出さない
      finishAddAnnotationMode();
    });

    document.body.appendChild(button);

    /*
    * ここで「ポリゴン内を右クリックしたら追加終了」も行いたいので、
    * グローバルの contextmenu イベントを追加。
    */
    polygonRightClickHandler = (event) => {
      // デフォルトのコンテキストメニューは止める
      event.preventDefault();
      event.stopPropagation();

      // もし <polygon> を右クリックしたなら追加終了
      if (event.target.tagName.toLowerCase() === 'polygon') {
        console.log("ポリゴン内部で右クリックされました。追加終了へ。");
        finishAddAnnotationMode();
      } else {
        // それ以外の要素を右クリックした場合の動作（ログ出力など）
        console.log(`右クリックされた要素: ${event.target.tagName}`);
      }
    };

    // グローバルで右クリックを拾う
    document.addEventListener('contextmenu', polygonRightClickHandler);
  }


  function finishAddAnnotationMode() {
    console.log("追加モード終了。頂点数=", addingPoints.length);
    // 追加: 頂点数が3未満ならキャンセル扱い
    if (addingPoints.length < 3) {
      console.log("頂点が少なすぎます。キャンセル扱いにします。");
      cancelAddAnnotationMode();
      return;
    }

    document.removeEventListener('click', onAddAnnotationClick);

    // 追加終了ボタンを消す
    const btn = document.getElementById('addEndButton');
    if (btn) btn.remove();

    // クリックイベントを解除
    addingLayer.removeEventListener('click', onAddAnnotationClick);
    // 右クリックリスナーを外す
    document.removeEventListener('contextmenu', onNewAnnotationRightClick, { capture: true });

    // グローバル contextmenu イベントを削除（再度アノテーションモードに入るときに追加する想定）
    if (polygonRightClickHandler) {
      document.removeEventListener('contextmenu', polygonRightClickHandler);
      polygonRightClickHandler = null;
    }

    // ここで「新規アノテーション編集ポップアップ」を表示
    showNewAnnotationPopup();

    // ※多角形や頂点はまだ残しておいて、ポップアップで「決定」されるまで保持
      // 1) 「アイテム選択」再表示
          // なお、今のコードは 2)に itemSelector.style.display = "block";
    // になっていますが、そこを消せば「ポップアップが閉じるまで非表示」を保てます。
    // なので、ここではコメントアウト:

    /*
    const itemSelector = document.getElementById("itemSelector");
    if (itemSelector) {
      itemSelector.style.display = "block";
    }

    // 2) 「情報追加」ボタン再表示
    const addAnnotationBtn = document.getElementById("addAnnotationBtn");
    if (addAnnotationBtn) {
      addAnnotationBtn.style.display = "block";
    }*/
  }

  function showNewAnnotationPopup() {
    console.log("showNewAnnotationPopup が呼ばれた");
    const itemSelector = document.getElementById("itemSelector");
    const docContainer = document.getElementById("documentSelectorContainer");
  
    // すでに存在するポップアップやオーバーレイがあれば削除
    const existingOverlay = document.getElementById("newAnnotationOverlay");
    if (existingOverlay) {
      existingOverlay.remove();
    }
    const existingPopup = document.getElementById("newAnnotationPopup");
    if (existingPopup) {
      existingPopup.remove();
    }
  
    // 1) アイテム選択ウィンドウを隠す    
    if (itemSelector) {
      itemSelector.style.display = "none";
    }
  
    /*
     * 2) モーダル用のオーバーレイを作成
     *    - これにより背面のクリックをブロックし、ポリゴン形状が変化しないようにする
     */
    const overlay = document.createElement("div");
    overlay.id = "newAnnotationOverlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.3)"; // 半透明の背景など
    overlay.style.zIndex = "2000"; // 前面に表示
    overlay.style.pointerEvents = "auto"; // ここでクリックをブロック
    document.body.appendChild(overlay);
  
    // 3) ポップアップ本体を作成
    const popup = document.createElement("div");
    popup.id = "newAnnotationPopup";
    popup.style.position = "absolute";
    popup.style.top = "50%";
    popup.style.left = "50%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.backgroundColor = "white";
    popup.style.color = "black";
    popup.style.border = "1px solid #999";
    popup.style.borderRadius = "10px";
    popup.style.boxShadow = "0 5px 15px rgba(0,0,0,0.3)";
    popup.style.width = "400px";
    popup.style.maxWidth = "90%";
    popup.style.zIndex = "3000"; // overlay(2000)より前
    popup.style.padding = "20px";

    makeDraggable(popup);
  
    // ==== タイトル ====
    const titleBar = document.createElement("div");
    titleBar.style.marginBottom = "10px";
    titleBar.style.textAlign = "center";
  
    const title = document.createElement("h3");
    title.textContent = "新規アノテーションを追加";
    title.style.margin = "0";
    titleBar.appendChild(title);
    popup.appendChild(titleBar);
  
    // ==== member入力欄 ====
    const memberContainer = document.createElement("div");
    memberContainer.style.marginBottom = "10px";
  
    const memberLabel = document.createElement("div");
    memberLabel.textContent = "位置・部材等：";
    memberLabel.style.fontWeight = "bold";
    memberLabel.style.marginBottom = "5px";
    memberContainer.appendChild(memberLabel);
  
    const memberInput = document.createElement("input");
    memberInput.type = "text";
    Object.assign(memberInput.style, {
      width: "100%",
      padding: "8px",
      boxSizing: "border-box",
      borderRadius: "5px",
      border: "1px solid #ccc",
    });
    memberContainer.appendChild(memberInput);
    popup.appendChild(memberContainer);
  
    // ==== label入力欄 ====
    const labelContainer = document.createElement("div");
    labelContainer.style.marginBottom = "10px";
  
    const labelTitle = document.createElement("div");
    labelTitle.textContent = "状態・損傷等：";
    labelTitle.style.fontWeight = "bold";
    labelTitle.style.marginBottom = "5px";
    labelContainer.appendChild(labelTitle);
  
    const labelInput = document.createElement("input");
    labelInput.type = "text";
    Object.assign(labelInput.style, {
      width: "100%",
      padding: "8px",
      boxSizing: "border-box",
      borderRadius: "5px",
      border: "1px solid #ccc",
    });
    labelContainer.appendChild(labelInput);
    popup.appendChild(labelContainer);
  
    // ==== info入力欄 (textarea) ====
    const infoLabel = document.createElement("div");
    infoLabel.textContent = "詳細情報：";
    infoLabel.style.fontWeight = "bold";
    infoLabel.style.marginBottom = "5px";
    popup.appendChild(infoLabel);
  
    const infoTextarea = document.createElement("textarea");
    infoTextarea.rows = 4;
    Object.assign(infoTextarea.style, {
      width: "100%",
      padding: "8px",
      boxSizing: "border-box",
      borderRadius: "5px",
      border: "1px solid #ccc",
      marginBottom: "10px",
    });
    popup.appendChild(infoTextarea);
  
    // ==== color入力欄 ====
    const colorContainer = document.createElement("div");
    colorContainer.style.marginBottom = "15px";
  
    const colorLabel = document.createElement("div");
    colorLabel.textContent = "線の色：";
    colorLabel.style.fontWeight = "bold";
    colorLabel.style.marginBottom = "5px";
    colorContainer.appendChild(colorLabel);
  
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = "#FF0000"; // 初期値
    Object.assign(colorInput.style, {
      width: "60px",
      height: "30px",
      padding: "0",
    });
    colorContainer.appendChild(colorInput);

    // --- デフォルト色チェックボックスを追加 ---
    const defaultColorDiv = document.createElement("div");
    defaultColorDiv.style.display = "flex";
    defaultColorDiv.style.alignItems = "center";
    defaultColorDiv.style.marginTop = "5px";  // 少し余白
    colorContainer.appendChild(defaultColorDiv);

    const defaultColorCheckbox = document.createElement("input");
    defaultColorCheckbox.type = "checkbox";
    defaultColorDiv.appendChild(defaultColorCheckbox);

    const defaultColorLabel = document.createElement("label");
    defaultColorLabel.textContent = "デフォルト色を使用する";
    defaultColorLabel.style.marginLeft = "5px";
    defaultColorDiv.appendChild(defaultColorLabel);

    popup.appendChild(colorContainer);
  
    // ==== ボタン (決定・キャンセル) ====
    const buttonContainer = document.createElement("div");
    Object.assign(buttonContainer.style, {
      display: "flex",
      justifyContent: "space-between",
    });
  
    // --- 決定ボタン ---
    const decideButton = document.createElement("button");
    decideButton.textContent = "決定";
    Object.assign(decideButton.style, {
      backgroundColor: "#4CAF50",
      color: "white",
      padding: "8px 12px",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
    });
    decideButton.addEventListener("click", function () {
      console.log("決定ボタンが押されました！");

      // もし「デフォルトを使用する」にチェックがあれば color=null を送る
      let finalColor = defaultColorCheckbox.checked ? null : colorInput.value;
  
      // 1) saveNewAnnotation を呼び出し
      saveNewAnnotation(
        memberInput.value,
        labelInput.value,
        infoTextarea.value,
        finalColor
      );
  
      // 2) ポップアップ＆オーバーレイを消す
      overlay.remove();
  
      // 3) itemSelector を再表示
      if (itemSelector) {
        itemSelector.style.display = "block";
        
      }
      if (docContainer) {
        //docContainer.style.display = "block";
        docContainer.classList.remove('hidden');
      }
    });
    buttonContainer.appendChild(decideButton);
  
    // --- キャンセルボタン ---
    const cancelButton = document.createElement("button");
    cancelButton.textContent = "キャンセル";
    Object.assign(cancelButton.style, {
      backgroundColor: "#f44336",
      color: "white",
      padding: "8px 12px",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
    });
    cancelButton.addEventListener("click", function () {
      console.log("キャンセルボタンが押されました");
  
      // ポップアップ＆オーバーレイを消す
      overlay.remove();
  
      // itemSelector 再表示
      if (itemSelector) {
        itemSelector.style.display = "block";
      }
      if (docContainer) {
        //docContainer.style.display = "block";
        docContainer.classList.remove('hidden');
      }
  
      // 新規追加モードを終了
      cancelAddAnnotationMode();
    });
    buttonContainer.appendChild(cancelButton);
  
    popup.appendChild(buttonContainer);
  
    // 4) ポップアップをオーバーレイに追加 → body に追加
    overlay.appendChild(popup);
  
    // 5) オーバーレイやポップアップの外側クリックを無効化
    overlay.addEventListener("click", (e) => {
      // オーバーレイをクリックしても、背面にイベントを伝えない
      e.stopPropagation();
    });
    popup.addEventListener("click", (e) => {
      // ポップアップ内のクリックも伝播を止める
      e.stopPropagation();
    });
  }
  
  
  function cancelAddAnnotationMode() {
    // remove addingLayer
    if (addingLayer) {
      document.removeEventListener('click', onAddAnnotationClick);
      addingLayer.removeEventListener('click', onAddAnnotationClick);
      if (document.body.contains(addingLayer)) {
        document.body.removeChild(addingLayer);
      }
      addingLayer = null;
    }

    // 右クリックリスナーを外す
    document.removeEventListener('contextmenu', onNewAnnotationRightClick, { capture: true });
  
    // remove the svg
    const svg = document.getElementById('addingPolylineLayer');
    if (svg) {
      document.body.removeChild(svg);
    }
    addingPoints = [];
  
    // viewerコントロールを再有効化
    viewer.controls().enable();
  
    // 地図を再表示
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.style.display = 'block';
    }
    // 追加終了ボタンを消す
    const endBtn = document.getElementById("addEndButton");
    if (endBtn) {
      endBtn.remove();
    }

      // 情報追加ボタン / アイテム選択を復活
    const itemSelector = document.getElementById("itemSelector");
    if (itemSelector) {
      itemSelector.style.display = "block";
    }
    const addAnnotationBtn = document.getElementById("addAnnotationBtn");
    if (addAnnotationBtn) {
      addAnnotationBtn.style.display = "block";
    }
  // 情報追加ボタン / アイテム選択を復活
    const docContainer = document.getElementById("documentSelectorContainer");
    if (docContainer) {
      docContainer.classList.remove("hidden");
    }
  }
  
  
  function saveNewAnnotation(member, label, info, color) {
    // 1. addingPoints から vertices (ピクセル座標) を作成
    const newVertices = addingPoints.map(pt => {
      const screenX = parseInt(pt.style.left, 10);
      const screenY = parseInt(pt.style.top, 10);
  
      // Screen to Yaw/Pitch
      const { yaw, pitch } = getYawPitchFromScreenPosition(screenX, screenY);
  
      // Yaw/Pitch to Pixel
      const { pixelX, pixelY } = convertYawPitchToPixels(yaw, -pitch, imageWidth, imageHeight);
  
      return {
        x: Math.round(pixelX),
        y: Math.round(pixelY)
      };
    });

    let finalId = newPolygonId.replace("annotation_new_", "annotation_");//ここを変えないと，newを前提とした処理があって，あとから既存アノテーションを右クリックしたときに編集モードが立ち上がらない．
  
    // 2. 新規アノテーションオブジェクト
    const newAnnotation = {
      id: finalId,  // 先ほど生成したユニークID（startAddAnnotationMode内）
      imageName: imageName, // 現在の画像名
      vertices: newVertices,
      member: member,
      label: label,
      info: info,
      color: color
    };
  
    console.log("新規アノテーションをサーバーに送信:", newAnnotation);
  
    // 3. POST でサーバーに送る (例: /save-annotations?folder=...)
    fetch(`/save-annotations?folder=${bridge_folder}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAnnotation)
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(errData => {
            console.error("Detailed error data:", errData);
            throw new Error('Failed to save new annotation');
          });
        }
        return response.json();
      })
      .then(data => {
        console.log("New annotation saved successfully", data);
  
        // 4. 成功したらポリゴンや点をリセット・再描画
        finalizeAddAnnotation(); // 追加終了モードを本当に確定する例
        // セレクトボックスを再描画させるために、initialize() を再呼び出し
        initialize(); 
      })
      .catch(error => {
        console.error('Error saving new annotation:', error);
      });
  }
  

  function finalizeAddAnnotation() {
    // addingLayer, addingPolylineLayer を消去
    if (addingLayer) {
      document.body.removeChild(addingLayer);
      addingLayer = null;
    }
    const svg = document.getElementById('addingPolylineLayer');
    if (svg) {
      document.body.removeChild(svg);
    }
    addingPoints = [];
  
    // Viewer コントロールを有効化
    viewer.controls().enable();
  
    // 地図表示
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.style.display = 'block';
    }

    const addAnnotationBtn = document.getElementById("addAnnotationBtn");
    if (addAnnotationBtn) {
      addAnnotationBtn.style.display = "block";
    }
  
    // 最新の annotations.json を再読み込み
    loadAnnotationsFromJSON(imageWidth, imageHeight, imageName);
  }
  
  
  
  
  
  
    


  // Detect desktop or mobile mode.
  if (window.matchMedia) {
    var setMode = function() {
      if (mql.matches) {
        document.body.classList.remove('desktop');
        document.body.classList.add('mobile');
      } else {
        document.body.classList.remove('mobile');
        document.body.classList.add('desktop');
      }
    };
    var mql = matchMedia("(max-width: 500px), (max-height: 500px)");
    setMode();
    mql.addListener(setMode);
  } else {
    document.body.classList.add('desktop');
  }

  // Detect whether we are on a touch device.
  document.body.classList.add('no-touch');
  window.addEventListener('touchstart', function() {
    document.body.classList.remove('no-touch');
    document.body.classList.add('touch');
  });

  // Viewer options.
  var viewerOpts = {
    controls: {
      mouseViewMode: data.settings.mouseViewMode
    }
  };

  // Initialize viewer.
  // Marzipano.Viewerのインスタンスを作成し、panoElementとviewerOptsを渡す
  // panoElement: パノラマビューアを表示するHTML要素
  // viewerOpts: ビューアの設定���プション
  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);

  // Create scenes.
  var scenes = data.scenes.map(function(data) {
    var source = Marzipano.ImageUrlSource.fromString(data.imageUrl); // Equirectangular画像のパスを指定
    // 画像の解像度を指定してジオメトリを作成：ここは合わせたほうがいいよね．
    var geometry = new Marzipano.EquirectGeometry([{ width: 3360 }]); // 適切な解像度を指定6720
    // ビューの制限を設定し、視野角を指定
    // traditionalメソッドを使用して、RectilinearViewの制限を設定
    // data.faceSize: 画像のフェイスサイズ（ピクセル単位）
    // 100*Math.PI/180: 最小視野角（ラジアン単位） - ここでは100度をラジアンに変換
    // 120*Math.PI/180: 最大視野角（ラジアン単位） - ここでは120度をラジアンに変換
    var limiter = Marzipano.RectilinearView.limit.traditional(data.faceSize, 100*Math.PI/180, 120*Math.PI/180);
    var view = new Marzipano.RectilinearView(data.initialViewParameters, limiter);

    var scene = viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: true
    });

    // Create link hotspots.
    // リンクホットスポットを作成
    // リンクホットスポットとは、パノラマビュー内で他のシーンに移動するためのインタラクティブな要素です。
    // yaw（ヨー）とpitch（ピッチ）は、ホットスポットの位置を指定するための角度です。
    // yawは水平角度（左右の回転）を表し、pitchは垂直角度（上下の回転）を表します。
    //多分yaw, pitchはdata.jsで定義されているもの？
    data.linkHotspots.forEach(function(hotspot) {
      var element = createLinkHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // Create info hotspots.
    // インフォホットスポットを作成
    // インフォホットスポットとは、パノラマビュー内で追加情報を表示するためのインタラクティブな要素です。
    // 例えば、特定の場所に関する説明や画像、リンクなどを表示することができます。
    // yaw（ヨー）とpitch（ピッチ）は、ホットスポットの位置を指定するための角度です。
    // yawは水平角度（左右の回転）を表し、pitchは垂直角度（上下の回転）を表します。
    // インフォホットスポットは、ユーザーが特定のポイントに関する詳細情報を得るための便利な手段です。
    // infoHotspots配列内の各ホットスポットに対して処理を行う
    data.infoHotspots.forEach(function(hotspot) {
      var element = createInfoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    return {
      data: data,
      scene: scene,
      view: view
    };
  });

  // Set up fullscreen mode, if supported.
  if (typeof screenfull !== 'undefined' && screenfull.enabled && data.settings.fullscreenButton) {
    document.body.classList.add('fullscreen-enabled');
    fullscreenToggleElement.addEventListener('click', function() {
      screenfull.toggle();
    });
    screenfull.on('change', function() {
      if (screenfull.isFullscreen) {
        fullscreenToggleElement.classList.add('enabled');
      } else {
        fullscreenToggleElement.classList.remove('enabled');
      }
    });
  } else {
    document.body.classList.add('fullscreen-disabled');
  }
  

  // DOM elements for view controls.
  // ビューコントロール用のDOM要素を取得
  // DOM要素とは、HTMLドキュメント内の各要素を表すオブジェクトです。
  // これにより、JavaScriptからHTML要素を操作することができます。
  // 例えば、特定のボタンや画像、テキストなど���取得し、動的に変更することが可能です。
  // 各方向（上、下、左、右、ズームイン、ズームアウト）に対応する要素を取得
  var viewUpElement = document.querySelector('#viewUp');
  var viewDownElement = document.querySelector('#viewDown');
  var viewLeftElement = document.querySelector('#viewLeft');
  var viewRightElement = document.querySelector('#viewRight');
  var viewInElement = document.querySelector('#viewIn');
  var viewOutElement = document.querySelector('#viewOut');

    // セレクトボックスのイベントリスナー追加
    /*
  var itemSelectElement = document.getElementById("itemSelect");
  if (itemSelectElement) {
    itemSelectElement.addEventListener("change", function(event) {
      const selectedItem = event.target.value;
      console.log("選択されたアイテム:", selectedItem);

      // 選択に応じた処理をここに記述
      switch (selectedItem) {
        case "item1":
          alert("アイテム1が選択されました！");
          break;
        case "item2":
          alert("アイテム2が選択されました！");
          break;
        case "item3":
          alert("アイテム3が選択されました！");
          break;
        default:
          console.log("未知の選択肢です:", selectedItem);
      }
    });
  } else {
    console.warn("セレクトボックスが見つかりませんでした");
  }
*/
  // Dynamic parameters for controls.
  var velocity = 0.7;
  var friction = 3;

  // Associate view controls with elements.
  var controls = viewer.controls();
  controls.registerMethod('upElement',    new Marzipano.ElementPressControlMethod(viewUpElement,     'y', -velocity, friction), true);
  controls.registerMethod('downElement',  new Marzipano.ElementPressControlMethod(viewDownElement,   'y',  velocity, friction), true);
  controls.registerMethod('leftElement',  new Marzipano.ElementPressControlMethod(viewLeftElement,   'x', -velocity, friction), true);
  controls.registerMethod('rightElement', new Marzipano.ElementPressControlMethod(viewRightElement,  'x',  velocity, friction), true);
  controls.registerMethod('inElement',    new Marzipano.ElementPressControlMethod(viewInElement,  'zoom', -velocity, friction), true);
  controls.registerMethod('outElement',   new Marzipano.ElementPressControlMethod(viewOutElement, 'zoom',  velocity, friction), true);

  function sanitize(s) {
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;');
  }

  /*何故か２つ定義してた
  function switchScene(scene) {
    scene.view.setParameters(scene.data.initialViewParameters);
    scene.scene.switchTo();
    
  }*/

  //パノラマ画像にホットスポットを設置する関数
  function createLinkHotspotElement(hotspot) {

    // Create wrapper element to hold icon and tooltip.
    // ホットスポットのラッパー要素を作成
    var wrapper = document.createElement('div');
    // 'hotspot'クラスを追加
    wrapper.classList.add('hotspot');
    // 'link-hotspot'クラスを追加
    wrapper.classList.add('link-hotspot');

    // ここで dataset.target にシーンIDを仕込む
    wrapper.dataset.target = hotspot.target; 


    // 画像要素を作成
    var icon = document.createElement('img');
    // ターゲットとなるシーンデータを取得
    var targetSceneData = findSceneDataById(hotspot.target);

    // mapZが0.5より小さい場合はlink_down.png、それ以外はlink.png
    if (targetSceneData && typeof targetSceneData.mapZ === 'number' && targetSceneData.mapZ < upper_lower_border_z) {
      icon.src = 'img/link_down.png';
    } else {
      icon.src = 'img/link.png';
    }

    icon.classList.add('link-hotspot-icon');
    

    // 回転変換を設定
    // 回転変換プロパティの配列を定義
    // これにより、異なるブラウザでの互換性を確保
    var transformProperties = [ '-ms-transform', '-webkit-transform', 'transform' ];
    
    // 各プロパティに対してループを実行
    // 各プロパティを取り出し、アイコンのスタイルに回転変換を適用
    for (var i = 0; i < transformProperties.length; i++) {
      var property = transformProperties[i];
      // ホットスポットの回転角度をラジアン単位で設定
      icon.style[property] = 'rotate(' + hotspot.rotation + 'rad)';
    }

    // サイズと透明度をdata.jsから設定
    icon.style.width = (hotspot.size * 100) + '%';  // サイズをdata.jsから設定
    icon.style.height = (hotspot.size * 100) + '%'; // 縦幅も同じ割合で設定
    icon.style.opacity = hotspot.opacity;  // 透明度をdata.jsから設定
    
 
    // Add click event handler.
    wrapper.addEventListener('click', function() {
      var targetScene = findSceneById(hotspot.target);
      if (targetScene) {
        switchScene(targetScene);  // シーンを切り替える際に必ずswitchSceneを呼ぶ
      }
    });


    // Prevent touch and scroll events from reaching the parent element.
    // This prevents the view control logic from interfering with the hotspot.
    stopTouchAndScrollEventPropagation(wrapper);

    // Create tooltip element.
    // ツールチップ要素を作成
    // ツールチップ要素とは、ユーザーが特定のホットスポットにマウスを重ねたときやタップしたときに表示される情報のバルーンです。
    // これにより、ユーザーはホットスポットに関連する追加情報を得ることができます。
    // ツールチップ要素は、視覚的な手がかりを提供し、ユーザーエクスペリエンスを向上させるために使用されます。
    // 例えば、リンクホットスポットの場合、ツール��ップにはリンク先のシーンの名前が表示されます。
    // ツールチップ要素は、ホットスポットのラッパー要素に追加され、ホットスポットの位置に応じて表示されます。
    var tooltip = document.createElement('div');
    // 'hotspot-tooltip'クラスを追加
    tooltip.classList.add('hotspot-tooltip');
    // 'link-hotspot-tooltip'クラスを追加
    tooltip.classList.add('link-hotspot-tooltip');
    // ツールチップの内容を設定
    // findSceneDataById関数を使用して、ターゲットシーンの名前を取得し、ツールチップに設定
    tooltip.innerHTML = findSceneDataById(hotspot.target).name;

    // アイコン要素をラッパーに追加
    // ラッパー要素とは、他の要素を内包するためのコンテナ要素です。
    // ここでは、ホットスポットのアイコンとツールチップを内包するために使用されます。
    wrapper.appendChild(icon);
    // ツールチップ要素をラッパーに追加
    // ツールチップ要素は、ホットスポットに関連する追加情報を表示するための要素です。
    wrapper.appendChild(tooltip);
    // ラッパー要素を返す
    return wrapper;
  }


      //以下のようにすると，アイコンのまわりをクリックしても飛ばなくなるが，もしかしたらモバイルから使いにくくなるかもしれないので保留．あと，ポリゴンとアイコンが重なっているとき，アイコンが選択画面に出てこなくなる．
/*
// パノラマ画像にホットスポットを設置する関数
function createLinkHotspotElement(hotspot) {

  // Create wrapper element to hold icon and tooltip.
  var wrapper = document.createElement('div');
  wrapper.classList.add('hotspot');
  wrapper.classList.add('link-hotspot');

  // ▼ シーンIDを保持（お好みで利用）
  wrapper.dataset.target = hotspot.target; 

  // ▼ 親は pointer-events: none → 親の余白部分はクリック不可
  wrapper.style.pointerEvents = 'none';

  // 画像要素を作成
  var icon = document.createElement('img');
  // ターゲットとなるシーンデータを取得
  var targetSceneData = findSceneDataById(hotspot.target);

  // mapZが0.5より小さい場合はlink_down.png、それ以外はlink.png
  if (targetSceneData && typeof targetSceneData.mapZ === 'number' && targetSceneData.mapZ < upper_lower_border_z) {
    icon.src = 'img/link_down.png';
  } else {
    icon.src = 'img/link.png';
  }
  icon.classList.add('link-hotspot-icon');

  // ▼ 子は pointer-events: auto → 画像部分だけクリックを受け取れる
  icon.style.pointerEvents = 'auto';

  // 回転変換の設定
  var transformProperties = [ '-ms-transform', '-webkit-transform', 'transform' ];
  for (var i = 0; i < transformProperties.length; i++) {
    var property = transformProperties[i];
    icon.style[property] = 'rotate(' + hotspot.rotation + 'rad)';
  }

  // サイズ・透明度を data.js から
  icon.style.width = (hotspot.size * 100) + '%';
  icon.style.height = (hotspot.size * 100) + '%';
  icon.style.opacity = hotspot.opacity;

  // ▼ 親ではなく、子 (icon) にクリックリスナーを付ける
  //    pointer-events: none; にした親はクリックを受け取りません。
  icon.addEventListener('click', function(e) {
    e.stopPropagation(); // 念のためバブリングを止める
    var targetScene = findSceneById(hotspot.target);
    if (targetScene) {
      switchScene(targetScene); // シーンを切り替え
    }
  });

  // ☆ もともとの「wrapper.addEventListener('click', ...)」は削除/コメントアウト
  //   （親が pointer-events:none のため、実際には発火しなくなる）

  // Prevent touch and scroll events from reaching the parent element.
  // (parentは pointer-events: none だが、一応残しておく)
  stopTouchAndScrollEventPropagation(wrapper);

  // Create tooltip element.
  var tooltip = document.createElement('div');
  tooltip.classList.add('hotspot-tooltip');
  tooltip.classList.add('link-hotspot-tooltip');
  tooltip.innerHTML = findSceneDataById(hotspot.target).name;

  // 親に子をappend
  wrapper.appendChild(icon);
  wrapper.appendChild(tooltip);
  return wrapper;
}

*/

  // インフォホットスポット要素を作成する関数
  // この関数は、パノラマビュー内で追加情報を表示するためのインタラクティブな要素（インフォホットスポット）を作成します。
  // インフォホットスポットは、特定の場所に関する説明や画像、リンクなどを表示するために使用されます。
  // 引数としてホットスポットデータ（hotspot）を受け取り、そのデータに基づいてDOM要素を生成します。
  function createInfoHotspotElement(hotspot) {

    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('info-hotspot');

    // Create hotspot/tooltip header.
    var header = document.createElement('div');
    header.classList.add('info-hotspot-header');

    // Create image element.
    var iconWrapper = document.createElement('div');
    iconWrapper.classList.add('info-hotspot-icon-wrapper');
    var icon = document.createElement('img');
    icon.src = 'img/info.png';
    icon.classList.add('info-hotspot-icon');
    iconWrapper.appendChild(icon);

    // Create title element.
    // title elementは、ホットスポットのタイトルを表示するための要素です。
    // この要素は、ホットスポットのラッパー要素内に追加され、ユーザーに視覚的な手がかりを提供します。
    // 具体的には、ホットスポットのタイトルが表示される部分です。
    var titleWrapper = document.createElement('div');
    titleWrapper.classList.add('info-hotspot-title-wrapper');
    var title = document.createElement('div');
    title.classList.add('info-hotspot-title');
    title.innerHTML = hotspot.title;
    titleWrapper.appendChild(title);

    // Create close element.
    var closeWrapper = document.createElement('div');
    closeWrapper.classList.add('info-hotspot-close-wrapper');
    var closeIcon = document.createElement('img');
    closeIcon.src = 'img/close.png';
    closeIcon.classList.add('info-hotspot-close-icon');
    closeWrapper.appendChild(closeIcon);

    // Construct header element.
    header.appendChild(iconWrapper);
    header.appendChild(titleWrapper);
    header.appendChild(closeWrapper);

    // Create text element.
    var text = document.createElement('div');
    text.classList.add('info-hotspot-text');
    text.innerHTML = hotspot.text;

    // Place header and text into wrapper element.
    wrapper.appendChild(header);
    wrapper.appendChild(text);

    // Create a modal for the hotspot content to appear on mobile mode.
    var modal = document.createElement('div');
    modal.innerHTML = wrapper.innerHTML;
    modal.classList.add('info-hotspot-modal');
    document.body.appendChild(modal);

    var toggle = function() {
      wrapper.classList.toggle('visible');
      modal.classList.toggle('visible');
    };

    // Show content when hotspot is clicked.
    wrapper.querySelector('.info-hotspot-header').addEventListener('click', toggle);

    // Hide content when close icon is clicked.
    modal.querySelector('.info-hotspot-close-wrapper').addEventListener('click', toggle);

    // Prevent touch and scroll events from reaching the parent element.
    // This prevents the view control logic from interfering with the hotspot.
    stopTouchAndScrollEventPropagation(wrapper);

    return wrapper;
  }

  // Prevent touch and scroll events from reaching the parent element.
  function stopTouchAndScrollEventPropagation(element, eventList) {
    var eventList = [ 'touchstart', 'touchmove', 'touchend', 'touchcancel',
                      'wheel', 'mousewheel' ];
    for (var i = 0; i < eventList.length; i++) {
      element.addEventListener(eventList[i], function(event) {
        event.stopPropagation();
      });
    }
  }

  // シーンIDに基づいてシーンを検索する関数
  // シーンとは、パノラマビューア内で表示される特定の視点や場所のことを指します。
  // 例えば、ある部屋のパノラマ画像や特定の場所のビューがシーンとなります。
  // この関数は、シーンIDを使って、対応するシーンデータを検索し、返します。
  // シーンIDは、各シーンを一意に識別するための識別子です。
  function findSceneById(id) {
    // scenes配列内の各シーンをループ
    for (var i = 0; i < scenes.length; i++) {
      // シーンのIDが一致する場合、そのシーンを返す
      if (scenes[i].data.id === id) {
        return scenes[i];
      }
    }
    // 一致するシーンが見つからない場合、nullを返す
    return null;
  }

  // シーンIDに基づいてシーンデータを検索する関数
  // この関数は、シーンIDを使って、対応するシーンデータを検索し、返します。
  // シーンIDは、各シーンを一意に識別するための識別子です。
  // シーンデータとは、パノラマビューア内で表示される特定の視点や場所に関する情報を含むオブジェクトです。
  // 例えば、シーンの画像URL、初期ビューのパラメータ、ホットスポットの情報などが含まれます。
  function findSceneDataById(id) {
    // data.scenes配列内の各シーンをループ
    for (var i = 0; i < data.scenes.length; i++) {
      // シーンのIDが一致する場合、そのシーンデータを返す
      if (data.scenes[i].id === id) {
        return data.scenes[i];
      }
    }
    // 一致するシーンが見つからない場合、nullを返す
    return null;
  }

  // data.jsからシーンデータを取得
  var cameras = data.scenes.map(function(scene) {
    return {
        id: scene.id,
        mapX: scene.mapX, // data.jsで定義されたmapX
        mapY: scene.mapY,  // data.jsで定義されたmapY
        mapZ: scene.mapZ
    };
  });

  // 地図にすべてのカメラをプロット
  addCamerasToMap(cameras);

  // 必要な変数の宣言
  var map;
  var currentIcon;
  var imageWidth;
  var imageHeight;
  var imageName;

  function updateIconRotation(camera, yaw) {
    if (camera && camera.z_vector) {
        var globalYawOffset = Math.atan2(camera.z_vector[0], -camera.z_vector[2]);
        var totalYaw = yaw + globalYawOffset;
        currentIcon.style.transform = 'translate(-50%, -50%) rotate(' + totalYaw + 'rad)';
    }
  }

  function switchScene(scene, options = {}) {
    const { fromSelectBox = false } = options;
    // 現在のシーンを取得
    var currentScene = scenes.find(function(s) {
        return s.scene === viewer.scene();
    });

    if (currentScene) {
        // 現在のシーンのz_vectorとy_vectorを取得
        var currentCamera = data.scenes.find(function(scene) {
            return scene.id === currentScene.data.id;
        });

        // 新しいシーンのz_vectorとy_vectorを取得
        var nextCamera = scene.data

        if (currentCamera && nextCamera) {
            // グローバルYawオフセットの計算
            var theta_x1 = Math.atan2(currentCamera.z_vector[0], -currentCamera.z_vector[2]);
            var theta_x2 = Math.atan2(nextCamera.z_vector[0], -nextCamera.z_vector[2]);
            var yaw = viewer.view().yaw();  // 現在のYaw角度
            var new_yaw = yaw + theta_x1 - theta_x2;

            // グローバルPitchオフセットの計算
            var theta_y1 = Math.atan2(currentCamera.y_vector[1], -currentCamera.y_vector[2]);
            var theta_y2 = Math.atan2(nextCamera.y_vector[1], -nextCamera.y_vector[2]);
            var pitch = viewer.view().pitch();  // 現在のPitch角度
            var new_pitch = pitch + theta_y1 - theta_y2;

            // 新しいシーンに移行
            scene.view.setParameters({ yaw: new_yaw, pitch: new_pitch });
        }
    }

    // 古いSVGを削除
    var oldSvg = document.getElementById("polygonSvg");
    if (oldSvg) {
        oldSvg.remove();
    }

    // scene切り替え
    scene.scene.switchTo();

  // セレクトボックスを空白へ戻すのは、fromSelectBoxがfalseの場合のみ
    if (!fromSelectBox) {
      var itemSelectElement = document.getElementById("itemSelect");
      if (itemSelectElement) {
        itemSelectElement.value = "";
        console.log("シーン移動に伴いセレクトボックスを空白に戻しました");
      }
    }

    var camera = cameras.find(function(cam) {
        return cam.id === scene.data.id;
    });

    // カメラアイコン位置更新
    if (camera) {
        var x = camera.mapX * 100 + '%';
        var y = camera.mapY * 100 + '%';
        updateCurrentIcon(x, y);
    }

    // カメラアイコン方向更新
    if (nextCamera) {
      var camera = data.scenes.find(function(scene) {
          return scene.id === currentScene.data.id;
      });
      updateIconRotation(camera, yaw);
    }

    // 新しいシーンの画像名を取���
    var currentImageName 


    // アノテーションを読み込んで描画する
    imageWidth  = scene.data.imageWidth;   // data.jsから取得した元画像の横解像度
    imageHeight = scene.data.imageHeight;  // data.jsから取得した元画像の縦解像度
    imageName   = scene.data.name;         // data.jsから取得した元画像の画像名
    loadAnnotationsFromJSON(imageWidth, imageHeight, imageName);
  }

  // 現在表示中の画像アイコンを更新する関数
  function updateCurrentIcon(x, y) {
    if (currentIcon) {
      currentIcon.style.left = x;
      currentIcon.style.top = y;
      currentIcon.style.transform = 'translate(-50%, -50%)';  // 中心を合わせる
    }
  }

  // 左上？の地図にすべてのカメラをプロット　***TODO：Z座標を使ってカメラのアイコンを変える***
  function addCamerasToMap(cameras) {
    // 地図要素を取得
    map = document.getElementById('map');
    // 現在のカメラ位置を示すアイコンを作成
    currentIcon = document.createElement('img');

    // 各カメラに対して処理を行う
    cameras.forEach(function(camera) {
      // 地図上のポイントを示す要素を作成
      // documentは、現在のウェブページを表すオブジェクトで、HTML要素の作成や操作を��うために使用されます。
      // 地図上にカメラの位置を示すためのポイント要素を作成
      var point = document.createElement('div');
      point.classList.add('map-point');

      // カメラの相対的な座標を設定
      // varは変数を宣言するためのキーワードです。JavaScriptでは、varを使って変数を宣言すると、その変数は関数スコープを持ちます。
      // ここでは、カメラのmapXとmapYの位置をパーセンテージで表現し、地図上の位置を指定しています。
      // 100を掛けることで、0から1の範囲の値を0%から100%の範囲に変換しています。
      // 例えば、mapXが0.5の場合、xは50%になります。これにより、地図上の位置を相対的に指定することができます。
      var x = camera.mapX * 100 + '%';  // カメラのmapX位置をマップに対応させる
      var y = camera.mapY * 100 + '%';  // カメラのmapY位置をマップに対応させる
      point.style.left = x;
      point.style.top = y;
      point.style.transform = 'translate(-50%, -50%)';  // マーカーの中心を指定された座標に合わせる

      // mapZの値で色を切り替え
      if (camera.mapZ <= upper_lower_border_z) {
        point.style.backgroundColor = 'blue';
      } else {
        point.style.backgroundColor = 'red';
      }

      // クリックイベントを追加してシーン遷移を実装
      point.addEventListener('click', function() {
        var targetScene = findSceneById(camera.id);  // シーンIDでシーンを見つける
        switchScene(targetScene);  // シーンを切り替える
      });

      // 地図にポイントを追加
      map.appendChild(point);

      // 現在表示中の画像アイコンを設定
      if (camera.id === scenes[0].data.id) {  // 初期シーンと比較
        currentIcon.src = 'img/current-icon.png';  // 新しいアイコンのパス
        currentIcon.classList.add('current-icon');
        currentIcon.style.width = '40px';  // アイコンの幅を設定
        currentIcon.style.height = '40px';  // アイコンの高さを設定
        currentIcon.style.position = 'absolute';
        currentIcon.style.left = x;
        currentIcon.style.top = y;
        currentIcon.style.transform = 'translate(-50%, -50%)';  // 中心を合わせる
        currentIcon.style.zIndex = '9999';// 異様に大きいz-indexを追加して前面に表示
        map.appendChild(currentIcon);
      }
    });

    viewer.addEventListener('viewChange', function() {
      var yaw = viewer.view().yaw();  // ビューアーの現在のYaw角を取得
  
      // 現在のシーンデータを取得
      var currentScene = scenes.find(function(s) {
          return s.scene === viewer.scene();
      });
  
      if (currentScene) {
          var camera = data.scenes.find(function(scene) {
              return scene.id === currentScene.data.id;
          });
  
          // アイコンの回転を更新
          updateIconRotation(camera, yaw);
      }
    });  
  }

  // JSONからアノテーションを読み込んで描画する関数
  var annotationHotspots = [];  // アノテーションごとのホットスポットを保存するリスト

  function loadAnnotationsFromJSON(imageWidth, imageHeight, currentImageName) {
    fetch(`bridge1_20241103/annotations/annotations.json?folder=${bridge_folder}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load annotations.json');
        }
        return response.json();
      })
      .then(data => {
        // 以前のアノテーションをクリア
        annotationHotspots = [];
  
        // 現在の画像名に対応するアノテーションだけ抽出
        const sceneAnnotations = data.annotations.filter(
          annotation => annotation.imageName === currentImageName
        );
  
        // [1] まず各アノテーションを読み込んで annotationHotspots に push する
        sceneAnnotations.forEach((annotation) => {
          var annotationVertices = [];
  
          // 頂点ごとにホットスポットを作成
          annotation.vertices.forEach(vertex => {
            var yaw = (vertex.x / imageWidth) * 2 * Math.PI - Math.PI;
            var pitch = -(Math.PI / 2 - (vertex.y / imageHeight) * Math.PI);
  
            var element = createAnnotationElement(annotation.label);
            var hotspot = viewer.scene().hotspotContainer().createHotspot(element, {
              yaw: yaw, 
              pitch: pitch
            });
            annotationVertices.push(hotspot);
          });
  
          annotationHotspots.push({
            hotspots: annotationVertices,
            info: annotation.info,
            label: annotation.label,
            id: annotation.id,
            member: annotation.member,
            color: annotation.color
          });
        });
  
        // [2] 全アノテーションの追加が終わった「あとで」多角形を一括描画
       annotationHotspots.forEach((ann) => {
          updatePolygonFromHotspots(
            ann.hotspots, 
            ann.id, 
            ann.label, 
            ann.info, 
            ann.member, 
            ann.color
          );
      });
      })
      .catch(error => {
        console.error('Error loading annotations:', error);
      });
  }
  



  // アノテーションの表示要素を作成
  function createAnnotationElement(label) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('annotation-hotspot');

    // ホットスポットの中心を基準にする
    wrapper.style.position = 'absolute';
    wrapper.style.transform = 'translate(-50%, -50%)';

    // ラベルの要素を作成
    var labelElement = document.createElement('div');
    labelElement.classList.add('annotation-label');
    labelElement.innerText = label;
    wrapper.appendChild(labelElement);

    return wrapper;
  }

  // ホットスポットの画面座標を取得する関数
  function getHotspotScreenPosition(hotspot) {
    var rect = hotspot.domElement().getBoundingClientRect();

    // 無効な座標の場合、nullを返してスキップ
    if (rect.width === 0 || rect.height === 0 || isNaN(rect.left) || isNaN(rect.top)) {
        return null;
    }

    // 原点 (0, 0) であれば無効としてスキップ
    if (rect.left === 0 && rect.top === 0) {
        return null;
    }

    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
  }

  // SVGに多角形を描画する関数
  function drawPolygon(hotspotPositions, polygonId, annotationLabel, annotationInfo, annotationMember, annotationColor) {
    var svgNamespace = "http://www.w3.org/2000/svg";
    var svg = document.getElementById("polygonSvg");

    if (!svg) {
        svg = document.createElementNS(svgNamespace, "svg");
        svg.setAttribute("id", "polygonSvg");
        svg.setAttribute("style", "position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;");
        document.body.appendChild(svg);
    }

    // 該当する多角形が既に存在する場合は削除
    var polygon = document.getElementById(polygonId);
    if (polygon) {
        polygon.remove();
    }

    // 新しいポリゴンを作成
    polygon = document.createElementNS(svgNamespace, "polygon");
    polygon.setAttribute("id", polygonId);

    // ラベルに基づいて色を設定
    var strokeColor = getAnnotationColor(annotationColor, annotationLabel);
    polygon.setAttribute("stroke", strokeColor); // ラベルに基づいた色を設定
    polygon.setAttribute("stroke-width", "2");
    polygon.setAttribute("fill", "none");
    polygon.setAttribute("pointer-events", "all");
    svg.appendChild(polygon);

    // ポップアップを表示するクリックイベントを追加
    //polygon.addEventListener("click", function() {
    //    showAnnotationPopup(annotationLabel, annotationInfo, polygonId, annotationMember, annotationColor);
    //});
    document.addEventListener('click', onGlobalClickForAnnotations);

    // ��角形の頂点を更新
    var points = hotspotPositions.map(pos => `${pos.x},${pos.y}`).join(" ");
    polygon.setAttribute("points", points);
}

function onGlobalClickForAnnotations(e) {
  // 1) 追加モード / 編集モード中はスキップしたい（重ならないかつ既存ロジックと干渉しないように）
  if (addingLayer !== null) {
    // 「新規アノテーション追加モード」中ならスキップ
    return;
  }
  if (editLayer !== null) {
    // 「編集モード」中ならスキップ
    return;
  }

  // 2) クリック座標を取得
  const x = e.clientX;
  const y = e.clientY;

  // 3) その座標にある要素を上から順に全部取得
  const elements = document.elementsFromPoint(x, y);
  // → 例: ["polygon#annotation_ABC", "polygon#annotation_XYZ", "DIV", "BODY", ...]

  // 「前面コンテナとして無効にしたいID」の一覧
  const frontContainerIds = [
    "map-container",
    "documentSelectorContainer",
    "itemSelector",
  ];

    // 前面コンテナが1つでもあれば、ポリゴン処理を無視してreturn する
  // （elementsFromPointの先頭〜末尾の中に、上記IDの要素があれば behind とみなす）
  const isBehindFrontContainer = elements.some(el => {
    return el.id && frontContainerIds.includes(el.id);
  });
  if (isBehindFrontContainer) {
    // つまり「地図やコンテナなどに隠れているクリック」 → 何もせずreturn
    return;
  }

  const icons = elements.filter(el =>
    el.classList && el.classList.contains('link-hotspot')
  );

  // 4) polygon 要素だけ抜き出す
  const polygons = elements.filter(el => el.tagName && el.tagName.toLowerCase() === 'polygon');

  // クリック座標にポリゴンが一つもなければ何もしない
  if (polygons.length === 0 && icons.length === 0) {
    // どちらも無ければ何もしない
    return;
  }
  const totalItems = polygons.length + icons.length;

  // 5) polygon の id が "annotation_123" のように対応するアノテーションIDになっているはず
  //    それを配列にする
  //const annotationIds = polygons.map(p => p.getAttribute("id"));
  // 例: ["annotation_101", "annotation_102"] など
/*
  // 6) 重なっている polygon が1つなら、従来どおり1つだけポップアップ
  if (annotationIds.length === 1) {
    const singleId = annotationIds[0];
    const annData = findAnnotationData(singleId); // 後述のヘルパー関数
    if (annData) {
      showAnnotationPopup(
        annData.label, 
        annData.info, 
        annData.id, 
        annData.member, 
        annData.color
      );
    }
    return;
  }

  // 7) 複数ある場合 → ユーザーに選択させる or 一覧表示
  console.log("重複しているannotationIds:", annotationIds);
  showMultiAnnotationSelectDialog(annotationIds);*/
  if (totalItems === 1) {
    // 1つだけ → そのまま処理
    if (polygons.length === 1) {
      // クリックしたのは polygon 1枚
      const polygonId = polygons[0];
      handleSinglePolygonClick(polygonId);
    } else {
      // クリックしたのは アイコン 1個
      handleIconClick(icons[0]);
    }
  } else {
    // 2つ以上 → 選択ダイアログを出す
    showMultiObjectSelectDialog(polygons, icons);
  }
}

/**
 * 単一ポリゴン(アノテーション)をクリックしたときの処理
 * @param {HTMLElement} polygonEl クリックされた polygon 要素
 */
function handleSinglePolygonClick(polygonEl) {
  // polygon の id が "annotation_xxx" になっている想定
  const polygonId = polygonEl.getAttribute("id");
  console.log("handleSinglePolygonClick - polygonId:", polygonId);

  // アノテーション情報を取得 (既にある findAnnotationData を利用)
  const annData = findAnnotationData(polygonId);
  if (!annData) {
    console.warn("該当アノテーションが見つからない:", polygonId);
    return;
  }

  // 既存の showAnnotationPopup を呼び出してポップアップを表示
  showAnnotationPopup(
    annData.label,
    annData.info,
    annData.id,
    annData.member,
    annData.color
  );
}

/**
 * アイコン(link-hotspot)をクリックしたときの処理
 * @param {HTMLElement} iconEl クリックされたアイコン要素 or 親の wrapper
 */
function handleIconClick(iconEl) {
  console.log("handleIconClick is called, element:", iconEl);

  // もし wrapper.dataset.target にシーンIDが入っているなら、それを取得する
  // （事前に createLinkHotspotElement 内で仕込む想定: wrapper.dataset.target = hotspot.target; など）
  const targetSceneId = iconEl.dataset.target;  // 例えば "scene_1" など

  if (!targetSceneId) {
    console.warn("アイコン要素に data-target が無いため、シーンを判別できません。");
    return;
  }

  // 既存の findSceneById でシーンを取得
  const targetScene = findSceneById(targetSceneId);
  if (!targetScene) {
    console.warn("handleIconClick: 該当のシーンが見つかりません:", targetSceneId);
    return;
  }

  // シーン切り替え (既存の switchScene を呼び出す)
  switchScene(targetScene);
  console.log("シーンを切り替えました:", targetSceneId);
}
function showMultiObjectSelectDialog(polygons, icons) {
  // polygons[]: [polygon要素1, polygon要素2, ...]
  // icons[]   : [icon要素1, icon要素2, ...]

  // 既存の overlay, modal を作る手順は流用
  const overlay = document.createElement("div");
  overlay.id = "multiAnnOverlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: "9999",
  });
  document.body.appendChild(overlay);

  const modal = document.createElement("div");
  modal.id = "multiAnnModal";
  Object.assign(modal.style, {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "#e0fff5",
    color: "#333",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
    width: "300px",
    maxWidth: "80%",
    zIndex: "10000",
    cursor: "move",
  });
  overlay.appendChild(modal);

  makeDraggable(modal);

    // ▼ オーバーレイのクリックを止める
    overlay.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  
    // ▼ モーダル自身のクリックも止める
    modal.addEventListener("click", (e) => {
      e.stopPropagation();
    });

  const title = document.createElement("h3");
  title.textContent = "重複アイテムの選択";
  modal.appendChild(title);

  const ul = document.createElement("ul");
  ul.style.listStyle = "none";
  ul.style.padding = "0";
  ul.style.margin = "0 0 15px";
  modal.appendChild(ul);

  // ▼ polygons のほうを先に追加
  polygons.forEach((poly) => {
    const ann = findAnnotationData(poly.id); // 例: annotationHotspots.find(...)
    if (!ann) return;
    const li = document.createElement("li");
    li.style.margin = "6px 0";
    li.style.cursor = "pointer";
    li.style.padding = "8px 10px";
    li.style.border = "1px solid #ccc";
    li.style.borderRadius = "4px";
    li.style.backgroundColor = "#ebffff";
    li.textContent = `[アノテーション] ${ann.member}：${ann.label}`;

    li.addEventListener("click", () => {
      // ポリゴンのポップアップを開く
      showAnnotationPopup(ann.label, ann.info, ann.id, ann.member, ann.color);
      overlay.remove();
    });
    ul.appendChild(li);
  });

  // ▼ icons のほうを追加
  icons.forEach((iconElem) => {
    // もしアイコンにも「対象シーンID」や「ラベル」があるなら取得
    // 例: iconElem から dataset を参照するとか
    const label = iconElem.dataset.label || "未設定アイコン";
    const li = document.createElement("li");
    li.style.margin = "6px 0";
    li.style.cursor = "pointer";
    li.style.padding = "8px 10px";
    li.style.border = "1px solid #ccc";
    li.style.borderRadius = "4px";
    li.style.backgroundColor = "#ebffff";
    li.textContent = `[視点移動]`;//`[視点移動] ${label}`

    li.addEventListener("click", () => {
      // 本来アイコンをクリックしたときに行う処理
      // 例: シーン切り替えなど
      handleIconClick(iconElem);

      overlay.remove();
    });
    ul.appendChild(li);
  });

  // キャンセルボタン
  const buttonContainer = document.createElement("div");
  buttonContainer.style.textAlign = "right";
  modal.appendChild(buttonContainer);

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "キャンセル";
  cancelBtn.addEventListener("click", () => {
    overlay.remove();
  });
  buttonContainer.appendChild(cancelBtn);
}



// 例：annotationHotspots は [ { id, label, member, info, color, ... }, ... ] が入っている
function findAnnotationData(annotationId) {
  return annotationHotspots.find(ann => ann.id === annotationId);
}

/**
 * 重複しているPolygon(アノテーション)をモーダルダイアログで選択する
 */
function showMultiAnnotationSelectDialog(annotationIds) {
  // 既に表示中のモーダルがあれば削除
  const existingModal = document.getElementById("multiAnnModal");
  if (existingModal) {
    existingModal.remove();
  }

  // モーダルの背景 (半透明オーバーレイ)
  const overlay = document.createElement("div");
  overlay.id = "multiAnnOverlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: "9999",    // 最前面になるように
  });
  document.body.appendChild(overlay);

  // モーダル本体
  const modal = document.createElement("div");
  modal.id = "multiAnnModal";
  Object.assign(modal.style, {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    // ======= 色の変更部分 =======
    backgroundColor: "#e0fff5",  // 薄いエメラルドグリーン系
    color: "#333",
    // ============================
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
    width: "300px",
    maxWidth: "80%",   // 画面が小さいとき
    zIndex: "10000",
    cursor: "move"     // マウスを乗せた時、「移動できそう」感を出す
  });
  overlay.appendChild(modal);

  makeDraggable(modal);

  // タイトル
  const title = document.createElement("h3");
  title.textContent = "アノテーション選択";
  title.style.marginTop = "0";
  title.style.color = "#333";  // 少しだけ濃い字に
  modal.appendChild(title);

  // 選択肢リスト(UL)
  const ul = document.createElement("ul");
  ul.style.listStyle = "none";
  ul.style.padding = "0";
  ul.style.margin = "0 0 15px";  // タイトルとの間やボタンとの間に余白
  modal.appendChild(ul);

  // IDリスト(annotationIds)を使ってLIを生成
  annotationIds.forEach((id) => {
    // ここで、annotationの情報(ラベルや部材など)を取得
    const ann = findAnnotationData(id); // 例: 事前に定義したヘルパー

    // LI要素
    const li = document.createElement("li");
    li.style.margin = "6px 0";
    li.style.cursor = "pointer";
    li.style.padding = "8px 10px";
    li.style.border = "1px solid #ccc";
    li.style.borderRadius = "4px";
    li.style.backgroundColor = "#ebffff"; // 水色系
    li.style.color = "#333";

    // 表示内容（部材 + 状態など）
    const text = `${ann.member}：${ann.label}`;
    li.textContent = text;

    // マウスホバー時の色変化など
    li.addEventListener("mouseover", () => {
      li.style.backgroundColor = "#dffefe";
    });
    li.addEventListener("mouseout", () => {
      li.style.backgroundColor = "#ebffff";
    });

    // 選択（クリック）したとき
    li.addEventListener("click", () => {
      // 選択したIDの詳細をポップアップ
      showAnnotationPopup(
        ann.label,
        ann.info,
        ann.id,
        ann.member,
        ann.color
      );

      // モーダルを閉じる
      overlay.remove();
    });

    ul.appendChild(li);
  });

  // ボタンコンテナ：複数ボタンを横並びに配置したい場合などに
  const buttonContainer = document.createElement("div");
  buttonContainer.style.textAlign = "right";  // ボタンを右寄せ
  modal.appendChild(buttonContainer);

  // キャンセルボタン
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "キャンセル";
  Object.assign(cancelBtn.style, {
    marginTop: "10px",
    padding: "6px 12px",
    backgroundColor: "#ccffd5",  // 薄い黄緑
    color: "#333",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  });
  cancelBtn.addEventListener("mouseover", () => {
    cancelBtn.style.backgroundColor = "#b8ffc2";  // マウスオーバー時
  });
  cancelBtn.addEventListener("mouseout", () => {
    cancelBtn.style.backgroundColor = "#ccffd5";  // マウスアウト時
  });
  cancelBtn.addEventListener("click", () => {
    overlay.remove(); // キャンセル時、モーダルを閉じる
  });
  buttonContainer.appendChild(cancelBtn);
}

/**
 * 要素elemをドラッグで移動可能にする関数
 */
function makeDraggable(elem) {
  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;

  // mousedown でドラッグ開始
  elem.addEventListener("mousedown", (event) => {
    isDragging = true;
    // カーソル位置と要素の左上位置との差分を記憶
    const rect = elem.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;

    // 要素が最前面に来るようにzIndexを調整したいならここでできる
    elem.style.zIndex = "10001"; 
  });

  // mousemove で位置更新
  document.addEventListener("mousemove", (event) => {
    if (!isDragging) return;
    // 要素の位置を更新
    let newLeft = event.clientX - offsetX;
    let newTop  = event.clientY - offsetY;

    // 例: 画面外にはみ出ないようにしたいなら、境界チェックする
    // if (newLeft < 0) newLeft = 0;
    // if (newTop < 0) newTop = 0;
    // if (newLeft + elem.offsetWidth > window.innerWidth)
    //   newLeft = window.innerWidth - elem.offsetWidth;
    // ... etc

    elem.style.left = newLeft + "px";
    elem.style.top  = newTop + "px";
    // transform: translate(-50%, -50%) は一旦無効化されるので上書き
    elem.style.transform = "none";
  });

  // mouseup でドラッグ終了
  document.addEventListener("mouseup", () => {
    isDragging = false;
    // zIndexを戻すなど
    // elem.style.zIndex = "10000";
  });
}


function getAnnotationColor(color, label) {
  if (color !== null && color !== undefined) {
    // color が指定されていればそれを使う
    return color;
  } else {
    // color が null/undefined ならラベルに従う
    return getColorByLabel(label);
  }
}

function getColorByLabel(label) {
    const colors = {
        "鉄筋露出": "red",
        "鋼材腐食": "blue",
        "ひび割れ": "green"
    };
    return colors[label] || "red"; // デフォルトは黒
}


  // JSONからのホットスポットを使って多角形を描画
  function updatePolygonFromHotspots(hotspots, polygonId, annotationLabel, annotationInfo, annotationMember, annotationColor) {
      // 既存の特定のpolygon要素を削除
      var oldPolygon = document.getElementById(polygonId);
      if (oldPolygon) {
          oldPolygon.remove();  // 古いポリゴンのみ削除
      }
      
    var hotspotPositions = hotspots.map(hotspot => getHotspotScreenPosition(hotspot))
                                  .filter(pos => pos !== null);

    if (hotspotPositions.length === 0) return;

    drawPolygon(hotspotPositions, polygonId, annotationLabel, annotationInfo, annotationMember, annotationColor);
  }

  viewer.addEventListener('viewChange', function() {
    // 各アノテーションに固有のIDを割り当てて多角形を描画
    annotationHotspots.forEach((annotation) => {
      // polygonIdにannotationIdをそのまま使う
      updatePolygonFromHotspots(annotation.hotspots, annotation.id, annotation.label, annotation.info, annotation.member, annotation.color);
    });
  });

  function showAnnotationPopup(annotationLabel, annotationInfo, polygonId, annotationMember, annotationColor) {
    var popup = document.getElementById("annotationPopup");
  
    // もしポップアップが存在しなければ作成
    if (!popup) {
      popup = document.createElement("div");
      popup.setAttribute("id", "annotationPopup");
      popup.setAttribute("style", `
        position: absolute; 
        background-color: white; 
        border: 1px solid black; 
        padding: 20px; 
        z-index: 1000; 
        border-radius: 10px; 
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        /* 横方向にはみ出す場合にスクロールや折り返しを優先 */
        overflow-x: hidden;
      `);
      document.body.appendChild(popup);
    }

    makeDraggable(popup);
  
    // ポップアップ内容をクリア
    popup.innerHTML = '';

    // タイトルと編集モードをまとめるコンテナ
    const titleBar = document.createElement("div");
    titleBar.setAttribute("style", `
      display: flex;
      justify-content: space-between; /* 左右に分ける */
      align-items: center;           /* 垂直方向で中央揃え */
      margin-bottom: 10px;          /* 下に余白を確保 */
    `);
    popup.appendChild(titleBar);

    // 左側: タイトル
    const title = document.createElement("h4");
    title.textContent = "　";//最初は詳細情報って書いてたけど，なんか名前が気に入らなくてただの全角スペースに．これをなくすと編集モードってやつが下に食い込んでしまう（CSSで制御しろよ）
    title.setAttribute("style", `
      margin: 0; 
      font-size: 18px;
    `);
    titleBar.appendChild(title);

  // 右側: トグルスイッチ（編集モード切り替え）
  const toggleContainer = document.createElement("div");
  toggleContainer.setAttribute("style", `
    display: flex;
    align-items: center;
  `);

  // 「編集モード」ラベル
  const editModeLabel = document.createElement("span");
  editModeLabel.textContent = "編集モード";
  editModeLabel.setAttribute("style", `
    font-size: 12px;
    margin-right: 10px; /* トグルスイッチとの間に余白 */
  `);
  toggleContainer.appendChild(editModeLabel);

  // トグルスイッチ本体
  const toggleSwitch = document.createElement("label");
  toggleSwitch.setAttribute("class", "toggle-switch");
  toggleSwitch.setAttribute("style", `
    position: relative;
    display: inline-block;
    width: 50px;
    height: 24px;
  `);

  const toggleInput = document.createElement("input");
  toggleInput.type = "checkbox";
  toggleInput.checked = false; // デフォルトは OFF
  toggleInput.setAttribute("style", `
    opacity: 0;
    width: 0;
    height: 0;
  `);

  const toggleSlider = document.createElement("span");
  toggleSlider.setAttribute("style", `
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc; /* デフォルトはグレー */
    transition: 0.4s;
    border-radius: 24px;
  `);

  // スライダー内の円
  toggleSlider.style.setProperty("before", `
    content: "";
    position: absolute;
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  `);

  toggleSwitch.appendChild(toggleInput);
  toggleSwitch.appendChild(toggleSlider);
  toggleContainer.appendChild(toggleSwitch);
  titleBar.appendChild(toggleContainer);
  
      // member用のinputを追加
      // ラベルとインプットを横並びにするコンテナ
    var memberContainer = document.createElement("div");
    memberContainer.setAttribute("style", `
      display: flex;
      align-items: center;
      margin-bottom: 10px;
    `);

    var memberLabel = document.createElement("div");
    memberLabel.textContent = "位置・部材等：";
    memberLabel.setAttribute("style", `
      margin-right: 5px; 
      font-weight: bold;
      white-space: nowrap;
    `);
    memberContainer.appendChild(memberLabel);

    var memberInput = document.createElement("input");
    memberInput.type = "text";
    memberInput.value = annotationMember;
    memberInput.setAttribute("style", `
      flex: 1;
      padding: 8px;
      box-sizing: border-box;
      border-radius: 5px;
      border: 1px solid #ccc;
    `);

    var memberText = document.createElement("div");
    memberText.textContent = annotationMember;
    memberText.setAttribute("style", "flex:1;");
  
    memberContainer.appendChild(memberInput);
    memberContainer.appendChild(memberText);
    popup.appendChild(memberContainer);

  // label用：状態・損傷等：
  var labelContainer = document.createElement("div");
  labelContainer.setAttribute("style", `
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  `);

  var stateLabel = document.createElement("div");
  stateLabel.textContent = "状態・損傷等：";
  stateLabel.setAttribute("style", `
    margin-right: 5px;
    font-weight: bold;
    white-space: nowrap;
  `);
  labelContainer.appendChild(stateLabel);

  var labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.value = annotationLabel;
  labelInput.setAttribute("style", `
    flex: 1; 
    padding: 8px;
    box-sizing: border-box;
    border-radius: 5px;
    border: 1px solid #ccc;
  `);
  var labelText = document.createElement("div");
  labelText.textContent = annotationLabel;
  labelText.setAttribute("style", "flex:1;");

  labelContainer.appendChild(labelInput);
  labelContainer.appendChild(labelText);
  popup.appendChild(labelContainer);

  // info用：詳細情報：
  var infoLabel = document.createElement("div");
  infoLabel.textContent = "詳細情報：";
  infoLabel.setAttribute("style", `
    margin-bottom: 5px;
    font-weight: bold;
  `);
  popup.appendChild(infoLabel);

  var infoTextarea = document.createElement("textarea");
  infoTextarea.textContent = annotationInfo;
  infoTextarea.setAttribute("style", `
    width: 100%; 
    height: 80px; 
    margin-bottom: 15px; 
    padding: 8px;
    box-sizing: border-box;
    border-radius: 5px;
    border: 1px solid #ccc;
  `);
  var infoText = document.createElement("div");
  infoText.textContent = annotationInfo;
  infoText.setAttribute("style", `
    margin-bottom: 15px;
    max-height: 100px;
    overflow-y: auto;
    border: 1px solid #ccc;
    border-radius: 5px;
    padding: 8px;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
  `);

  popup.appendChild(infoTextarea);
  popup.appendChild(infoText);

  const colorContainer = document.createElement("div");
  colorContainer.setAttribute("style", `
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  `);

  const colorLabel = document.createElement("div");
  colorLabel.textContent = "線の色：";
  colorLabel.setAttribute("style", `
    font-weight: bold;
    margin-right: 8px; 
    white-space: nowrap;
  `);

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  // annotationColorがあれば表示、無ければデフォルト(#000000など)
  //colorInput.value = annotationColor ? annotationColor : "#000000";
  colorInput.value = (annotationColor !== undefined && annotationColor !== null && annotationColor !== "")
    ? annotationColor
    : "#FF0000";
  colorContainer.appendChild(colorLabel);
  colorContainer.appendChild(colorInput);
  popup.appendChild(colorContainer);

  // --- デフォルト色チェックボックスを追加 ---
  const defaultColorDiv = document.createElement("div");
  defaultColorDiv.style.display = "flex";
  defaultColorDiv.style.alignItems = "center";
  colorContainer.appendChild(defaultColorDiv);

  const defaultColorCheckbox = document.createElement("input");
  defaultColorCheckbox.type = "checkbox";
  defaultColorCheckbox.style.marginLeft = "10px";
  defaultColorDiv.appendChild(defaultColorCheckbox);

  const defaultColorLabel = document.createElement("label");
  defaultColorLabel.textContent = "デフォルト色を使用する";
  defaultColorLabel.style.marginLeft = "5px";
  defaultColorDiv.appendChild(defaultColorLabel);

  
    // ボタンコンテナを作成してボタンを整列
    var buttonContainer = document.createElement("div");
    buttonContainer.setAttribute("style", `
      display: flex; 
      justify-content: space-between;
    `);
    popup.appendChild(buttonContainer);
  
    // 保存ボタンを作成
    var saveButton = document.createElement("button");
    saveButton.textContent = "保存";
    saveButton.setAttribute("style", `
      background-color: #4CAF50;
      color: white;
      padding: 8px 12px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    `);
    saveButton.addEventListener("click", function() {
      // 変更内容を反映
      const finalColor = defaultColorCheckbox.checked ? null : colorInput.value;
      const updatedAnnotation = { 
          label: labelInput.value,
          info: infoTextarea.value,
          member: memberInput.value,
          id: polygonId,  // Idを保持
          color: finalColor
      };
  
      // JSONファイルを更新
      updateAnnotationInJSON(updatedAnnotation)
        .then(() => {
          // JSONファイルを再読み込みして、最新のアノテーション情報を反映
          loadAnnotationsFromJSON(imageWidth, imageHeight, imageName);
          
          // ポップアップを閉じる
          popup.style.display = "none";
        })
        .catch(error => {
          console.error('Error during saving:', error);
        });
    });
    buttonContainer.appendChild(saveButton);
  
    // 閉じるボタン
    var closeButton = document.createElement("button");
    closeButton.textContent = "閉じる";
    closeButton.setAttribute("style", `
      background-color: #f44336;
      color: white;
      padding: 8px 12px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    `);
    closeButton.addEventListener("click", function() {
        popup.style.display = "none";
    });
    buttonContainer.appendChild(closeButton);

    // === 削除ボタン ===
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "削除";
    Object.assign(deleteButton.style, {
      backgroundColor: "#555",
      color: "white",
      padding: "8px 12px",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
      display: "none"
    });
    // 削除ボタンクリック → annotations.jsonから削除するフロー
    deleteButton.addEventListener("click", function() {
      // 確認ダイアログを出す例
      if (!confirm("本当に削除しますか？")) {
        return;
      }
      // 削除リクエストを送る
      deleteAnnotation(polygonId)
        .then(() => {
          console.log("アノテーション削除が完了しました");
          popup.style.display = "none";
          // 最新データ再読み込み
          loadAnnotationsFromJSON(imageWidth, imageHeight, imageName);
        })
        .catch(err => {
          console.error("Error deleting annotation:", err);
        });
    });
    buttonContainer.appendChild(deleteButton);

    function deleteAnnotation(annotationId) {
      console.log("deleteAnnotation called for ID:", annotationId);
      // /delete-annotation という新エンドポイントに DELETE リクエストを送る
      // あるいは POST + 特別なパラメータでも可
      return fetch(`/delete-annotation?folder=${bridge_folder}&id=${annotationId}`, {
        method: 'DELETE'
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(errData => {
            console.error("Error data from server:", errData);
            throw new Error("Failed to delete annotation");
          });
        }
        return response.json();
      })
      .then(data => {
        console.log("Annotation deleted on server:", data);
        initialize();
        const oldSvg = document.getElementById("polygonSvg");
if (oldSvg) {
          oldSvg.remove();
        }
        return data;
      });
    }
    

    // 編集モード切り替え関数
    function updateEditMode(isEditing) {
      if (isEditing) {
        // 編集モードON: input, textarea表示 / テキスト非表示 / 保存ボタン有効
        memberInput.style.display = '';
        labelInput.style.display = '';
        infoTextarea.style.display = '';
        memberText.style.display = 'none';
        labelText.style.display = 'none';
        infoText.style.display = 'none';
        saveButton.style.display = '';
        colorContainer.style.display = '';
        deleteButton.style.display = '';
      } else {
        // 編集モードOFF: input, textarea非表示 / テキスト表示 / 保存ボタン無効化または非表示
        memberInput.style.display = 'none';
        labelInput.style.display = 'none';
        infoTextarea.style.display = 'none';
        memberText.style.display = '';
        labelText.style.display = '';
        infoText.style.display = '';
        saveButton.style.display = 'none';
        colorContainer.style.display = 'none';
        deleteButton.style.display = 'none';
      }
    }
  
    // 初期状態で OFF にする
    updateEditMode(toggleInput.checked);

    // トグルスイッチの変更イベント
    toggleInput.addEventListener('change', function() {
      updateEditMode(this.checked);
      toggleSlider.style.backgroundColor = this.checked ? "#15eb36" : "#ccc";
    });
  

  
    // ポップアップを表示する位置を設定
    popup.style.left = `50%`;  
    popup.style.top = `70%`;   
    popup.style.transform = `translate(-50%, -50%)`;
  
    // ポップアップを表示
    popup.style.display = "block";
  }
  

  // ダイアログ要素を作成
  function createEditConfirmationDialog(polygonId) {
    // ダイアログが既に存在していたら削除
    const existingDialog = document.getElementById('editDialog');
    if (existingDialog) {
        existingDialog.remove();
    }

    //const polyID = event.target.id;
    //if (polyId.startsWith("annotation_new_")) {
    if (polygonId.startsWith("annotation_new_")) {
      // これは新規だから編集モードダイアログは出さない
      // かわりに新規用のポップアップを出す or 何もしない
      return;
    }

    // ダイアログのHTMLを作成
    const dialog = document.createElement('div');
    dialog.setAttribute('id', 'editDialog');
    dialog.setAttribute('style', `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: white;
        border: 1px solid black;
        padding: 20px;
        text-align: center;  /* テキストを中央に表示 */
        width: 300px;  /* ダイアログの幅を設定 */
        z-index: 10000;
    `);

    const message = document.createElement('p');
    message.textContent = '編集モードに切り替えますか？';
    message.setAttribute('style', `
        color: black; 
        font-size: 16px;
        margin-bottom: 20px;  /* テキスト下に余白を追加 */
    `);

    const yesButton = document.createElement('button');
    yesButton.textContent = 'はい';
    yesButton.setAttribute('style', 'margin-right: 10px;');  // ボタン間に余白を追加
    yesButton.addEventListener('click', function() {
        enableEditMode(polygonId);
        dialog.remove();  // ダイアログを閉じる
    });

    const noButton = document.createElement('button');
    noButton.textContent = 'いいえ';
    noButton.addEventListener('click', function() {
        dialog.remove();  // ダイアログを閉じる
    });

    // ボタンをダイアログに追加
    dialog.appendChild(message);
    dialog.appendChild(yesButton);
    dialog.appendChild(noButton);

    document.body.appendChild(dialog);
  }

// 右クリック時にポップアップを表示する処理
document.addEventListener('contextmenu', function(event) {
  event.preventDefault();  // デフォルトの右クリックメニューを無効化
  event.stopPropagation(); // イベントの伝播を防ぐ

  // クリックした要素がpolygonか確認
  if (event.target.tagName.toLowerCase() === 'polygon') {
    const polygonId = event.target.id;
    // 新規ポリゴンかどうか判定
    if (polygonId.startsWith('annotation_new_')) {
      // 新規のため「編集モードに切り替えますか？」ダイアログは不要
      console.log("新規のポリゴンなので編集モードダイアログはスキップ");
      return;
    }
      // 右クリックされた場所にポップアップを表示
    createEditConfirmationDialog(event.target.id, event.clientX, event.clientY);
  } else {
      console.log(`右クリックされた要素: ${event.target.tagName}`);
  }
});

let editLayer = null;
let editingPoints = [];
let selectedPolygon = null;


// 編集モードに切り替える関数
function enableEditMode(polygonId) {

  // 元のSVGを非表示にする
  console.log(`編集モード移行時のポリゴンID:`, polygonId);
  selectedPolygon = document.getElementById(polygonId);  // グローバル変数に代入
  selectedPolygon.style.display = 'none';

  // ---- (A) ここで 「情報追加」ボタンを隠す ----
  const addAnnotationBtn = document.getElementById("addAnnotationBtn");
  if (addAnnotationBtn) {
    addAnnotationBtn.style.display = "none";
  }

  const itemSelector = document.getElementById("itemSelector");
  if (itemSelector) {
    itemSelector.style.display = "none";
  }
  const docContainer = document.getElementById("documentSelectorContainer");
  if (docContainer) {
    //docContainer.style.display = "none";
    docContainer.classList.add('hidden');
  }
  // 編集用レイヤを作成
  console.log('Creating edit layer...');
  editLayer = document.createElement('div');
  editLayer.setAttribute('id', 'editLayer');
  editLayer.setAttribute('style', `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 500;
  `);
  document.body.appendChild(editLayer);

  // ポリラインを描画するためのSVGを作成
  const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgElement.setAttribute('id', 'editPolylineLayer');
  svgElement.setAttribute('style', `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 400;  // ポイントより後ろに表示
  `);
  document.body.appendChild(svgElement);

  // 元の多角形の形状をコピーし、編集用の点と線を作成
  const points = selectedPolygon.getAttribute('points').split(' ');
  
  points.forEach((point, index) => {
      const [x, y] = point.split(',');
      createEditablePoint(x, y, index);
  });

  // 初期ポリラインを描画
  drawPolyline();  // ポイントを作成した後にすぐに描画

  // 地図を非表示にする
  const mapContainer = document.getElementById('map-container');
  if (mapContainer) {
      console.log('Hiding map during edit mode.');
      mapContainer.style.display = 'none';  // 地図を非表示にする
  }

  // 「編集終了」ボタンを作成
  createEditEndButton();

  // ビューアーのパン、ズームを無効化する
  viewer.controls().disable();
}

  // 編集可能な点を作成する関数
function createEditablePoint(x, y, index) {
  const point = document.createElement('div');
  point.classList.add('editable-point');
  point.setAttribute('style', `
      position: absolute;
      width: 10px;
      height: 10px;
      background-color: red;
      border-radius: 50%;
      cursor: pointer;
      left: ${x}px;
      top: ${y}px;
  `);

  point.style.transform = 'translate(-50%, -50%)';
  
  point.setAttribute('data-index', index);

  // ドラッグ可能なイベントを設定
  point.addEventListener('mousedown', function(event) {
      startDraggingPoint(event, point);
  });

  editLayer.appendChild(point);
  editingPoints.push(point);

  // ドラッグが終わったら線を更新するためのイベント
  point.addEventListener('mouseup', () => {
    drawPolyline();  // ドラッグ後に線を更新
  });

}

  // ドラッグ開始のイベントハンドラ
  function startDraggingPoint(event, point) {
    // 現在のポイント位置を取得
    const initialX = event.clientX;
    const initialY = event.clientY;

    // ポイントの現在の left, top 値を取得
    const startLeft = parseInt(point.style.left, 10);
    const startTop = parseInt(point.style.top, 10);

    const onMouseMove = (moveEvent) => {
        // マウスの移動量を計算
        const deltaX = moveEvent.clientX - initialX;
        const deltaY = moveEvent.clientY - initialY;

        // 新しい位置を計算
        const newX = startLeft + deltaX;
        const newY = startTop + deltaY;

        // ポイントの位置を更新
        point.style.left = `${newX}px`;
        point.style.top = `${newY}px`;
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }




  // ポリゴンを描画する関数
  function drawPolyline() {
    const svgElement = document.getElementById('editPolylineLayer');

    // 既存のポリゴンを削除して新たに描画
    while (svgElement.firstChild) {
        svgElement.removeChild(svgElement.firstChild);
    }

    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("fill", "none");
    polygon.setAttribute("stroke", "blue");
    polygon.setAttribute("stroke-width", "2");

    const pointsArray = editingPoints.map(point => {
        const x = parseInt(point.style.left, 10);
        const y = parseInt(point.style.top, 10);
        return `${x},${y}`;
    });

    // polygonにpoints属性をセット
    polygon.setAttribute("points", pointsArray.join(' '));
    svgElement.appendChild(polygon);
  }




  // 編集モード終了時に呼び出される関数
  function disableEditMode() {
    // 編集レイヤを削除
    if (editLayer) {
        document.body.removeChild(editLayer);
        editLayer = null;
    }

    // 編集用のSVGレイヤも削除
    const svgElement = document.getElementById('editPolylineLayer');
    if (svgElement) {
        console.log('Removing edit polyline layer.');
        document.body.removeChild(svgElement);  // SVG要素を削除
    }

    // ビューアーのパン、ズームを再有効化
    viewer.controls().enable();

      // ---- (B) 編集終了後に「情報追加」ボタンを再表示する ----
    const addAnnotationBtn = document.getElementById("addAnnotationBtn");
    if (addAnnotationBtn) {
      addAnnotationBtn.style.display = "block";
    }

    // 画面上の座標を取得し、Yaw/Pitchを使ってエクイレクタングラー画像のピクセル座標に変換
    const jsonPoints = editingPoints.map(point => {
      const screenX = parseInt(point.style.left, 10);
      const screenY = parseInt(point.style.top, 10);

      // 画面座標からYaw, Pitchを取得
      const { yaw, pitch } = getYawPitchFromScreenPosition(screenX, screenY);

      // Yaw, Pitchからピクセル座標に変換
      const { pixelX, pixelY } = convertYawPitchToPixels(yaw, -pitch, imageWidth, imageHeight);

      // ピクセル座標を四捨五入して整数に変換
      return { 
        x: Math.round(pixelX), 
        y: Math.round(pixelY) 
      };  // JSON用の形式
    });

    // 編集終了後に地図を再表示する
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
        console.log('Re-displaying map after edit mode.');
        mapContainer.style.display = 'block';  // 地図を再表示
    }

    // #itemSelect と #documentSelect を再表示
    const itemSelector = document.getElementById("itemSelector");
    if (itemSelector) {
      itemSelector.style.display = "block";
    }
    const docContainer = document.getElementById("documentSelectorContainer");
    if (docContainer) {
      //docContainer.style.display = "block";
      docContainer.classList.remove('hidden');
    }

    // 編集終了後のUIをクリア
    const endButton = document.getElementById('editEndButton');
    if (endButton) {
        endButton.remove();  // ボタンを削除
    }

    // 更新されたデータをJSONに反映し、その後アノテーションを再読み込みして再描画
    updateJSONFile(jsonPoints)
        .then(() => {          
            loadAnnotationsFromJSON(imageWidth, imageHeight, imageName);
        })
        .then(() => {
            // ポリゴン情報と編集ポイントをリセット
            selectedPolygon = null;
            editingPoints = [];
        })
        .catch(error => {
            console.error('Error during editing:', error);
        });
  }

  function getAnnotationById(id) {
    return fetch(`bridge1_20241103/bridge1_20241103/annotations/annotations.json?folder=${bridge_folder}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load annotations.json');
        }
        return response.json();
      })
      .then(data => {
        return data.annotations.find(annotation => annotation.id === id);
      });
  }




  function getYawPitchFromScreenPosition(screenX, screenY) {
    const view = viewer.view();
    const coords = view.screenToCoordinates({ x: screenX, y: screenY });
    return { yaw: coords.yaw, pitch: coords.pitch };
  }

  function convertYawPitchToPixels(yaw, pitch, imageWidth, imageHeight) {
      const pixelX = (yaw + Math.PI) / (2 * Math.PI) * imageWidth;
      const pixelY = (Math.PI / 2 - pitch) / Math.PI * imageHeight;
      return { pixelX, pixelY };
  }

  // JSONファイルの座標値を更新する関数
  function updateJSONFile(newPoints) {
    const updatedPolygonData = {
        id: selectedPolygon.id,
        points: newPoints
    };

    console.log('Sending updated polygon data:', updatedPolygonData);  // ログで送信データを確認

    return fetch(`/save-annotations?folder=${bridge_folder}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedPolygonData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to save data');
        }
        return response.text();
    })
    .then(data => {
        console.log('Server response:', data);
    })
    .catch(error => {
        console.error('Error saving JSON:', error);
    });
  }


  // JSONファイルのinfoとlabelを更新する関数
  function updateAnnotationInJSON(updatedAnnotation) {
    return fetch(`/save-annotations?folder=${bridge_folder}`, {  // 必ず return する
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedAnnotation)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to save annotation');
        }
        return response.json();  // テキストではなく、JSONでレスポンスを取得
    })
    .then(data => {
        console.log("Annotation updated successfully", data);
        return data;  // ここでもデータを返すようにする
    })
    .catch(error => {
        console.error('Error updating annotation:', error);
        throw error;  // エラーも再度 throw して上位でキャッチできるようにする
    });
  }

  function createEditEndButton() {
    const button = document.createElement('button');
    button.textContent = '編集終了';
    button.setAttribute('id', 'editEndButton');  // ボタンにIDを設定
    button.setAttribute('style', `
        position: fixed;
        top: 10px;
        right: 10px;
        background-color: red;
        color: white;
        padding: 10px;
        z-index: 1000;
    `);
    button.addEventListener('click', function() {
        disableEditMode();  // 編集モード終了関数を呼び出す
    });
    document.body.appendChild(button);
  }

  const captureDateContainer = document.getElementById('captureDateContainer');
  if (captureDateContainer) {
    captureDateContainer.textContent = captureDateText;
  }
  setMapBackgroundIfExists(bridge_folder);

  // Display the initial scene.
  switchScene(scenes[0]);

})();