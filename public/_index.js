Array.prototype.getLastVal = function (){ return this[this.length -1];}

var tootMap = {
    before_map_domain: "map.biwakodon.com",
    map_domain: "[MAP_DOMAIN]",
    client_name: "Tootmap",
    modal_flg: localStorage.getItem('modal_flg') ? localStorage.getItem('modal_flg') : null,

    // 非同期HTTPリクエスト
    httpRequest: function(url, method, header, data, callback, error) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    callback(this.responseText);
                } else {
                    error(this.responseText);
                }
            }
        }
        xhr.open(method, url, true);
        for (key in header) {
            xhr.setRequestHeader(key, header[key]);            
        }
        xhr.send(JSON.stringify(data));
    },

    // 地図、マーカー、情報ウィンドウの管理
    gmap: {
        map: null,
        markers: [],
        open_window: null,
        display_detail_map: false,
        watch_id: null,
        now_geo_marker: null,

        // 現在位置のマーカを表示する（無ければ無印マーカ）
        displayPositionMarker: function(latLng) {
            just_marker=null;
            for( i=0;i<this.markers.length; i++ ) {
                if(this.markers[i].position.equals(latLng)) {
                    just_marker = this.markers[i];
                    break;
                }
            }
            if (just_marker) {
                google.maps.event.trigger(just_marker, 'click');
            } else {
                new google.maps.Marker({
                    position: this.map.getCenter(),
                    map: this.map,
                    icon: './nowgeo-icon.png'
                });
            }
        },
        // 現在位置をマップ内に表示
        showNowGeo: function() {
            if (navigator.geolocation) {
                this.watch_id = navigator.geolocation.getCurrentPosition(
                    function (pos) {
                        var now_geo = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
                        var zoom = tootMap.gmap.map.zoom < 13 ? 13 : tootMap.gmap.map.zoom;
                        tootMap.gmap.map.setZoom(zoom);
                        tootMap.gmap.map.setCenter(now_geo);
                        tootMap.gmap.showInfoWindow(now_geo, tootMap.gmap.mappingContent(now_geo));
                    },
                    function (error) {
                        var msg;
                        switch( error.code ){
                            case 1: msg = "位置情報の利用が許可されていません"; break;
                            case 2: msg = "位置が判定できません"; break;
                            case 3: msg = "タイムアウトしました"; break;
                        }
                        alert(msg);
                    }
                );
            } else {
                alert("このブラウザではGeolocationが使えません");
            }
        },
        createMarker: function(position, content, icon) {
            content = typeof(content)=="undefined"?null:content;
            icon = typeof(icon)=="undefined"?"./biwakomap-icon.png":icon;
            var marker = new google.maps.Marker({
                position: position,
                map: tootMap.gmap.map,
                icon: {
                    url: icon
                }
            });
            if (content!=null) {
                var info_window = new google.maps.InfoWindow({
                    content: content
                });
                marker.addListener('click', function(e){
                    if (tootMap.gmap.open_window) {
                        tootMap.gmap.open_window.close();
                    }
                    info_window.open(tootMap.gmap.map, marker);
                    tootMap.gmap.open_window = info_window;
                    tootMap.gmap.map.setCenter(marker.position);
                });
            }
            return marker;
        },
        setupMarkers: function(toot_list, bounds_flg, position_flg) {
            toot_list.forEach(function(toot) {
                tootMap.gmap.markers.push(tootMap.gmap.createMarker(toot['position'], toot['innerHTML']));
            });

            if (bounds_flg && this.markers.length) {
                var bounds = new google.maps.LatLngBounds();
                this.markers.forEach(function(marker) {
                    bounds.extend(marker.getPosition());
                });
                this.map.fitBounds(bounds);
            }
            if (position_flg) {
                this.displayPositionMarker(this.map.getCenter());
            }
        },
        clearMarkers: function() {
            this.markers.forEach(function(marker) {
                marker.setMap(null);
            });
            tootMap.gmap.markers = [];
        },
        mappingText: function(latLng) {
            return "https://" + tootMap.map_domain + '?lat=' + latLng.lat() + '&lng=' + latLng.lng()
            + '&zoom=' + tootMap.gmap.map.zoom
            + '&tag=' + tootMap.mstdn.timeline.tag
            + ' #' + tootMap.mstdn.timeline.tag;
        },
        mappingContent: function(latLng) {
            return "<p><a target='_blank' href='"+"https://"+tootMap.mstdn.domain+"/share?text="+encodeURIComponent("\n"+tootMap.gmap.mappingText(latLng))+"'>この位置についてトゥートする</a></p>";
        },
        // 情報ウィンドウの表示
        showInfoWindow: function(latLng, content) {
            if (tootMap.gmap.open_window) {
                tootMap.gmap.open_window.close();
            }
            var info_window=new google.maps.InfoWindow();
            info_window.setContent(content);
            info_window.setPosition(latLng);
            info_window.open(tootMap.gmap.map);
            tootMap.gmap.open_window = info_window;
        },
        setMapType: function() {
            if (tootMap.gmap.display_detail_info) {
                tootMap.gmap.map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
            } else {
                tootMap.gmap.map.setMapTypeId("simple_map");
            }
        },
        init: function() {
            this.map = new google.maps.Map(
                document.getElementById('map'),
                {
                    zoom: tootMap.params.zoom,
                    center: {lat: tootMap.params.lat, lng: tootMap.params.lng},
                    disableDefaultUI: true,
                }
            );
            this.map.mapTypes.set("simple_map", new google.maps.StyledMapType(
                [{
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{
                        visibility: "off"
                    }]
                }],
                {
                    name: "Simple Map"
                })
            );
            tootMap.gmap.map.setMapTypeId("simple_map");

            google.maps.event.addListener(this.map, 'click', function(e) {
                if (tootMap.mstdn_domain!="") {
                    tootMap.gmap.showInfoWindow(e.latLng, tootMap.gmap.mappingContent(e.latLng));
                }
            });

            this.map.controls[google.maps.ControlPosition.LEFT_TOP] = [tootMap.menuDiv()];
            $("body").on("click", "#MenuButton", tootMap.showMenu);
            $("body").on("click", "#MapButton", tootMap.showMap);
        }
    },

    // アカウント情報の管理、トゥートの投稿、タイムラインの管理
    mstdn: {
        domain: localStorage.getItem('mstdn_domain') ? localStorage.getItem('mstdn_domain') : "biwakodon.com",

        setDomain: function(domain) {
            this.domain = domain;
            localStorage.setItem("mstdn_domain", domain);
        },

        timeline: {
            tag: localStorage.getItem('tag') ? localStorage.getItem('tag') : "biwakomap",
            limit: 40,
            max_id: "",
            last_date: "",

            setMaxId: function(max_id) {
                this.max_id = max_id;
            },
            setLastDate: function(last_date) {
                this.last_date = last_date;
                $("#past-tagtl").html("過去のトゥートを取得<br />("+tootMap.getFormatDate(last_date)+"以前)");
            },
            setTag: function(tag) {
                this.tag = tag;
                localStorage.setItem("tag", tag);
            },
            clear: function() {
                this.setMaxId("");
                this.setLastDate("");
            },

            // ポップアップHtmlの作成
            innerHTML: function(toot) {
                var date = (new Date(toot['created_at'])).toLocaleString();
                var attachments_html = "";
                if (toot['media_attachments'].length != '0') {
                    attachments_html = '<div class="status__attachments__inner">';
                    toot['media_attachments'].forEach(function(attachment) {
                        attachments_html += '<div class="media-item">'
                            +'<a style="background-image: url('+attachment['url']+')" target="_blank" rel="noopener" class="u-photo" href="'+attachment['url']+'"></a></div>';
                    });
                    attachments_html += '</div>';
                }
                html = '<div class="activity-stream activity-stream-headless h-entry"><div class="entry entry-center"><div class="detailed-status light">'
                    +'<a class="detailed-status__display-name p-author h-card" rel="noopener" target="_blank" href="'+toot['account']['url']+'">'
                        +'<div><div class="avatar">'
                            +'<img alt="" class="u-photo" src="'+toot['account']['avatar']+'" width="48" height="48">'
                        +'</div></div>'
                        +'<span class="display-name">'
                            +'<strong class="p-name emojify">'+twemoji.parse(toot['account']['display_name'] != '' ? toot['account']['display_name'] : toot['account']['username'])+'</strong>'
                            +'<span>@'+toot['account']['acct']+'</span>'
                        +'</span>'
                        +'</a>'
                    +'<div class="status__content p-name emojify"><div class="e-content" style="display: block; direction: ltr" lang="ja"><p>'+twemoji.parse(toot['content'])+'</p></div></div>'
                    +attachments_html
                    +'<div class="detailed-status__meta">'
                        +'<data class="dt-published" value="'+date+'"></data>'
                        +'<a class="detailed-status__datetime u-url u-uid" rel="noopener" target="_blank" href="'+toot['url']+'"><time class="formatted" datetime="'+toot['created_at']+'" title="'+date+'">'+date+'</time></a>'
                        +'·'
                        +'<span><i class="fa fa-retweet"></i><span>'+toot['reblogs_count']+' Reb</span></span>'
                        +'·'
                        +'<span><i class="fa fa-star"></i><span>'+toot['favourites_count']+' Fav</span></span>'
                        +'·'
                        +'<a class="open-in-web-link" target="_blank" href="'+toot['url']+'">Webで開く</a>'
                    +'</div>'
                +'</div></div></div>';
                return html;
            },
            match: function(content) {
                var match;
                if (match = content.match(new RegExp("("+tootMap.map_domain+"|"+tootMap.before_map_domain+")/\\?lat=(\\d+\.\\d+)&amp;lng=(\\d+\.\\d+)(&amp;zoom=(\\d+))?(&amp;tag=(\\w+))?"))) {
                    match['position'] = {lat: parseFloat(match[2]), lng: parseFloat(match[3])};
                    match['zoom'] = parseInt(match[5]);
                    match['tag'] = match[7];
                }
                return match;
            },
            // タイムラインの取得
            get: function(bounds_flg, position_flg) {
                var url = "https://"+tootMap.mstdn.domain+"/api/v1/timelines/tag/"+encodeURIComponent(tootMap.mstdn.timeline.tag)+"?limit="+tootMap.mstdn.timeline.limit+"&max_id="+tootMap.mstdn.timeline.max_id;
                var method = "GET";
                var header = {};
                var data = {};
                tootMap.httpRequest(url, method, header, data,
                    function(responseText) {
                        var toot_list = [];

                        if (responseText.length == 0) {
                            tootMap.mstdn.timeline.get(bounds_flg, position_flg);
                            return;
                        }

                        var arr = JSON.parse(responseText);
                        arr.forEach(function(toot) {
                            if (match = tootMap.mstdn.timeline.match(toot['content'])) {
                                toot['position'] = match['position'];
                                toot['zoom'] = match['zoom'];
                                toot['tag'] = match['tag'];

                                // 不要な部分を消去
                                $.each($.parseHTML(toot['content']), function(i, p) {$.each(p.children, function(v, e) {
                                    // マップへのリンクを消去
                                    if (e.nodeName == "A" && (e.hostname == tootMap.map_domain || e.hostname == tootMap.before_map_domain)) {
                                        toot['content'] = toot['content'].replace(e.outerHTML, "");
                                    }
                                    // ハッシュタグを消去
                                    if (e.nodeName == "A" && e.className == "mention hashtag" && e.innerText == "#"+tootMap.mstdn.timeline.tag) {
                                        toot['content'] = toot['content'].replace(e.outerHTML, "");
                                    }
                                    // 添付ファイルパスを消去
                                    if (e.nodeName == "A" && e.pathname.match(/^\/media\//)) {
                                        toot['content'] = toot['content'].replace(e.outerHTML, "");
                                    }
                                });});

                                // カスタム絵文字変換
                                if (typeof(toot['emojis'])!="undefined") {
                                    toot['emojis'].forEach(function(emoji) {
                                        var r = new RegExp(":"+emoji['shortcode']+":");
                                        while (toot['content'].match(r)) {
                                            toot['content'] = toot['content'].replace(r, '<img draggable="false" class="emojione" alt="'+emoji['shortcode']+'" title="'+emoji['shortcode']+'" src="'+emoji['url']+'">');
                                        }
                                    });
                                }

                                toot['innerHTML'] = tootMap.mstdn.timeline.innerHTML(toot);

                                toot_list.push(toot);
                            }
                        }
                    );

                    tootMap.gmap.setupMarkers(toot_list, bounds_flg, position_flg);

                    if (arr.length) {
                        var last_toot = arr.getLastVal();
                        tootMap.mstdn.timeline.setMaxId(last_toot['id']);
                        tootMap.mstdn.timeline.setLastDate(last_toot['created_at']);
                    }
        
                    tootMap.hideLoader();
                },
                function(responseText) {
                    alert("タイムラインを取得できませんでした");
                    tootMap.hideLoader();
                });
                tootMap.displayLoader();
            },
        },
    },

    // メニュー領域
    menuDiv: function() {
        var div = document.createElement('div');
        div.index = 1;
        div.innerHTML = "<a class='btn btn-light' id='MenuButton' href='#'><span id='domain-tag'>"+tootMap.mstdn.domain+"#"+tootMap.mstdn.timeline.tag+"</span></a>";
        return div;
    },
    // メニュー初期化
    menuInit: function() {
        $("#tag").val(tootMap.mstdn.timeline.tag);
        $("#domain").val(tootMap.mstdn.domain);
        $('#tagtl').attr("href", "https://"+tootMap.mstdn.domain+"/tags/"+tootMap.mstdn.timeline.tag);
        $("body").on('click', '#nowgeo', function() {
            tootMap.gmap.showNowGeo();
            tootMap.showMap();
        });
        $("body").on('click', '#past-tagtl', function() {
            tootMap.mstdn.timeline.get(false, false);
            tootMap.showMap();
        });
        $("body").on('change', '#domain', function() {
            if (this.value == tootMap.mstdn.domain) {
                return;
            }

            this.value = this.value.replace(/[^0-9a-zA-Z\.\-]/gi, '');

            if (this.value.length > 0) {
                tootMap.mstdn.setDomain(this.value);
                tootMap.refresh(true, false);
                tootMap.showMap();
            } else {
                alert("有効なドメインを入力してください");
                this.value = tootMap.mstdn.domain;
            }
        });
        $("body").on('change', '#tag', function() {
            if (this.value == tootMap.mstdn.tag) {
                return;
            }

            this.value = this.value.replace(/[^\w\u30a0-\u30ff\u3040-\u309f\u30e0-\u9fcf]/gi, '');

            if (this.value.length > 0) {
                tootMap.mstdn.timeline.setTag(this.value);
                tootMap.refresh(true, false);
                tootMap.showMap();
            } else {
                alert("有効なタグを入力してください");
                this.value = tootMap.mstdn.timeline.tag;
            }
        });
    },

    refresh: function(bounds_flg, position_flg) {
        $('#domain-tag').text(tootMap.mstdn.domain+"#"+tootMap.mstdn.timeline.tag);
        $('#tagtl').attr("href", "https://"+tootMap.mstdn.domain+"/tags/"+tootMap.mstdn.timeline.tag);

        tootMap.gmap.clearMarkers();
        tootMap.mstdn.timeline.clear();

        tootMap.mstdn.timeline.get(bounds_flg, position_flg);
    },

    // GET引数
    params: {
        lat: null,
        lng: null,
        zoom: null,
        tag: null,

        _get: function(parameter_name, rule, def_val) {
            def_val = typeof(def_val)=="undefined"?null:def_val;
            var ret = def_val, tmp = [];
            location.search.substr(1).split("&").forEach(function (item) {
                tmp = item.split("=");
                param = decodeURIComponent(tmp[1]);
                if (tmp[0] === parameter_name && (typeof(rule) == "undefined" || rule == null || param.match(rule))) ret = param;
            });
            return ret;
        },
        get: function() {
            this.lat = parseFloat(this._get('lat', /^\d+\.\d+$/, 35.269452));
            this.lng = parseFloat(this._get('lng', /^\d+\.\d+$/, 136.067194));
            this.zoom = parseInt(this._get('zoom', /^\d+$/, 10));
            this.tag = this._get('tag', /^[\w]+/, "biwakomap");
            return this._get('lat')!=null;
        }
    },

    displayLoader: function() {
        $('#loading-bg').height($(window).height()).css('display','block');
        $('#loading').height($(window).height()).css('display','block');
    },
    hideLoader: function() {
        $('#loading-bg').delay(600).fadeOut(300);
        $('#loading').delay(600).fadeOut(300);
    },
    showMenu: function() {
        $("#map").hide();
        $("#setting").show();
    },
    showMap: function() {
        $("#setting").hide();
        $("#map").show();
    },
    // 最終取得トゥートの時間を表示
    getFormatDate: function(date) {
        date = new Date(date);
        if (isNaN(date)) { return ''; }
        var y = date.getFullYear();
        var m = date.getMonth() + 1;
        var d = date.getDate();
        var h = date.getHours();
        var M = date.getMinutes();
        var s = date.getSeconds();

        return y + '/' + m + '/' + d + ' ' + h + ':' + M + ':' + s;
    },

    displayModal: function(callback) {
        $("body").append('<div id="modal-bg"></div>');
        $("#modal-tag").val(tootMap.mstdn.timeline.tag);
        $("#modal-domain").val(tootMap.mstdn.domain);
        tootMap.modalResize();
        $("#modal-bg,#login-modal").fadeIn("slow");
        $(window).resize(tootMap.modalResize);

        $("#modal-bg,#modal-main,#modal-close").click(function(){
            $("#login-modal,#modal-bg").fadeOut("slow",function(){
                $('#modal-bg').remove();
                callback();
            });
        });
        $("body").on('change', '#modal-domain', function() {
            this.value = this.value.replace(/[^0-9a-zA-Z\.\-]/gi, '');
            
            if (this.value.length > 0) {
                tootMap.mstdn.setDomain(this.value);
            } else {
                alert("有効なドメインを入力してください");
                this.value = tootMap.mstdn.domain;
            }
        });
        $("body").on('change', '#modal-tag', function() {
            this.value = this.value.replace(/[^\w\u30a0-\u30ff\u3040-\u309f\u30e0-\u9fcf]/gi, '');
            
            if (this.value.length > 0) {
                tootMap.mstdn.setTag(this.value);
            } else {
                alert("有効なタグを入力してください");
                this.value = tootMap.mstdn.timeline.tag;
            }
        });
    },
    modalResize: function() {
        var w = $(window).width();
        var h = $(window).height();
        var cw = $("#login-modal").outerWidth();
        var ch = $("#login-modal").outerHeight();
        $("#login-modal").css({
            "left": ((w - cw)/2) + "px",
            "top": ((h - ch)/2) + "px"
        });
    },

    initialize: function() {
        var params_flg = this.params.get();
        this.mstdn.timeline.setTag(this.params.tag);
        this.gmap.init();
        if (!this.modal_flg) {
            this.displayModal(function() {
                tootMap.refresh(!params_flg, param_flg);
                tootMap.menuInit();

                localStorage.setItem("modal_flg", 1);
            });
        } else {
            this.mstdn.timeline.get(!params_flg, params_flg);
            this.menuInit();
        }
    }
};