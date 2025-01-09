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

(function() {
  // Marzipanoライブラリを取得
  var Marzipano = window.Marzipano;
  // ブラウザ情報を取得するためのbowserライブラリを取得
  var bowser = window.bowser;
  // フルスクリーン操作を行うためのscreenfullライブラリを取得
  var screenfull = window.screenfull;
  // アプリケーションデータを取得
  var data = window.APP_DATA;

  // DOMから要素を取得
  // パノラマ表示用の要素を取得
  var panoElement = document.querySelector('#pano');
  // フルスクリーン切り替えボタンの要素を取得
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');

  // Detect desktop or mobile mode.
  // window.matchMediaが利用可能かどうかを確認
  if (window.matchMedia) {
    // デバイスのモード（デスクトップまたはモバイル）を設定する関数
    var setMode = function() {
      // mql.matchesがtrueの場合、モバイルモードに設定
      if (mql.matches) {
        document.body.classList.remove('desktop');
        document.body.classList.add('mobile');
      } else {
        // mql.matchesがfalseの場合、デスクトップモードに設定
        document.body.classList.remove('mobile');
        document.body.classList.add('desktop');
      }
    };
    // メディアクエリリストを作成
    // 画面の幅が500px以下、または高さが500px以下の場合にマッチ．これ，mqlの下にあるのに大丈夫なの？→JavaScriptでは可読性は別として問題ないらしい
    var mql = matchMedia("(max-width: 500px), (max-height: 500px)");
    // 初回のモード設定を実行
    setMode();
    // メディアクエリリストにリスナーを追加し、条件が変わったときにsetModeを実行
    mql.addListener(setMode);
  } else {
    // window.matchMediaが利用できない場合、デフォルトでデスクトップモードに設定
    document.body.classList.add('desktop');
  }

  // Detect whether we are on a touch device.
  // 初期状態として、タッチデバイスではないことを示すクラスを追加
  document.body.classList.add('no-touch');
  
  // タッチイベントが発生したときのリスナーを追加
  window.addEventListener('touchstart', function() {
    // タッチデバイスではないことを示すクラスを削除
    document.body.classList.remove('no-touch');
    // タッチデバイスであることを示すクラスを追加
    document.body.classList.add('touch');
  });
  });

  // Viewer options.
  // ビューアのオプションを設定
  var viewerOpts = {
    controls: {
      // マウスビューのモードを設定
      mouseViewMode: data.settings.mouseViewMode
    }
  };

  // Initialize viewer.
  // Marzipano.Viewerのインスタンスを作成し、panoElementとviewerOptsを渡す
  // panoElement: パノラマビューアを表示するHTML要素
  // viewerOpts: ビューアの設定オプション
  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);

  // シーンを作成する
  var scenes = data.scenes.map(function(data) {
    // Equirectangular画像のパスを指定してソースを作成
    var source = Marzipano.ImageUrlSource.fromString(data.imageUrl); 
    // 画像の解像度を指定してジオメトリを作成：ここは合わせたほうがいいよね．
    var geometry = new Marzipano.EquirectGeometry([{ width: 6720 }]); 

    // ビューの制限を設定し、視野角を指定
    // traditionalメソッドを使用して、RectilinearViewの制限を設定
    // data.faceSize: 画像のフェイスサイズ（ピクセル単位）
    // 100*Math.PI/180: 最小視野角（ラジアン単位） - ここでは100度をラジアンに変換
    // 120*Math.PI/180: 最大視野角（ラジアン単位） - ここでは120度をラジアンに変換
    var limiter = Marzipano.RectilinearView.limit.traditional(data.faceSize, 100*Math.PI/180, 120*Math.PI/180);
    // 初期ビューのパラメータと制限を使用してビューを作成
    var view = new Marzipano.RectilinearView(data.initialViewParameters, limiter);

    // シーンを作成し、ソース、ジオメトリ、ビューを設定
    var scene = viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: true // 最初のレベルを固定
    });

    // リンクホットスポットを作成
    // リンクホットスポットとは、パノラマビュー内で他のシーンに移動するためのインタラクティブな要素です。
    // yaw（ヨー）とpitch（ピッチ）は、ホットスポットの位置を指定するための角度です。
    // yawは水平角度（左右の回転）を表し、pitchは垂直角度（上下の回転）を表します。
    //多分yaw, pitchはdata.jsで定義されているもの？
    data.linkHotspots.forEach(function(hotspot) {
      // ホットスポット要素を作成
      var element = createLinkHotspotElement(hotspot);
      // ホットスポットをシーンに追加し、yawとpitchを指定
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // インフォホットスポットを作成
    // インフォホットスポットとは、パノラマビュー内で追加情報を表示するためのインタラクティブな要素です。
    // 例えば、特定の場所に関する説明や画像、リンクなどを表示することができます。
    // yaw（ヨー）とpitch（ピッチ）は、ホットスポットの位置を指定するための角度です。
    // yawは水平角度（左右の回転）を表し、pitchは垂直角度（上下の回転）を表します。
    // インフォホットスポットは、ユーザーが特定のポイントに関する詳細情報を得るための便利な手段です。
    // infoHotspots配列内の各ホットスポットに対して処理を行う
    data.infoHotspots.forEach(function(hotspot) {
      // ホットスポット要素を作成
      var element = createInfoHotspotElement(hotspot);
      // ホットスポットをシーンに追加し、yawとpitchを指定
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // シーン情報を返す
    return {
      data: data,  // シーンデータ
      scene: scene,  // 作成されたシーン
      view: view  // シーンのビュー
    };
  });

  // フルスクリーンモードを設定（サポートされている場合）
  if (typeof screenfull !== 'undefined' && screenfull.enabled && data.settings.fullscreenButton) {
    // フルスクリーンが有効な場合、bodyに'fullscreen-enabled'クラスを追加
    document.body.classList.add('fullscreen-enabled');
    
    // フルスクリーン切り替えボタンにクリックイベントを追加
    fullscreenToggleElement.addEventListener('click', function() {
      screenfull.toggle(); // フルスクリーンの切り替え
    });

    // フルスクリーン状態が変わったときのイベントリスナーを追加
    screenfull.on('change', function() {
      if (screenfull.isFullscreen) {
        // フルスクリーンが有効になった場合、ボタンに'enabled'クラスを追加
        fullscreenToggleElement.classList.add('enabled');
      } else {
        // フルスクリーンが無効になった場合、ボタンから'enabled'クラスを削除
        fullscreenToggleElement.classList.remove('enabled');
      }
    });
  } else {
    // フルスクリーンがサポートされていない場合、bodyに'fullscreen-disabled'クラスを追加
    document.body.classList.add('fullscreen-disabled');
  }
  

  // ビューコントロール用のDOM要素を取得
  // DOM要素とは、HTMLドキュメント内の各要素を表すオブジェクトです。
  // これにより、JavaScriptからHTML要素を操作することができます。
  // 例えば、特定のボタンや画像、テキストなどを取得し、動的に変更することが可能です。
  // 各方向（上、下、左、右、ズームイン、ズームアウト）に対応する要素を取得
  var viewUpElement = document.querySelector('#viewUp');
  var viewDownElement = document.querySelector('#viewDown');
  var viewLeftElement = document.querySelector('#viewLeft');
  var viewRightElement = document.querySelector('#viewRight');
  var viewInElement = document.querySelector('#viewIn');
  var viewOutElement = document.querySelector('#viewOut');

  // コントロールの動的パラメータを設定
  // velocityは移動速度、frictionは摩擦を表す
  var velocity = 0.7;
  var friction = 3;

  // ビューコントロールを要素に関連付ける
  // MarzipanoのElementPressControlMethodを使用して、各方向の動作を登録
  var controls = viewer.controls();
  controls.registerMethod('upElement',    new Marzipano.ElementPressControlMethod(viewUpElement,     'y', -velocity, friction), true);
  controls.registerMethod('downElement',  new Marzipano.ElementPressControlMethod(viewDownElement,   'y',  velocity, friction), true);
  controls.registerMethod('leftElement',  new Marzipano.ElementPressControlMethod(viewLeftElement,   'x', -velocity, friction), true);
  controls.registerMethod('rightElement', new Marzipano.ElementPressControlMethod(viewRightElement,  'x',  velocity, friction), true);
  controls.registerMethod('inElement',    new Marzipano.ElementPressControlMethod(viewInElement,  'zoom', -velocity, friction), true);
  controls.registerMethod('outElement',   new Marzipano.ElementPressControlMethod(viewOutElement, 'zoom',  velocity, friction), true);

  // 文字列をサニタイズする関数
  // 特殊文字をHTMLエンティティに置き換えることで、XSS攻撃を防ぐ
  function sanitize(s) {
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;');
  }

  // シーンを切り替える関数
  // 新しいシーンの初期ビュー設定を適用し、シーンを切り替える
  function switchScene(scene) {
    scene.view.setParameters(scene.data.initialViewParameters);
    scene.scene.switchTo();
  }

  function createLinkHotspotElement(hotspot) {

    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('link-hotspot');

    // Create image element.
    var icon = document.createElement('img');
    icon.src = 'img/link.png';
    icon.classList.add('link-hotspot-icon');

    // Set rotation transform.
    var transformProperties = [ '-ms-transform', '-webkit-transform', 'transform' ];
    for (var i = 0; i < transformProperties.length; i++) {
      var property = transformProperties[i];
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
    var tooltip = document.createElement('div');
    tooltip.classList.add('hotspot-tooltip');
    tooltip.classList.add('link-hotspot-tooltip');
    tooltip.innerHTML = findSceneDataById(hotspot.target).name;

    wrapper.appendChild(icon);
    wrapper.appendChild(tooltip);

    return wrapper;
  }

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

  function findSceneById(id) {
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].data.id === id) {
        return scenes[i];
      }
    }
    return null;
  }

  function findSceneDataById(id) {
    for (var i = 0; i < data.scenes.length; i++) {
      if (data.scenes[i].id === id) {
        return data.scenes[i];
      }
    }
    return null;
  }

  // data.jsからシーンデータを取得
  var cameras = data.scenes.map(function(scene) {
    return {
        id: scene.id,
        mapX: scene.mapX, // data.jsで定義されたmapX
        mapY: scene.mapY  // data.jsで定義されたmapY
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

  function switchScene(scene) {
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

    // 新しいシーンの画像名を取得
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

  // 地図にすべてのカメラをプロット
  function addCamerasToMap(cameras) {
    map = document.getElementById('map');
    currentIcon = document.createElement('img');

    cameras.forEach(function(camera) {
      var point = document.createElement('div');
      point.classList.add('map-point');

      // 相対的な座標を設定
      var x = camera.mapX * 100 + '%';  // カメラのmapX位置をマップに対応させる
      var y = camera.mapY * 100 + '%';  // カメラのmapY位置をマップに対応させる
      point.style.left = x;
      point.style.top = y;
      point.style.transform = 'translate(-50%, -50%)';  // マーカーの中心を指定された座標に合わせる


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
    // JSONファイルをサーバーから取得
    fetch('bridge1_20241103/annotations/annotations.json')
      .then(response => {
          if (!response.ok) {
              throw new Error('Failed to load annotations.json');
          }
          return response.json();
      })
      .then(data => {
          // 以前のアノテーションデータをクリア
          annotationHotspots = [];

          // 現在の画像名に対応するアノテーションのみフィルタリング
          const sceneAnnotations = data.annotations.filter(annotation => annotation.imageName === currentImageName);

          sceneAnnotations.forEach((annotation, index) => {
              var annotationVertices = [];

              annotation.vertices.forEach(vertex => {
                  var yaw = (vertex.x / imageWidth) * 2 * Math.PI - Math.PI;
                  var pitch = -(Math.PI / 2 - (vertex.y / imageHeight) * Math.PI);

                  var element = createAnnotationElement(annotation.label);

                  // ホットスポットを作成
                  var hotspot = viewer.scene().hotspotContainer().createHotspot(element, { yaw: yaw, pitch: pitch });

                  // 各アノテーションの頂点リストにホットスポットを追加
                  annotationVertices.push(hotspot);
              });

              // アノテーションごとのホットスポットリストを保存
              annotationHotspots.push({
                  hotspots: annotationVertices,
                  info: annotation.info,  // infoを保存
                  label: annotation.label,  // labelを保存
                  id: annotation.id,  // idを保存
              });

              // 各アノテーションに固有のIDを割り当てて多角形を描画
              annotationHotspots.forEach((annotation) => {
                // polygonIdにannotationIdをそのまま使う
                updatePolygonFromHotspots(annotation.hotspots, annotation.id, annotation.label, annotation.info);
              });
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
  function drawPolygon(hotspotPositions, polygonId, annotationLabel, annotationInfo) {
    var svgNamespace = "http://www.w3.org/2000/svg";
    var svg = document.getElementById("polygonSvg");

    if (!svg) {
        svg = document.createElementNS(svgNamespace, "svg");
        svg.setAttribute("id", "polygonSvg");
        svg.setAttribute("style", "position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;");
        document.body.appendChild(svg);
    }

    // 該当する多角形がすでに存在する場合は更新、存在しない場合は新規作成
    var polygon = document.getElementById(polygonId);
    if (!polygon) {
        polygon = document.createElementNS(svgNamespace, "polygon");
        polygon.setAttribute("id", polygonId);
        polygon.setAttribute("stroke", "blue");
        polygon.setAttribute("stroke-width", "2");
        polygon.setAttribute("fill", "none");
        polygon.setAttribute("pointer-events", "all");
        svg.appendChild(polygon);

        // ポップアップを表示するクリックイベントを追加
        polygon.addEventListener("click", function() {
          showAnnotationPopup(annotationLabel, annotationInfo, polygonId);
      });
    
    }

    // 多角形の頂点を更新
    var points = hotspotPositions.map(pos => `${pos.x},${pos.y}`).join(" ");
    polygon.setAttribute("points", points);
  }

  // JSONからのホットスポットを使って多角形を描画
  function updatePolygonFromHotspots(hotspots, polygonId, annotationLabel, annotationInfo) {
      // 既存の特定のpolygon要素を削除
      var oldPolygon = document.getElementById(polygonId);
      if (oldPolygon) {
          oldPolygon.remove();  // 古いポリゴンのみ削除
      }
      
    var hotspotPositions = hotspots.map(hotspot => getHotspotScreenPosition(hotspot))
                                  .filter(pos => pos !== null);

    if (hotspotPositions.length === 0) return;

    drawPolygon(hotspotPositions, polygonId, annotationLabel, annotationInfo);
  }

  viewer.addEventListener('viewChange', function() {
    // 各アノテーションに固有のIDを割り当てて多角形を描画
    annotationHotspots.forEach((annotation) => {
      // polygonIdにannotationIdをそのまま使う
      updatePolygonFromHotspots(annotation.hotspots, annotation.id, annotation.label, annotation.info);
    });
  });

  function showAnnotationPopup(annotationLabel, annotationInfo, polygonId) {
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
        width: 300px;
      `);
      document.body.appendChild(popup);
    }
  
    // ポップアップの内容をクリア
    popup.innerHTML = '';
  
    // タイトルを追加
    var title = document.createElement("h4");
    title.textContent = "詳細情報";
    title.setAttribute("style", `
      margin-bottom: 15px; 
      text-align: center;
      font-size: 18px;
    `);
    popup.appendChild(title);
  
    // ラベルの編集用フィールド
    var labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.value = annotationLabel;
    labelInput.setAttribute("style", `
      width: 100%; 
      margin-bottom: 10px; 
      padding: 8px;
      box-sizing: border-box;
      border-radius: 5px;
      border: 1px solid #ccc;
    `);
    popup.appendChild(labelInput);
  
    // infoの編集用フィールド
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
    popup.appendChild(infoTextarea);
  
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
      const updatedAnnotation = { 
          label: labelInput.value,
          info: infoTextarea.value,
          id: polygonId  // Idを保持
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
  
    // ポップアップを表示する位置を設定
    popup.style.left = `50%`;  
    popup.style.top = `50%`;   
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

    return fetch('/save-annotations', {
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
    return fetch('/save-annotations', {  // 必ず return する
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
  // Display the initial scene.
  switchScene(scenes[0]);

})();