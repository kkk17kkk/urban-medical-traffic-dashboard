$(function(){
	var dashboard = window.DASHBOARD_DATA || {};
	var hospitals = Array.isArray(dashboard.hospitals) ? dashboard.hospitals : [];
	var ranking = Array.isArray(dashboard.ranking) ? dashboard.ranking : [];
	var selected = dashboard.selected || {};
	var summary = dashboard.summary || {};
	var markers = [];
	var map = null;
	var infoWindow = null;

	$(".animsition").animsition({
		inClass: 'fade-in',
		outClass: 'fade-out',
		inDuration: 300,
		outDuration: 1000,
		loading: false,
		loadingParentElement: 'body',
		loadingClass: 'animsition-loading',
		unSupportCss: ['animation-duration', '-webkit-animation-duration', '-o-animation-duration'],
		overlay: false,
		overlayClass: 'animsition-overlay-slide',
		overlayParentElement: 'body'
	});

	function fillZero(value) {
		return value < 10 ? '0' + value : value;
	}

	function updateTime() {
		var now = new Date();
		var week = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
		var text = now.getFullYear() + '-' + fillZero(now.getMonth() + 1) + '-' + fillZero(now.getDate()) +
			'&nbsp;&nbsp;' + week[now.getDay()] + '&nbsp;&nbsp;' +
			fillZero(now.getHours()) + ':' + fillZero(now.getMinutes()) + ':' + fillZero(now.getSeconds());
		$('.topTime').html(text);
	}

	function animateNumber(obj, speed) {
		var target = Number(obj.attr('total'));
		if (!Number.isFinite(target)) {
			obj.text('-');
			return;
		}
		var current = 0;
		var step = target > 20 ? Math.max(1, Math.ceil(target / 40)) : 1;
		var timer = setInterval(function() {
			current += step;
			if (current >= target) {
				current = target;
				clearInterval(timer);
			}
			obj.text(Math.round(current * 10) / 10);
		}, speed || 30);
	}

	function createMarkers(points) {
		if (!map || !window.AMap) {
			return;
		}
		markers.forEach(function(marker) {
			map.remove(marker);
		});
		markers = [];
		points.forEach(function(point) {
			if (point.lng == null || point.lat == null) {
				return;
			}
			var marker = new AMap.Marker({
				position: [point.lng, point.lat],
				map: map,
				icon: window.yyiconUrl
			});
			var scoreText = point.score == null ? '暂无评分' : point.score;
			marker.content = '<p>医院名称: ' + point.name + '</p><p>所属区: ' + point.area + '</p><p>综合得分: ' + scoreText + '</p>';
			marker.on('mouseover', function(e) {
				infoWindow.setContent(e.target.content);
				infoWindow.open(map, e.target.getPosition());
			});
			marker.on('mouseout', function() {
				infoWindow.close();
			});
			marker.on('click', function(e) {
				infoWindow.setContent(e.target.content);
				infoWindow.open(map, e.target.getPosition());
				map.setCenter(e.target.getPosition());
				map.setZoom(16);
			});
			markers.push(marker);
		});
	}

	function initMap() {
		if (!window.AMap || !document.getElementById('myMap')) {
			return;
		}
		var center = hospitals.length ? [hospitals[0].lng, hospitals[0].lat] : [116.4074, 39.9042];
		map = new AMap.Map('myMap', {
			resizeEnable: true,
			zoom: hospitals.length ? 12 : 10,
			mapStyle: 'amap://styles/darkblue',
			center: center
		});
		infoWindow = new AMap.InfoWindow({offset: new AMap.Pixel(16, -36)});
		createMarkers(hospitals);
		map.on('click', function() {
			infoWindow.close();
		});
	}

	function bindSearch() {
		$('.searchBtn').on('click', function(event) {
			event.stopPropagation();
			$(this).hide();
			$('.searchInner').addClass('open');
			setTimeout(function() {
				$('.searchInner').find('form').show();
			}, 200);
		});
		$('.search').on('click', function(event) {
			event.stopPropagation();
		});
		$('body').on('click', function() {
			$('.searchInner').find('form').hide();
			$('.searchInner').removeClass('open');
			setTimeout(function() {
				$('.searchBtn').show();
			}, 200);
		});
		$('.searchForm').on('submit', function(event) {
			event.preventDefault();
			var searchText = $(this).find('input[name="h_name"]').val().trim().toLowerCase();
			var selectedArea = $('select[name="h_area"]').val();
			var filtered = hospitals.filter(function(point) {
				var matchesName = !searchText || point.name.toLowerCase().indexOf(searchText) >= 0;
				var matchesArea = !selectedArea || point.area === selectedArea;
				return matchesName && matchesArea;
			});
			createMarkers(filtered);
		});
		$('select[name="h_area"]').on('change', function() {
			$('.searchForm').trigger('submit');
		});
	}

	function initTrendChart() {
		var element = document.getElementById('myChart1');
		if (!element || !window.echarts) {
			return null;
		}
		var trend = Array.isArray(selected.trend) ? selected.trend : [];
		var chart = echarts.init(element);
		chart.setOption({
			tooltip: {trigger: 'axis'},
			grid: {top: '5%', left: '0%', width: '100%', height: '95%', containLabel: true},
			xAxis: {
				data: trend.map(function(item) { return item.label; }),
				axisLabel: {show: true, textStyle: {fontSize: '12px', color: '#fff'}},
				axisLine: {lineStyle: {color: '#fff', width: 1}}
			},
			yAxis: {
				min: 0,
				max: 100,
				axisLabel: {show: true, textStyle: {fontSize: '12px', color: '#fff'}},
				axisLine: {lineStyle: {color: '#fff', width: 1}},
				splitLine: {show: false}
			},
			series: {
				name: '综合得分',
				type: 'line',
				data: trend.map(function(item) { return item.score; }),
				areaStyle: {normal: {color: 'rgba(79,237,247,0.3)'}},
				itemStyle: {normal: {lineStyle: {color: '#00dafb', width: 1}, color: '#00dafb'}}
			}
		});
		return chart;
	}

	function renderRanking() {
		var list = $('#FontScroll ul');
		if (!list.length) {
			return;
		}
		list.empty();
		if (!ranking.length) {
			list.append('<li><div class="fontInner clearfix"><span>暂无排名数据</span></div></li>');
			return;
		}
		ranking.forEach(function(item) {
			list.append(
				'<li><div class="fontInner clearfix">' +
				'<span style="width:70px">' + item.rank + '</span>' +
				'<span style="width:130px">' + item.name + '</span>' +
				'<span><div class="progress" progress="' + item.score + '%"><div class="progressBar"><span></span></div><h3><i><h4></h4></i></h3></div></span>' +
				'</div></li>'
			);
		});
	}

	function renderSummaryTables() {
		var indicators = Array.isArray(selected.indicators) ? selected.indicators : [];
		var indicatorRows = indicators.map(function(item) {
			return '<tr><td>' + item.group.toUpperCase() + '</td><td>' + item.label + '</td><td>' + item.score + '</td><td>' + item.max + '</td></tr>';
		});
		if (indicatorRows.length) {
			$('.summaryBottom tbody').html(indicatorRows.join(''));
		}
		var survey = selected.survey;
		if (survey) {
			var fields = [
				['工作人员引导机动车入院', survey.ydry],
				['管理非机动车停放', survey.gltf],
				['停车资源共享', survey.tcgx],
				['机动车违法停车', survey.wftc],
				['非机动车乱停乱放', survey.fjdclf]
			];
			$('.summaryTop tbody').html('<tr>' + fields.map(function(item) {
				return '<td>' + item[0] + '<br><strong>' + (item[1] ? '是' : '否') + '</strong></td>';
			}).join('') + '</tr>');
		}
	}

	function animateProgress() {
		$('.progress').each(function(i, ele) {
			var PG = $(ele).attr('progress') || '0%';
			var PGNum = parseFloat(PG) || 0;
			var zero = 0;
			var speed = 20;
			$(ele).find('h4').text('0%');
			$(ele).find('.progressBar span').css('width', '0').animate({width: PG}, Math.max(300, PGNum * speed));
			var timer = setInterval(function() {
				zero += 1;
				$(ele).find('h4').text(Math.min(zero, Math.round(PGNum)) + '%');
				if (zero >= PGNum) {
					clearInterval(timer);
				}
			}, speed);
		});
	}

	function bindPopup() {
		$('.summaryBtn').on('click', function() {
			$('.filterbg').show();
			$('.popup').show().width('3px').animate({height: '76%'}, 300, function() {
				$('.popup').animate({width: '82%'}, 300, function() {
					$('.popupClose').show();
					$('.summary').show();
				});
			});
		});
		$('.popupClose').on('click', function() {
			$('.popupClose').hide();
			$('.summary').hide();
			$('.popup').animate({width: '3px'}, 300, function() {
				$('.popup').animate({height: 0}, 300, function() {
					$('.filterbg').hide();
					$('.popup').hide().width(0);
				});
			});
		});
	}

	$('#loader').hide();
	updateTime();
	setInterval(updateTime, 1000);
	initMap();
	bindSearch();
	renderRanking();
	renderSummaryTables();
	var trendChart = initTrendChart();
	setTimeout(function() {
		animateProgress();
		animateNumber($('#indicator1'), 20);
		animateNumber($('#indicator2'), 20);
		animateNumber($('#indicator3'), 20);
	}, 300);
	bindPopup();
	$(window).resize(function() {
		if (trendChart) {
			trendChart.resize();
		}
	});
	return;
	//页面淡入效果
	$(".animsition").animsition({
	    inClass               :   'fade-in',
	    outClass              :   'fade-out',
	    inDuration            :    300,
	    outDuration           :    1000,
	    // e.g. linkElement   :   'a:not([target="_blank"]):not([href^=#])'
	    loading               :    false,
	    loadingParentElement  :   'body', //animsition wrapper element
	    loadingClass          :   'animsition-loading',
	    unSupportCss          : [ 'animation-duration',
	                              '-webkit-animation-duration',
	                              '-o-animation-duration'
	                            ],
	    //"unSupportCss" option allows you to disable the "animsition" in case the css property in the array is not supported by your browser.
	    //The default setting is to disable the "animsition" in a browser that does not support "animation-duration".
	    
	    overlay               :   false,
	    
	    overlayClass          :   'animsition-overlay-slide',
	    overlayParentElement  :   'body'

	
  	});
	
	document.onreadystatechange = subSomething;
	function subSomething() 
	{ 
		if(document.readyState == "complete"){ 
			$('#loader').hide();
		} 
	} 

	//顶部时间
	function getTime(){
		var myDate = new Date();
		var myYear = myDate.getFullYear(); //获取完整的年份(4位,1970-????)
		var myMonth = myDate.getMonth()+1; //获取当前月份(0-11,0代表1月)
		var myToday = myDate.getDate(); //获取当前日(1-31)
		var myDay = myDate.getDay(); //获取当前星期X(0-6,0代表星期天)
		var myHour = myDate.getHours(); //获取当前小时数(0-23)
		var myMinute = myDate.getMinutes(); //获取当前分钟数(0-59)
		var mySecond = myDate.getSeconds(); //获取当前秒数(0-59)
		var week = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
		var nowTime;
		
		nowTime = myYear+'-'+fillZero(myMonth)+'-'+fillZero(myToday)+'&nbsp;&nbsp;'+week[myDay]+'&nbsp;&nbsp;'+fillZero(myHour)+':'+fillZero(myMinute)+':'+fillZero(mySecond);
		$('.topTime').html(nowTime);
	};
	function fillZero(str){ 
		var realNum;
		if(str<10){
			realNum	= '0'+str;
		}else{
			realNum	= str;
		}
		return realNum;
	}
	setInterval(getTime,1000);

	function totalNum(obj,speed){
		var singalNum = 0;
		var timer;
		var totalNum = obj.attr('total');

		if(totalNum){
			timer = setInterval(function(){
				singalNum+=speed;
				if(singalNum>=totalNum){
					singalNum=totalNum;
					clearInterval(timer);
				}
				obj.html(singalNum);
			},1);
		}
	}
	
	//高德地图

    var myMap = new AMap.Map('myMap', {
		resizeEnable: true,
		zoom: 14,
		mapStyle: 'amap://styles/darkblue',
		center: [116.342802, 39.952291] // 地图中心点
	});
	
	var points = [
		{position: [116.315292, 36.068716], name: '北京市海淀医院', district: '海淀区'},
		{position: [116.265907, 39.906414], name: '北京市中西医结合医院', district: '海淀区'},
		{position: [116.357620, 39.982189], name: '北京大学第六医院', district: '海淀区'},
		{position: [116.325386, 39.952347], name: '北京大学口腔医院', district: '海淀区'},
		{position: [116.264435, 39.921562], name: '北京裕和中西医结合康复医院', district: '海淀区'},
		{position: [116.346741, 39.786339], name: '北京大学肿瘤医院', district: '海淀区'},
		{position: [116.164619, 40.048191], name: '北京老年医院', district: '海淀区'},
		{position: [116.258141, 39.976181], name: '北京马应龙长青肛肠医院', district: '海淀区'},
		{position: [116.250969, 39.916611], name: '航天中心医院', district: '海淀区'},
		{position: [116.318962, 39.899300], name: '首都医科大学附属北京世纪坛医院', district: '海淀区'},
		{position: [116.293137, 39.994419], name: '中国中医科学院西苑医院', district: '海淀区'},
		{position: [116.360039, 39.982674], name: '北京大学第三医院', district: '海淀区'},
		{position: [116.380867, 39.932026], name: '北京大学第一医院', district: '西城区'},
		{position: [116.353981, 39.936577], name: '北京大学人民医院', district: '西城区'},
		{position: [116.375511, 39.944271], name: '北京积水潭医院', district: '西城区'},
		{position: [116.380257, 39.959538], name: '北京市肛肠医院', district: '西城区'},
		{position: [116.331314, 39.888741], name: '北京市西城区广外医院', district: '西城区'},
		{position: [116.389641, 39.887772], name: '北京市宣武中医医院', district: '西城区'},
		{position: [116.376381, 39.936234], name: '北京中医药大学附属护国寺中医医院', district: '西城区'},
		{position: [116.377350, 39.952785], name: '首都医科大学附属北京安定医院', district: '西城区'},
		{position: [116.354645, 39.912354], name: '首都医科大学附属北京儿童医院', district: '西城区'},
		{position: [116.391884, 39.884930], name: '首都医科大学附属北京友谊医院', district: '西城区'},
		{position: [116.346799, 39.911216], name: '首都医科大学附属复兴医院', district: '西城区'},
		{position: [116.362339, 39.891919], name: '首都医科大学宣武医院', district: '西城区'},
		{position: [116.356744, 39.931083], name: '中国医学科学院阜外医院', district: '西城区'},
		{position: [116.346555, 39.749970], name: '中国中医科学院广安门医院', district: '西城区'},
		{position: [116.369266, 39.887938], name: '北京市回民医院', district: '西城区'},
		{position: [116.432620, 39.980346], name: '中日友好医院', district: '朝阳区'},
		{position: [116.446150, 39.920896], name: '首都儿科研究所附属儿童医院', district: '朝阳区'},
		{position: [116.409978, 39.979213], name: '首都医科大学附属北京安贞医院', district: '朝阳区'},
		{position: [116.460197, 39.931144], name: '首都医科大学附属北京朝阳医院', district: '朝阳区'},
		{position: [116.532687, 40.029626], name: '首都医科大学附属北京地坛医院', district: '朝阳区'},
		{position: [116.359846, 40.031806], name: '北京市红十字会急诊抢救中心', district: '朝阳区'},
		{position: [116.415561, 39.984592], name: '北京中医药大学第三附属医院', district: '朝阳区'},
		{position: [116.426432, 40.035117], name: '航空总医院', district: '朝阳区'},
		{position: [116.535784, 39.921930], name: '民航总医院', district: '朝阳区'},
		{position: [116.453510, 39.878528], name: '中国医学科学院肿瘤医院', district: '朝阳区'},
		{position: [116.479714, 39.988116], name: '中国中医科学院望京医院', district: '朝阳区'},
		{position: [116.443208, 39.966027], name: '应急管理部应急总医院', district: '朝阳区'},
		{position: [116.478780, 39.922578], name: '北京市第一中西医结合医院', district: '朝阳区'},
		{position: [116.472343, 39.859592], name: '北京朝阳急诊抢救中心', district: '朝阳区'},
		{position: [116.478111, 39.865887], name: '北京朝阳中西医结合急诊抢救中心', district: '朝阳区'},
		{position: [116.495247, 39.965549], name: '北京华信医院', district: '朝阳区'},
		{position: [116.365479, 40.008541], name: '北京京城皮肤医院', district: '朝阳区'},
		{position: [116.571785, 39.917732], name: '北京市垂杨柳医院', district: '朝阳区'},
		{position: [116.404251, 39.920647], name: '首都医科大学附属北京妇产医院', district: '朝阳区'},
		{position: [116.479714, 39.988116], name: '中国中医科学院望京医院', district: '朝阳区'},
		{position: [116.443208, 39.966027], name: '应急管理部应急总医院', district: '朝阳区'},
		{position: [116.478780, 39.922578], name: '北京市第一中西医结合医院', district: '朝阳区'},
		{position: [116.472343, 39.859592], name: '北京朝阳急诊抢救中心', district: '朝阳区'},
		{position: [116.478111, 39.865887], name: '北京朝阳中西医结合急诊抢救中心', district: '朝阳区'},
		{position: [116.495247, 39.965549], name: '北京华信医院', district: '朝阳区'},
		{position: [116.365479, 40.008541], name: '北京京城皮肤医院', district: '朝阳区'},
		{position: [116.571785, 39.917732], name: '北京市垂杨柳医院', district: '朝阳区'},
		{position: [116.404251, 39.920647], name: '首都医科大学附属北京妇产医院', district: '朝阳区'},
		{position: [116.397978, 39.944031], name: '北京市鼓楼中医医院', district: '东城区'},
		{position: [116.413316, 39.958165], name: '北京市和平里医院', district: '东城区'},
		{position: [116.411310, 39.926856], name: '北京市隆福医院', district: '东城区'},
		{position: [116.415061, 39.903755], name: '北京医院', district: '东城区'},
		{position: [116.427745, 39.937129], name: '北京中医药大学东直门医院', district: '东城区'},
		{position: [116.402657, 39.877888], name: '首都医科大学附属北京口腔医院', district: '东城区'},
		{position: [116.417213, 39.902672], name: '首都医科大学附属北京同仁医院', district: '东城区'},
		{position: [116.407883, 39.932297], name: '首都医科大学附属北京中医医院', district: '东城区'},
		{position: [116.414261, 39.911312], name: '中国医学科学院北京协和医院', district: '东城区'},
		{position: [116.204460, 39.829781], name: '北京中医药大学东方医院', district: '丰台区'},
		{position: [116.315735, 39.885883], name: '国家电网公司北京电力医院', district: '丰台区'},
		{position: [116.404007, 39.876808], name: '首都医科大学附属北京天坛医院', district: '丰台区'},
		{position: [116.353996, 39.866436], name: '首都医科大学附属北京佑安医院', district: '丰台区'},
		{position: [116.437042, 39.859512], name: '北京中诺口腔医院', district: '丰台区'},
		{position: [116.445419, 39.849194], name: '北京首大眼耳鼻喉医院', district: '丰台区'},
		{position: [116.208946, 39.820538], name: '北京市丰台中西医结合医院', district: '丰台区'},
		{position: [116.317284, 39.877720], name: '北京国丹白癜风医院', district: '丰台区'},
		{position: [116.361649, 39.859318], name: '北京丰台右安门医院', district: '丰台区'},
		{position: [116.378365, 39.849243], name: '北京博爱医院', district: '丰台区'},
		{position: [116.250969, 39.916611], name: '北京航天总医院', district: '丰台区'},
		{position: [116.198952, 39.942650], name: '中国医学科学院整形外科医院', district: '石景山区'},
		{position: [116.231277, 39.904720], name: '中国中医科学院眼科医院', district: '石景山区'},
		{position: [116.352921, 39.865181], name: '首都医科大学附属北京康复医院', district: '石景山区'},
		{position: [116.152473, 39.937641], name: '北京联科中医肾病医院', district: '石景山区'},
		{position: [116.203125, 39.929142], name: '北京大学首钢医院', district: '石景山区'}];
	
	if (window.DASHBOARD_DATA && Array.isArray(window.DASHBOARD_DATA.hospitals) && window.DASHBOARD_DATA.hospitals.length) {
		points = window.DASHBOARD_DATA.hospitals.map(function(item) {
			return {
				position: [item.lng, item.lat],
				name: item.name,
				district: item.area,
				score: item.score
			};
		});
		myMap.setCenter(points[0].position);
	}

	var infoWindow = new AMap.InfoWindow({
		offset: new AMap.Pixel(16, -36)
	});
	
	for (var i = 0; i < points.length; i += 1) {

		var marker = new AMap.Marker({
			position: points[i].position,
			map: myMap,
			icon: yyiconUrl,
		});
	
	marker.content = '<p>医院名称: ' + points[i].name + '</p>' +
						 '<p>所属区: ' + points[i].district + '</p>' +
						 (points[i].score ? '<p>综合得分: ' + points[i].score + '</p>' : '');
	
		marker.on('mouseover', markerMouseOver);
		marker.on('mouseout', markerMouseOut);
		marker.on('click', markerClick);
	}
	
	function markerMouseOver(e) {
		infoWindow.setContent(e.target.content);
		infoWindow.open(myMap, e.target.getPosition());
	}
	
	function markerMouseOut(e) {
		infoWindow.close();
	}
	
	function markerClick(e) {
		// 点击标记
		infoWindow.setContent(e.target.content);
		infoWindow.open(myMap, e.target.getPosition());
		myMap.setCenter(e.target.getPosition());
		myMap.setZoom(16);

	}
	
	myMap.on('click', function() {
		infoWindow.close();
	});
	

	//地图上的搜索
	$(document).ready(function() {
		// 点击搜索按钮显示搜索框
		$('.searchBtn').on('click', function() {
			$(this).hide();
			$('.searchInner').addClass('open');
			setTimeout(function() {
				$('.searchInner').find('form').show();
			}, 400);
		});
	
		// 阻止搜索框内点击事件冒泡
		$('.search').on('click', function(event) {
			event.stopPropagation();
		});
	
		// 点击页面其他地方隐藏搜索框
		$('body').on('click', function() {
			$('.searchInner').find('form').hide();
			$('.searchInner').removeClass('open');
			setTimeout(function() {
				$('.searchBtn').show();
			}, 400);
		});
	
		// 处理搜索表单提交
		$('.searchForm').on('submit', function(event) {
			event.preventDefault(); // 阻止表单默认提交行为
	
			// 获取用户输入的搜索关键字
			var searchText = $(this).find('input[name="h_name"]').val().trim().toLowerCase();
			var selectedArea = $('select[name="h_area"]').val();
	
			// 过滤点位数据
			var filteredPoints = points.filter(function(point) {
				var matchesName = point.name.toLowerCase().includes(searchText);
				var matchesArea = !selectedArea || point.district === selectedArea;
				return matchesName && matchesArea;
			});
	
			// 更新地图上的标记
			createMarkers(filteredPoints);
	
			// 隐藏搜索框
			$('.searchInner').find('form').hide();
			$('.searchInner').removeClass('open');
			setTimeout(function() {
				$('.searchBtn').show();
			}, 400);
		});
	
		// 清除搜索输入框的内容
		$('.searchForm').find('input[name="h_name"]').on('input', function() {
			if ($(this).val().trim() === '') {
				$('.searchForm').find('button[type="submit"]').prop('disabled', true);
			} else {
				$('.searchForm').find('button[type="submit"]').prop('disabled', false);
			}
		});
	});
	

    //季度统计图
	var myChart1 = echarts.init(document.getElementById('myChart1'));
	var option1 = {
		tooltip: {
			trigger: 'item',
			formatter: function(params) {
				var res = '第' + params.name + '季度：' + params.data;
				return res;
			}
		},
		grid: {
			top: '5%',
			left: '0%',
			width: '100%',
			height: '95%',
			containLabel: true
		},
		xAxis: {
			data: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20'],
			axisLabel: {
				show: true,
				textStyle: {
					fontSize: '12px',
					color: '#fff',
				}
			},
			axisLine: {
				lineStyle: {
					color: '#fff',
					width: 1,
				}
			}
		},
		yAxis: {
			min: 60, // 设置最小值
			max: 100, // 设置最大值
			axisLabel: {
				show: true,
				textStyle: {
					fontSize: '12px',
					color: '#fff',
				}
			},
			axisLine: {
				lineStyle: {
					color: '#fff',
					width: 1,
				}
			},
			splitLine: {
				show: false,
			}
		},
		series :{
			name: '',
			type: 'line',
			data: ['100','100','98','96','92','93','95','94','98','97','92','99','96','100','100','99','99','100','100','98'],
			areaStyle: {
				normal:{
					color: 'rgba(79,237,247,0.3)',
				}
			},
			itemStyle: {
				normal: {
					lineStyle: {
						color: '#00dafb',
						width: 1,
					},
					color: '#00dafb',
				},
			},
		}
	};
	myChart1.setOption(option1);
	
	

	//文字滚动

	$.fn.FontScroll = function(options){
		var defaults = {
			time: 3000,
			num: 1
		};
		var opts = $.extend({}, defaults, options);
		this.each(function(){
			var $this = $(this);
			var fontScroll = function(){
				$this.find('ul').animate({
					marginTop: '-=30px'  // 每个列表项的高度，根据实际情况调整
				}, 1000, function(){
					$(this).css({marginTop: '0px'}).find("li:first").appendTo(this);
				});
			};
			setInterval(fontScroll, opts.time);
		});
	};
	
	$('#FontScroll').FontScroll({time: 1000, num: 7}); //time:间隔时间，num:显示条数

	setTimeout(function(){
		$('.progress').each(function(i,ele){
			var PG = $(ele).attr('progress');
			var PGNum = parseInt(PG);
			var zero = 0;
			var speed = 70; //速度
			var timer;
			
			$(ele).find('h4').html(zero+'%');
			if(PGNum<10){
				$(ele).find('.progressBar span').addClass('bg-red'); 
				$(ele).find('h3 i').addClass('color-red');
			}else if(PGNum>=10 && PGNum<50){
				$(ele).find('.progressBar span').addClass('bg-yellow');
				$(ele).find('h3 i').addClass('color-yellow');
			}else if(PGNum>=50 && PGNum<100){
				$(ele).find('.progressBar span').addClass('bg-blue');
				$(ele).find('h3 i').addClass('color-blue');
			}else{
				$(ele).find('.progressBar span').addClass('bg-green');
				$(ele).find('h3 i').addClass('color-green');
			}
			$(ele).find('.progressBar span').animate({width: PG},PGNum*speed);
			timer = setInterval(function(){
				zero++;
				$(ele).find('h4').html(zero+'%');
				if(zero==PGNum){
					clearInterval(timer);
				}
			},speed);
		});

		//基本信息
		totalNum($('#indicator1'),1); 
		totalNum($('#indicator2'),1);
		totalNum($('#indicator3'),1);

		//总计运单数
		totalNum($('#totalNum'),1000);

		myChart1.setOption(option1);
	},500);


	var summaryPie1,summaryPie2,summaryPie3,summaryBar,summaryLine;
	var pieData;
	function setSummary(){
		summaryPie1 = echarts.init(document.getElementById('summaryPie1'));
		summaryPie2 = echarts.init(document.getElementById('summaryPie2'));
		summaryPie3 = echarts.init(document.getElementById('summaryPie3'));
		
		var ww = $(window).width();
		var pieData;popupClose
		if(ww>1600){
			pieData = {
				pieTop: '40%',
				pieTop2: '36%',
				titleSize: 20,
				pieRadius: [80, 85],
				itemSize: 32
			}
		}else{
			pieData = {
				pieTop: '30%',
				pieTop2: '26%',
				titleSize: 16,
				pieRadius: [60, 64],
				itemSize: 28
			}
		};
		//弹出框调用ECharts饼图
		var pieOption1 = {
		    title: {
		    	x: 'center',
		        y: pieData.pieTop,
		        text: '司机',
		        textStyle: {
		            fontWeight: 'normal',
		            color: '#ffd325',
		            fontSize: pieData.titleSize,
		        },
		        subtext: '',
		        subtextStyle:{
		        	color: '#fff',
		        }
		    },
		    tooltip: {
		        show: false,
		    },
		    toolbox: {
		        show: false,
		    },
		    
		    series: [{
		        type: 'pie',
		        clockWise: false,
		        radius: pieData.pieRadius,
		        hoverAnimation: false,
		        center: ['50%', '50%'],
		        data: [{
		            value: 25,
		            label: {
		                normal: {
		                    formatter: '{d}%',
		                    position: 'outside',
		                    show: true,
		                    textStyle: {
		                        fontSize: pieData.itemSize,
		                        fontWeight: 'normal',
		                        color: '#ffd325'
		                    }
		                }
		            },
		            itemStyle: {
		                normal: {
		                    color: '#ffd325',
		                    shadowColor: '#ffd325',
		                    shadowBlur: 10
		                }
		            }
		        }, {
		            value: 75,
		            name: '未工作',
		            itemStyle: {
					    normal: {
					        color: 'rgba(44,59,70,1)', // 未完成的圆环的颜色
					        label: {
					            show: false
					        },
					        labelLine: {
					            show: false
					        }
					    },
					    emphasis: {
					        color: 'rgba(44,59,70,1)' // 未完成的圆环的颜色
					    }
					},
		            itemStyle: {
	                    normal: {
	                        color: '#11284e',
	                        shadowColor: '#11284e',
	                    }
	                },
		        }]
		    }]
		}
		var pieOption2 = {
		    title: {
		    	x: 'center',
		        y: pieData.pieTop,
		        text: '车辆',
		        textStyle: {
		            fontWeight: 'normal',
		            color: '#32ffc7',
		            fontSize: pieData.titleSize
		        },
		        subtext: '总数：100辆\n今日工作：75辆人',
		        subtextStyle:{
		        	color: '#fff',
		        }
		    },
		    tooltip: {
		        show: false,
		    },
		    toolbox: {
		        show: false,
		    },
		    
		    series: [{
		        type: 'pie',
		        clockWise: false,
		        radius: pieData.pieRadius,
		        hoverAnimation: false,
		        center: ['50%', '50%'],
		        data: [{
		            value: 75,
		            label: {
		                normal: {
		                    formatter: '{d}%',
		                    position: 'outside',
		                    show: true,
		                    textStyle: {
		                        fontSize: pieData.itemSize,
		                        fontWeight: 'normal',
		                        color: '#32ffc7'
		                    }
		                }
		            },
		            itemStyle: {
		                normal: {
		                    color: '#32ffc7',
		                    shadowColor: '#32ffc7',
		                    shadowBlur: 10
		                }
		            }
		        }, {
		            value: 25,
		            name: '未工作',
		            itemStyle: {
					    normal: {
					        color: 'rgba(44,59,70,1)', // 未完成的圆环的颜色
					        label: {
					            show: false
					        },
					        labelLine: {
					            show: false
					        }
					    },
					    emphasis: {
					        color: 'rgba(44,59,70,1)' // 未完成的圆环的颜色
					    }
					},
		            itemStyle: {
	                    normal: {
	                        color: '#11284e',
	                        shadowColor: '#11284e',
	                    }
	                },
		        }]
		    }]
		}
		var pieOption3 = {
		    title: {
		    	x: 'center',
		        y: pieData.pieTop2,
		        text: '运单',
		        textStyle: {
		            fontWeight: 'normal',
		            color: '#1eb6fe',
		            fontSize: pieData.titleSize
		        },
		        subtext: '总数：100单\n正常单：50单\n异常单：50单',
		        subtextStyle:{
		        	color: '#fff',
		        }
		    },
		    tooltip: {
		        show: false,
		    },
		    toolbox: {
		        show: false,
		    },
		    
		    series: [{
		        type: 'pie',
		        clockWise: false,
		        radius: pieData.pieRadius,
		        hoverAnimation: false,
		        center: ['50%', '50%'],
		        data: [{
		            value: 50,
		            label: {
		                normal: {
		                    formatter: '{d}%',
		                    position: 'outside',
		                    show: true,
		                    textStyle: {
		                        fontSize: pieData.itemSize,
		                        fontWeight: 'normal',
		                        color: '#1eb6fe'
		                    }
		                }
		            },
		            itemStyle: {
		                normal: {
		                    color: '#1eb6fe',
		                    shadowColor: '#1eb6fe',
		                    shadowBlur: 10
		                }
		            }
		        }, {
		            value: 50,
		            name: '未工作',
		            itemStyle: {
					    normal: {
					        color: 'rgba(44,59,70,1)', // 未完成的圆环的颜色
					        label: {
					            show: false
					        },
					        labelLine: {
					            show: false
					        }
					    },
					    emphasis: {
					        color: 'rgba(44,59,70,1)' // 未完成的圆环的颜色
					    }
					},
		            itemStyle: {
	                    normal: {
	                        color: '#11284e',
	                        shadowColor: '#11284e',
	                    }
	                },
		        }]
		    }]
		}
	
		//弹出框调用ECharts柱状图
		summaryBar = echarts.init(document.getElementById('summaryBar'));
		var barOption = {

			tooltip: {
				trigger: 'item',  
	            formatter: function(params) {  
	                var res = '第'+params.name+'季度得分：'+params.data; 
	                return res;  
	            }  
			},
			grid: {
				top: '20%',
				left: '15%',
		        width: '80%',
		        height: '80%',
		        containLabel: true
		    },
			xAxis: {
				data: ['内部管理','交通基础设施','人员引导','交通秩序','主观积极'],
				axisLabel: {
	                show: true,
	                textStyle: {
	                    fontSize: '12px',
	                    color: '#fff',
	                }
	           	},
	           	axisLine:{  
	                lineStyle:{  
	                    color:'#fff',  
	                    width:1, 
	                }  
	            }  
			},

			yAxis: {
				axisLabel: {
	                show: true,
	                textStyle: {
	                    fontSize: '12px',
	                    color: '#fff',
	                }
	           	},
	           	axisLine:{  
	                lineStyle:{  
	                    color:'#fff',  
	                    width:1, 
	                }  
	            },
	            splitLine:{  
		            show:false,
	    		}  
			},

			series :{
				name: '',
				type: 'bar',
				barWidth : 20,
				data: ['35','10','10','10','30'],
				itemStyle: {
	                normal: {
	                    color: new echarts.graphic.LinearGradient(
	                        0, 0, 0, 1,
	                        [
	                            {offset: 0, color: '#3876cd'},
	                            {offset: 0.5, color: '#45b4e7'},
	                            {offset: 1, color: '#54ffff'}
	                        ]
	                    ),
	                },
	            },
			},
		}

		//弹出框调用ECharts折线图
		summaryLine = echarts.init(document.getElementById('summaryLine'));
		var lineOption = {

			tooltip: {
				trigger: 'item',  
	            formatter: function(params) {  
	                var res = '本月'+params.name+'号运单数：'+params.data; 
	                return res;  
	            }  
			},
			grid: {
				top: '20%',
				left: '0%',
		        width: '100%',
		        height: '80%',
		        containLabel: true
		    },
			xAxis: {
				data: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20'],
				axisLabel: {
	                show: true,
	                textStyle: {
	                    fontSize: '12px',
	                    color: '#3e70b0',
	                }
	           	},
	           	axisLine:{  
	                lineStyle:{  
	                    color:'#0e2c52',  
	                    width:1,
	                }  
	            }  
			},

			yAxis: {
				min: 60, // 设置最小值
				max: 100, // 设置最大值
				axisLabel: {
					show: true,
					textStyle: {
						fontSize: '12px',
						color: '#fff',
					}
				},
				axisLine: {
					lineStyle: {
						color: '#fff',
						width: 1,
					}
				},
				splitLine: {
					show: false,
				}
			},

			series :{
				name: '',
				type: 'line',
				data: ['100','100','98','96','92','93','95','94','98','97','92','99','96','100','100','99','99','100','100','98'],
				areaStyle: {
					normal:{
						color: 'rgba(79,237,247,0.3)',
					}
				},
				itemStyle: {
	                normal: {
	                    lineStyle: {
	                    	color: '#00dafb',
	                    	width: 1,
	                    },
	                    color: '#00dafb',
	                },
	            },
			},
		}

		summaryPie1.setOption(pieOption1);
		summaryPie2.setOption(pieOption2);
		summaryPie3.setOption(pieOption3);
		summaryBar.setOption(barOption);
		summaryLine.setOption(lineOption);
	}

	//弹窗
	$(document).ready(function() {
		$('.summaryBtn').on('click', function() {
			$('.filterbg').show();
			$('.popup').show();
			$('.popup').width('3px');
			$('.popup').animate({height: '76%'}, 400, function() {
				$('.popup').animate({width: '82%'}, 400, function() {
					setTimeout(summaryShow, 800); // 延迟调用展示函数
				});
			});
		});
	
		$('.popupClose').on('click', function() {
			$('.popupClose').css('display', 'none');
			$('.summary').hide();
	
			$('.popup').animate({width: '3px'}, 400, function() {
				$('.popup').animate({height: 0}, 400, function() {
					setTimeout(summaryHide, 800); // 延迟调用隐藏函数
				});
			});
		});
	
		function summaryShow() {
			$('.popupClose').css('display', 'block');
			$('.summary').show();
			setSummary(); // 确保定义了 setSummary 函数
			if (typeof table1 !== 'undefined') {
				table1.clear(); // 确保 table1 定义
			}
			if (typeof table2 !== 'undefined') {
				table2.clear(); // 确保 table2 定义
			}
		};
	
		function summaryHide() {
			$('.filterbg').hide();
			$('.popup').hide();
			$('.popup').width(0); // 确保弹窗宽度重置
		};
	});
	
	$(window).resize(function() {
		myChart1.resize();
		try {
			summaryPie1.resize();
			summaryPie2.resize();
			summaryPie3.resize();
			summaryBar.resize();
			summaryLine.resize();
		} catch (err) {
			return false;
		}
	});
	
	//状态滚动条样式
	$('.stateUl').niceScroll({
        cursorcolor: "#045978",//#CC0071 光标颜色
        cursoropacitymax: 0.6, //改变不透明度非常光标处于活动状态（scrollabar“可见”状态），范围从1到0
        touchbehavior: false, //使光标拖动滚动像在台式电脑触摸设备
        cursorwidth: "4px", //像素光标的宽度
        cursorborder: "0", // 	游标边框css定义
        cursorborderradius: "4px",//以像素为光标边界半径
        autohidemode: false //是否隐藏滚动条
    });


    //模拟数据
	/*
    var carData = [
    	{
			
    		dateLable: "2018-01-01 星期一",
    		data: {
    			workTime: [
    				{start: "07:30",end: "13:15"},
    				{start: "14:40",end: "21:50"}
    			],
    			standard: [
    				{start: "00:00",end: "05:00"},
    				{start: "08:00",end: "12:00"},
    				{start: "14:00",end: "19:00"}
    			]
    		}
    	},
    	{
    		dateLable: "2018-01-02 星期二",
    		data: {
    			workTime: [
    				{start: "03:10",end: "09:40"}
    			],
    			standard: [
    				{start: "00:00",end: "05:00"},
    				{start: "08:00",end: "12:00"},
    				{start: "14:00",end: "19:00"}
    			]
    		}
    	},
    	{
    		dateLable: "2018-01-03 星期三",
    		data: {
    			workTime: [
    				{start: "06:15",end: "14:08"},
    				{start: "15:53",end: "24:00"}
    			],
    			standard: [
    				{start: "00:00",end: "05:00"},
    				{start: "08:00",end: "12:00"},
    				{start: "14:00",end: "19:00"}
    			]
    		}
    	},
    	{
    		dateLable: "2018-01-04 星期四",
    		data: {
    			workTime: [
    				{start: "00:00",end: "07:32"},
    				{start: "12:20",end: "19:50"}
    			],
    			standard: [
    				{start: "00:00",end: "05:00"},
    				{start: "08:00",end: "12:00"},
    				{start: "14:00",end: "19:00"}
    			]
    		}
    	},
    	{
    		dateLable: "2018-01-05 星期五",
    		data: {
    			workTime: [
    				{start: "06:15",end: "17:20"}
    			],
    			standard: [
    				{start: "00:00",end: "05:00"},
    				{start: "08:00",end: "12:00"},
    				{start: "14:00",end: "19:00"}
    			]
    		}
    	},
    	{
    		dateLable: "2018-01-06 星期六",
    		data: {
    			workTime: [
    				{start: "14:40",end: "22:38"}
    			],
    			standard: [
    				{start: "00:00",end: "05:00"},
    				{start: "08:00",end: "12:00"},
    				{start: "14:00",end: "19:00"}
    			]
    		}
    	},
    	{
    		dateLable: "2018-01-07 星期天",
    		data: {
    			workTime: [
    				{start: "06:30",end: "12:20"},
    				{start: "14:25",end: "20:33"}
    			],
    			standard: [
    				{start: "00:00",end: "05:00"},
    				{start: "08:00",end: "12:00"},
    				{start: "14:00",end: "19:00"}
    			]
    		}
    	}
    ];*/
	/*
    function Schedule(){
    	var Item = $('.dataBox');
    	var Size = Item.eq(0).width();
    	var oDay = 24*60;

    	function getMin(timeStr){
    		var timeArray = timeStr.split(":");
    		var Min = parseInt(timeArray[0])*60+parseInt(timeArray[1]);
    		return Min;
    	}

    	//在时间轴上添加工作时间数据
    	Item.each(function(i,ele){
    		var ItemData = carData[i];
    		function addData(obj,dataParam){
    			for(var j=0;j<dataParam.length;j++){
	    			var pos,wid,workCeil,sDate,sStart,sEnd,sConsume;
	    			pos = getMin(dataParam[j].start)/oDay*100+'%';
	    			wid = (getMin(dataParam[j].end)-getMin(dataParam[j].start))/oDay*100+'%';
	    			sDate = ItemData.dateLable;
	    			sStart = dataParam[j].start;
	    			sEnd = dataParam[j].end;
	    			sConsume = getMin(dataParam[j].end)-getMin(dataParam[j].start);
	    			workCeil = '<span style="width: '+wid+';left: '+pos+'" sDate="'+sDate+'" sStart="'+sStart+'" sEnd="'+sEnd+'" sConsume="'+sConsume+'"></span>';
	    			obj.append(workCeil);
	    		}
    		}
    		addData($(ele).find('.workTime'),ItemData.data.workTime);
    		addData($(ele).find('.standard'),ItemData.data.standard);
    	});

    	//添加总用时与总单数
    	var Total = $('.totalItem');
    	Total.each(function(i,ele){
    		var ItemData = carData[i].data.workTime;
    		var timeUsed = 0;
    		for(var j=0;j<ItemData.length;j++){
				timeUsed+= getMin(ItemData[j].end)-getMin(ItemData[j].start);
    		}
    		var realHour = Math.floor(timeUsed/60);
    		$(ele).find('span').eq(0).html(realHour+':'+(timeUsed-realHour*60));
    		$(ele).find('span').eq(1).html(ItemData.length);
    	});
    };
    Schedule();*/

    //鼠标移入运单显示信息框
	/*
    $('.workTime').on('mouseenter','span',function(ev){
    	var x = ev.clientX;
    	var y = ev.clientY;
    	var sDate,sStart,sEnd,sConsume,infos,sHour,sMin;
    	sDate = $(this).attr("sDate");
		sStart = $(this).attr("sStart");
		sEnd = $(this).attr("sEnd");
		sConsume = $(this).attr("sConsume");
		sHour = Math.floor(sConsume/60);
		sMin = sConsume-sHour*60;

		infos = '<div class="workTimeInfo" style="left:'+x+'px;top:'+y+'px"><p>日期：'+sDate+'</p><p>开始时间：'+sStart+'</p><p>结束时间：'+sEnd+'</p><p>总用时：'+sHour+'小时'+sMin+'分钟</p></div>'; 
    	$('body').append(infos);
    });
    $('.workTime').on('mouseout',function(){
    	$('.workTimeInfo').remove();
    });*/


    //车辆信息弹出框的显示隐藏效果
	/*
    $('.infoBtn').on('click',function(){
		$('.filterbg').show();
		$('.carInfo').show();
		$('.carInfo').width('3px');
		$('.carInfo').animate({height: '76%'},400,function(){
			$('.carInfo').animate({width: '82%'},400);
		});
		setTimeout(function(){
			$('.infoBox').show();
			$('.carClose').css('display','block');
		},800);
		
	});
	$('.carClose').on('click',function(){
		$('.carClose').css('display','none');
		$('.infoBox').hide();
		
		$('.carInfo').animate({width: '3px'},400,function(){
			$('.carInfo').animate({height: 0},400);
		});
		setTimeout(function(){
			$('.filterbg').hide();
			$('.carInfo').hide();
			$('.carInfo').width(0);
		},800);
	});*/
});
