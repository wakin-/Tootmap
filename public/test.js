tootMap.params_test = function() {
    var params_lat = tootMap.params.lat;
    var params_lng = tootMap.params.lng;
    var params_zoom = tootMap.params.zoom;
    var params_tag = tootMap.params.tag;
    // 有効な引数
    tootMap.params.setQuery("?lat=35.35732724707141&lng=136.0492188112214&zoom=13&tag=ビワイチ");
    tootMap.params.all_get();
    tootMap.assert(tootMap.params.lat, 35.35732724707141);
    tootMap.assert(tootMap.params.lng, 136.0492188112214);
    tootMap.assert(tootMap.params.zoom, 13);
    tootMap.assert(tootMap.params.tag, "ビワイチ");
    // 無効な引数
    tootMap.params.setQuery("?lat=3535732724707141&lng=aaaa&zoom=&tag=!#$%");
    tootMap.params.all_get();
    tootMap.assert(tootMap.params.lat, 35.269452);
    tootMap.assert(tootMap.params.lng, 136.067194);
    tootMap.assert(tootMap.params.zoom, 10);
    tootMap.assert(tootMap.params.tag, "biwakomap");
    tootMap.params.lat = params_lat;
    tootMap.params.lng = params_lng;
    tootMap.params.zoom = params_zoom;
    tootMap.params.tag = params_tag;
    tootMap.params.setQuery("?test=t");
    tootMap.params.all_get();
}

tootMap.gmap_test = function() {
    // 初回地図表示
    tootMap.gmap.init();

    return new Promise(function(resolve, reject) {
        var id = setInterval(function() {
            if ($('#MenuButton').length==1) {
                clearInterval(id);

                // 引数無し地図表示
                tootMap.assert(tootMap.gmap.map.getCenter().equals(new  google.maps.LatLng(35.269452, 136.067194)), true);
                tootMap.assert(tootMap.gmap.map.getZoom(), 10);

                // 地図クリック
                google.maps.event.trigger(tootMap.gmap.map, 'click', {
                    stop: null,
                    latLng: new google.maps.LatLng(35.20074480172401, 135.99700927734375)
                });
                tootMap.assert(tootMap.gmap.open_window.content.match(new RegExp("https://"+tootMap.mstdn.domain+"/share\\?text=%0Ahttps%3A%2F%2F"+tootMap.map_domain+"%3Flat%3D35\\.20074480172401%26lng%3D135\.99700927734375%26zoom%3D10%26tag%3D"+tootMap.mstdn.timeline.tag+"%20%23"+tootMap.mstdn.timeline.tag)).length, 1);

                // メニュー表示切り替え
                tootMap.assert($("#map").css("display"), "block");
                tootMap.assert($("#setting").css("display"), "none");

                $('#MenuButton').trigger("click");
                tootMap.assert($("#map").css("display"), "none");
                tootMap.assert($("#setting").css("display"), "block");
                $('#MapButton').trigger("click");
                tootMap.assert($("#map").css("display"), "block");
                tootMap.assert($("#setting").css("display"), "none");

                resolve();
            }
        }, 100);
    });
}

tootMap.modal_test = function(resolve) {
    // 初回アクセス時モーダル表示
    localStorage.clear();
    tootMap.gmap.clearMarkers();
    tootMap.mstdn.timeline.clear();
    tootMap.modalOrNot();
    tootMap.assert($("#login-modal").css("display"), "block");
    // 無効ドメイン入力
    tootMap.assert($("#modal-domain-error").length, 0);
    $("#modal-domain").val("bbb").change();
    tootMap.assert($("#modal-domain-error").length, 1);
    // 有効ドメイン入力
    $("#modal-domain").val("biwakodon.com").change();
    tootMap.assert($("#modal-domain-error").length, 0);
    // 無効タグ入力
    tootMap.assert($("#modal-tag-error").length, 0);
    $("#modal-tag").val("!#$%").change();
    tootMap.assert($("#modal-tag-error").length, 1);
    // 有効タグ入力    
    $("#modal-tag").val("biwakomap").change();
    tootMap.assert($("#modal-tag-error").length, 0);

    // モーダル閉じる
    tootMap.assert($("#loading").css("display"), "none");
    $("#modal-close").trigger("click");

    return new Promise(function(resolve, reject) {
        var id = setInterval(function() {
            if ($("#loading").css("display")=="block") {
                clearInterval(id);

                tootMap.assert($("#login-modal").css("display"), "none");    
                resolve();
            }
        }, 100);
    }).then(function() {
        return new Promise(function(resolve, reject) {
            var id = setInterval(function() {
                if ($("#loading").css("display")=="none") {
                    clearInterval(id);
        
                    // 次回アクセス時モーダル非表示
                    tootMap.gmap.clearMarkers();
                    tootMap.mstdn.timeline.clear();
                    tootMap.modalOrNot();
                    tootMap.assert($("#login-modal").css("display"), "none");
                    
                    resolve();
                }
            }, 100);
        });
    }).then(function() {
        return new Promise(function(resolve, reject) {
            var id = setInterval(function() {
                if ($("#loading").css("display")=="block") {
                    clearInterval(id);

                    resolve();
                }
            }, 100);
        });
    }).then(function() {
        return new Promise(function(resolve, reject) {
            var id = setInterval(function() {
                if ($("#loading").css("display")=="none") {
                    clearInterval(id);

                    resolve();
                }
            }, 100);
        });
    });
}

