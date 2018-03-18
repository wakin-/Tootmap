Array.prototype.getLastVal = function (){ return this[this.length -1];}

var tootMap = {
    before_map_domain: "map.biwakodon.com",
    map_domain: "[MAP_DOMAIN]",
    client_name: "Tootmap",
    modal_flg: null,
    domain_reg_rule: new RegExp(/^[0-9a-zA-Z\-\.]+\.[0-9a-zA-Z\-]+$/, 'gi'),
    tag_reg_rule: new RegExp(/^[\w\u30a0-\u30ff\u3040-\u309f\u30e0-\u9fcf０-ｚ]+$/, 'gi'),
    tag_autocomplete: localStorage.getItem('tag_autocomplete') ? localStorage.getItem('tag_autocomplete').split(",") : ["biwakomap"],
    tag_autocomplete_select_flg: false,
    tag_autocomplete_open_flg: false,

    setModalFlg: function() {
        this.modal_flg = localStorage.getItem('modal_flg') ? localStorage.getItem('modal_flg') : null;
    },

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
                if (this.now_geo_marker) {
                    this.now_geo_marker.setMap(null);
                    this.now_geo_marker = null;
                }
                google.maps.event.trigger(just_marker, 'click');
            } else {
                this.now_geo_marker = new google.maps.Marker({
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
                        tootMap.gmap.showShareLink(now_geo);
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
            icon = typeof(icon)=="undefined"?"./pin_icon.png":icon;
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
                tootMap.gmap.map.fitBounds(bounds);
            }
            if (position_flg) {
                this.displayPositionMarker(tootMap.gmap.map.getCenter());
            }
        },
        clearMarkers: function() {
            this.markers.forEach(function(marker) {
                marker.setMap(null);
            });
            tootMap.gmap.markers = [];
        },
        showShareLink: function(latlng) {
            tootMap.gmap.getAddress(latlng);
        },
        getAddress: function(latlng) {
            var address = "";
            var geocoder = new google.maps.Geocoder();

            geocoder.geocode({
                latLng: latlng
            }, function(results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    if (results[2].geometry) {
                        address = results[2].formatted_address.replace(/^日本、(〒[-0-9]+ )?/, '');
                    }
                }
                tootMap.gmap.showInfoWindow(latlng, tootMap.gmap.mappingContent(latlng, address));
            });
        },
        mappingText: function(latLng) {
            return "https://" + tootMap.map_domain + '?lat=' + latLng.lat() + '&lng=' + latLng.lng()
            + '&zoom=' + tootMap.gmap.map.zoom
            + '&tag=' + encodeURIComponent(tootMap.mstdn.timeline.tag)
            + '&domain=' + encodeURIComponent(tootMap.mstdn.domain)
            + ' #' + tootMap.mstdn.timeline.tag;
        },
        mappingContent: function(latLng, address) {
            return "<p><a target='_blank' href='"+"https://"+tootMap.mstdn.domain+"/share?text="+encodeURIComponent("\n"+address+" "+tootMap.gmap.mappingText(latLng))+"'>この位置についてトゥートする</a></p>";
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
                    disableDefaultUI: true
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
                    tootMap.gmap.showShareLink(e.latLng);
//                    tootMap.gmap.showInfoWindow(e.latLng, tootMap.gmap.mappingContent(e.latLng));
                }
            });

            this.map.controls[google.maps.ControlPosition.LEFT_TOP].push(tootMap.menuDiv());
            $("body").on("click", "#MenuButton", tootMap.showMenu);
            $("body").on("click", "#MapButton", tootMap.showMap);

            $("body").on("click", ".status__content__spoiler-link", function() {
                if ($(".e-content").css("display")=="none") {
                    $(".e-content").show();
                    $(".status__content__spoiler-link").text("隠す");
                } else {
                    $(".e-content").hide();
                    $(".status__content__spoiler-link").text("もっと見る");
                }
            });
            $("body").on("click", ".media_spoiler", function() {
                $(".media-item").show();
                $(".media_spoiler").hide();
                return false;
            });
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
                $("#past-tagtl").html("過去のトゥート<br />("+tootMap.getFormatDate(last_date)+"以前)");
            },
            setTag: function(tag) {
                this.tag = tag;
                localStorage.setItem("tag", tag);
                if (tootMap.tag_autocomplete.indexOf(tag) == -1) {
                    tootMap.tag_autocomplete.push(tag)
                    localStorage.setItem("tag_autocomplete", tootMap.tag_autocomplete)
                }
            },
            clear: function() {
                this.setMaxId("");
                this.setLastDate("");
            },

            // ポップアップHtmlの作成
            innerHTML: function(toot) {
                var date = (new Date(toot['created_at'])).toLocaleString();
                var attachments_html = "";
                if (toot['media_attachments'].length > 0) {
                    var attach_display = "";
                    var media_spoiler = "";
                    if (toot['sensitive']) {
                        attach_display = "style='display:none;'";
                        media_spoiler = '<div class="media-item media_spoiler"><a style="background-image: url(./spoiler.png)" target="_blank" rel="noopener" class="u-photo" href="#"></a></div>';
                    }
                    attachments_html = '<div class="status__attachments__inner">';
                    toot['media_attachments'].forEach(function(attachment) {
                        attachments_html += '<div class="media-item" '+attach_display+'><a style="background-image: url('+attachment['url']+')" target="_blank" rel="noopener" class="u-photo" href="'+attachment['url']+'"></a></div>';
                    });
                    attachments_html += media_spoiler+'</div>';
                }
                var display = "";
                var spoiler_html  = "";
                if (toot['spoiler_text'].length > 0) {
                    display = "style='display:none;'";
                    spoiler_html = '<p><span class="p-summary">'+twemoji.parse(toot['spoiler_text'])+'</span><a class="status__content__spoiler-link" href="#">もっと見る</a></p>';
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
                    +'<div class="status__content p-name emojify">'
                        +spoiler_html
                        +'<div class="e-content" '+display+'><p>'+twemoji.parse(toot['content'])+'</p></div>'
                    +'</div>'
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
                if (match = content.match(new RegExp("("+tootMap.map_domain+"|"+tootMap.before_map_domain+")/?\\?lat=(\\d+\.\\d+)&amp;lng=(\\d+\.\\d+)(&amp;zoom=(\\d+))?(&amp;tag=(\\w+))?(&amp;domain=(\\w+))?"))) {
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
            var match = this.value.match(tootMap.domain_reg_rule);
            if (match) {
                tootMap.mstdn.setDomain(match[0]);
                tootMap.refresh(true, false);
                tootMap.showMap();
                $("#domain-error").remove();
            } else {
                if ($("#domain-error").length==0) {
                    $("#domain").after("<br /><span id='domain-error'>有効なドメインを入力してください</span>");
                }
            }
        });
        $("body").on('change', '#tag', function() {
            if (tootMap.tag_autocomplete_open_flg) {
                $("#tag").autocomplete("close")
            }
            var match = this.value.match(tootMap.tag_reg_rule);
            if (match) {
                tootMap.mstdn.timeline.setTag(match[0]);
                tootMap.refresh(true, false);
                tootMap.showMap();
                $("#tag-error").remove();
            } else {
                if ($("#tag-error").length==0) {
                    $("#tag").after("<br /><span id='tag-error'>有効なタグを入力してください</span>");
                }
            }
        });
        $("#tag").autocomplete({
            source: tootMap.tag_autocomplete,
            open: function() {
                tootMap.tag_autocomplete_select_flg = false;
                tootMap.tag_autocomplete_open_flg = true;
            },
            select: function(event, ui) {
                tootMap.tag_autocomplete_select_flg = true;
            },
            close: function(event, ui) {
                tootMap.tag_autocomplete_open_flg = false;
                if (tootMap.tag_autocomplete_select_flg) {
                    $('#tag').next().focus()
                    $('#tag').trigger('change')
                }
            }
        });
        $("body").on("click", "#edit-tag-autocomplete", function() {
            tootMap.showTagList();
            $("#tag-autocomplete-list").empty();
            $("#tag-autocomplete-list").append("<a class='btn btn-block btn-light' id='back-to-edit' href='#'>戻る</a>");
            tootMap.tag_autocomplete.forEach(function(tag) {
                $("#tag-autocomplete-list").append("<a class='btn btn-block btn-light tag-autocomplete-delete' href='#'>"+tag+"<li class='fa fa-trash trash-icon'></li></a>");
            })
        });
        $("body").on("click", ".tag-autocomplete-delete", function(event) {
            target = event.target
            if (target.className == "fa fa-trash trash-icon") {
                target = target.parentNode
            }
            tag = target.textContent;
            if (confirm(tag+"を履歴から削除しますか？")) {
                tootMap.tag_autocomplete.some(function(_tag, i) {
                    if (_tag == tag) {
                        tootMap.tag_autocomplete.splice(i, 1);
                    }
                });
                localStorage.setItem("tag_autocomplete", tootMap.tag_autocomplete);
                $(target).remove();
            }
            event.stopPropagation();
        });
        $("body").on("click", "#back-to-edit", function() {
            tootMap.showMenu();
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
        query: "",
        lat: null,
        lng: null,
        zoom: null,
        tag: null,
        domain: null,        
        flg: false,
        test: "f",

        setQuery: function(query) {
            this.query = query;
        },

        _get: function(parameter_name, rule, def_val) {
            def_val = typeof(def_val)=="undefined"?null:def_val;
            var ret = def_val, tmp = [];
            this.query.substr(1).split("&").forEach(function (item) {
                tmp = item.split("=");
                try {
                    param = decodeURIComponent(tmp[1]);
                }  catch(e) {
                    param = "";
                }
                if (tmp[0] === parameter_name && (typeof(rule) == "undefined" || rule == null || param.match(rule))) {
                    ret = param;
                }
            });
            return ret;
        },
        all_get() {
            this.lat = parseFloat(this._get('lat', /^\d+\.\d+$/, 35.269452));
            this.lng = parseFloat(this._get('lng', /^\d+\.\d+$/, 136.067194));
            this.zoom = parseInt(this._get('zoom', /^\d+$/, 10));
            this.tag = this._get('tag', tootMap.tag_reg_rule, tootMap.mstdn.timeline.tag);
            this.domain = this._get('domain', tootMap.domain_reg_rule, tootMap.mstdn.domain);
            this.test = this._get('test', /^t$/, "f");
            this.flg = this._get('lat')!=null;
        },
        get: function() {
            this.setQuery(location.search);
            return this.all_get();
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
        $("#tag-autocomplete-list").hide();
    },
    showMap: function() {
        $("#setting").hide();
        $("#map").show();
        $("#tag-autocomplete-list").hide();
    },
    showTagList: function() {
        $("#map").hide();
        $("#setting").hide();
        $("#tag-autocomplete-list").show();
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
            var match = this.value.match(tootMap.domain_reg_rule);
            if (match) {
                tootMap.mstdn.setDomain(match[0]);
                $("#modal-domain-error").remove();
            } else {
                if ($("#modal-domain-error").length==0) {
                    $("#modal-domain").after("<br /><span id='modal-domain-error'>有効なドメインを入力してください</span>");
                }
                this.value = tootMap.mstdn.domain;
            }
        });
        $("body").on('change', '#modal-tag', function() {
            var match = this.value.match(tootMap.tag_reg_rule);            
            if (match) {
                tootMap.mstdn.timeline.setTag(match[0]);
                $("#modal-tag-error").remove();
            } else {
                if ($("#modal-tag-error").length==0) {
                    $("#modal-tag").after("<br /><span id='modal-tag-error'>有効なタグを入力してください</span>");
                }
                this.value = tootMap.mstdn.timeline.tag;
            }
        });
    },
    modalOrNot: function() {
        this.setModalFlg();
        if (!this.modal_flg) {
            this.displayModal( function() {
                tootMap.refresh(!tootMap.params.flg, tootMap.params.flg);
                tootMap.menuInit();

                localStorage.setItem("modal_flg", 1);
            });
        } else {
            this.mstdn.timeline.get(!tootMap.params.flg, tootMap.params.flg);
            this.menuInit();
        }
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

    // テスト
    test: function() {
        var script = document.createElement('script');
        script.src = './test.js';
        document.body.appendChild(script);
    },

    initialize: function() {
        this.params.get();
        this.mstdn.setDomain(this.params.domain);
        this.mstdn.timeline.setTag(this.params.tag);

        // テストモード
        if (this.params.test=="t") {
            tootMap.test();
            return;
        }

        this.gmap.init();

        this.modalOrNot();
    }
};