tootMap.menu_test = function() {
    $('#MenuButton').trigger("click");

//    // 現在位置
//    $('#nowgeo').trigger("click");

    // 無効ドメイン入力
    tootMap.assert($("#domain-error").length, 0);
    $("#domain").val("bbb").change();
    tootMap.assert($("#domain-error").length, 1);
    // 有効ドメイン入力
    $("#domain").val("biwakodon.com").change();

    let marker_count;
    return new Promise(function(resolve, reject) {        
        var id = setInterval(function() {
            if ($("#loading").css("display")=="block") {
                clearInterval(id);
                resolve();
            }
        }, 100);
    }).then(function() {
        return new Promise(function(resolve, reject) {
            var id = setInterval(function() {
                if ($("#loading").css("display")=="none") {
                    clearInterval(id);

                    $('#MenuButton').trigger("click");
                    // 無効タグ入力
                    tootMap.assert($("#tag-error").length, 0);
                    $("#tag").val("!#$%").change();
                    tootMap.assert($("#tag-error").length, 1);
                    // 有効タグ入力    
                    $("#tag").val("biwakomap").change();

                    resolve();
                }
            }, 100);
        });
    }).then(function() {
        return new Promise(function(resolve, reject) {        
            var id = setInterval(function() {
                if ($("#loading").css("display")=="block") {
                    clearInterval(id);

                    resolve();
                }
            }, 100);
        });
    }).then(function() {
        return new Promise(function(resolve, reject) {        
            var id = setInterval(function() {
                if ($("#loading").css("display")=="none") {
                    clearInterval(id);

                    $('#MenuButton').trigger("click");
                    // 過去のトゥート
                    marker_count = tootMap.gmap.markers.length;
                    $("#past-tagtl").trigger("click");

                    resolve();
                }
            }, 100);
        });
    }).then(function() {
        return new Promise(function(resolve, reject) {
            var id = setInterval(function() {
                if ($("#loading").css("display")=="block") {
                    clearInterval(id);

                    resolve();
                }
            }, 100);

        });
    }).then(function() {
        return new Promise(function(resolve, reject) {        
            var id = setInterval(function() {
                if ($("#loading").css("display")=="none") {
                    clearInterval(id);

                    tootMap.assert(marker_count < tootMap.gmap.markers.length, true);

                    resolve();
                }
            }, 100);
        });
    });
}

tootMap.get_test = function() {
    // 初回アクセス時引数あり
    tootMap.params.setQuery("?lat=35.35732724707141&lng=136.0492188112214&zoom=13&tag=ビワイチ");
    tootMap.params.all_get();
    tootMap.mstdn.timeline.setTag(tootMap.params.tag);
    localStorage.clear();
    tootMap.gmap.clearMarkers();
    tootMap.mstdn.timeline.clear();
    tootMap.gmap.init();
    tootMap.modalOrNot();
    $("#modal-close").trigger("click");
/*
    return new Promise(function(resolve, reject) {
        var id = setInterval(function() {
            if ($("#loading").css("display")=="block") {
                clearInterval(id);

                resolve();
            }
        }, 100);
    }).then(function() {
        return new Promise(function(resolve, reject) {
            var id = setInterval(function() {
                if ($("#loading").css("display")=="none") {
                    clearInterval(id);
                    
                    tootMap.assert(tootMap.gmap.now_geo_marker, null);
                    tootMap.assert(tootMap.gmap.map.getZoom(), 13);
                    
                    resolve();
                }
            }, 100);
        });
    });
*/
}

tootMap.assert = function(actual, expected) {
    console.log('.');
    console.assert(actual === expected, '\nact: ' + actual + '\nexp: ' + expected);
}

Promise.resolve().then(
    tootMap.params_test
).then(
    tootMap.gmap_test
).then(
    tootMap.modal_test
//).then(
//    tootMap.menu_test
).then(
    tootMap.get_test
);