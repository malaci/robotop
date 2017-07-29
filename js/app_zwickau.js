/**
 * Created by michael on 5/19/2017.
 */
var app = new Vue({
	el: '#app1',
	data: {
		message: '',
		inputdata : '',
		level : 0,
		vacancies : 0,
		map : null,
		layers : [],
		googleApiKey : 'AIzaSyDgeWFx_kGWHDEtYu6GI1Mtqfne7EBegvE',
		tables : ["1csCNQOOZb0pOfPGdm_osVBXkClZeV3xQCfJFgks3",
					"1LQIY2WfXUN7ypV4Onl3wZ9lgoXVTwQrTDiCq-NVN",
					"1R97kO4E0jE9FFFjHB9zVxga1CC6I77r-Q83DzNKP",
					"1PClz7-pWCGPMorMIYoHl0m9BOz-lp95uQLYwTWyb"]
	},
	methods: {
		onInit : function(){
			this.showMap([50.72724,12.48839]);
			this.loadLayers();
		},
		loadLayers : function() {
			var	that = this	;
			for (var i = 0; i < this.tables.length; i++) {
				this.getLayer(this.tables[i],i,function(index,layer){
					that.layers[index] = layer;
					if(index===0){
						that.showLayer(0);
					}
				});
			}
		},
		showLayer : function (id){
			for(var i = 0; i < this.layers.length; i++) {
				this.layers[i].setMap(null);
			}

			if(id===0){
				$( "#googft-legend" ).removeClass( "hide" );
				this.layers[id].map =  this.map;
				this.layers[id].enableMapTips({
					select: "'address','price'",
					from: this.tables[0],
					geometryColumn: 'location', // geometry column name
					suppressMapTips: false,
					delay: 100,
					tolerance: 25,
					style: "text-align: left;",
					googleApiKey: this.googleApiKey,
					htmlTemplate: function(rows) {
						return '<div style="text-align: left;"><h6>Address: </h6>' + rows[0][0] + '<br><h6>Rent Rate / m² : </h6>€'+rows[0][1] + '</div>';
					}
				});
				google.maps.event.addListener(this.layers[id], 'click', function(fEvent) {
					var row = fEvent.row;
				});
			}else{
				$( "#googft-legend" ).addClass( "hide" );
			}
			this.layers[id].setMap(this.map);
		},
		showMap: function (center){
			var mapOptions = {
				zoom: 14,
				center: new google.maps.LatLng(center[0], center[1]),
				mapTypeId: google.maps.MapTypeId.ROADMAP
			};
			var that=this;
			gapi.client.setApiKey(this.googleApiKey);
			that.map = new google.maps.Map(document.getElementById('map-canvas'),mapOptions);

			//var marker = new google.maps.Marker({
			//	position: new google.maps.LatLng(center[0], center[1]),
			//	map: that.map,
			//	title: 'Click me'     });


		},
		getLayer : function(table_id,index,callback) {

            var that = this;
			if(index ===0 ){
				this.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(document.getElementById('googft-legend-open'));
				this.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(document.getElementById('googft-legend'));
				var layer = new google.maps.FusionTablesLayer({
					query: {
						select: 'location',
						from: table_id
					},
					suppressInfoWindows: true,
					heatmap: {
						enabled: false
					},
					map : that.map,
					options: {
				        styleId: 2,
				        templateId: 2
				      }

				});
				//layer.enableMapTips({
				//	select: "'address','price'",
				//	from: table_id,
				//	geometryColumn: 'location', // geometry column name
				//	suppressMapTips: false,
				//	delay: 100,
				//	tolerance: 25,
				//	style: "text-align: left;",
				//	googleApiKey: that.googleApiKey,
				//	htmlTemplate: function(rows) {
				//		return '<div style="text-align: left;"><h6>Address: </h6>' + rows[0][0] + '<br><h6>Rent Rate / m² : </h6>€'+rows[0][1] + '</div>';
				//	}
				//});
				// google.maps.event.addListener(layer, 'mouseover', function(fEvent) {
				//google.maps.event.addListener(layer, 'click', function(fEvent) {
				//	var row = fEvent.row;
				//});
				//google.maps.event.addListener(layer, 'mouseout', function(fevt) {
				//	document.getElementById('info').innerHTML = '';
				//});
				//layer.setMap(that.map);
				//that.layers[0] = layer;

				callback(0,layer);
			} else {
				gapi.client.load('fusiontables', 'v1',function(){
					var query_price = 'select col1, col2 from ' + table_id + ' limit 1000',
							query_bsn_vac = 'select col0 from ' + table_id + ' limit 1000',
							query_dens = 'select col0,col1 from ' + table_id + ' limit 1000',
							request,
							query;
					query = (index ===0 ?  query_price : ( index ===3 ? query_dens : query_bsn_vac));
					request = gapi.client.fusiontables.query.sqlGet({ sql: query });
					request.execute(function(response) {
						that.onDataFetched(response,index,callback);
					});

				});
			}


		},
		onDataFetched : function(response,index,callback) {
			var that = this;
			if (response.error) {
				alert('Unable to fetch data. ' + response.error.message +
						' (' + response.error.code + ')');
			} else {
				var heatmap = new google.maps.visualization.HeatmapLayer({
					dissipating: true,
					gradient: this.getGradient(),
					opacity: 0.5,//0.44,
					radius: 25,//index === 3 ? 50 : 25 ,
					data: this.extractLocations(response.rows,index)
				});
				if(index===0){
					heatmap.setMap(that.map);
				}
				callback(index,heatmap);
			}
		},
		extractLocations : function(rows,indx) {
			// Patterns for latitude/longitude in a single field, separated by a space
			// or comma, with optional north/south/east/west orientation
			var numberPattern = '([+-]?\\d+(?:\\.\\d*)?)';
			var latPattern = numberPattern + '\\s*([NS])?';
			var lngPattern = numberPattern + '\\s*([EW])?';
			var latLngPattern = latPattern + '(?:\\s+|\\s*,\\s*)' + lngPattern;
			var northRegexp = /N/i;
			var eastRegexp = /E/i;
			var parseRegexp = new RegExp(latLngPattern, 'i');
			var locations = [];
			for (var i = 0; i < rows.length; ++i) {
				var row = rows[i];
				if (row[0]) {
					var parts = row[0].match(parseRegexp);
					if (parts) {
						var latString = parts[1];
						var latOrientation = parts[2];
						var lngString = parts[3];
						var lngOrientation = parts[4];
						var lat = parseFloat(latString);
						var lng = parseFloat(lngString);
						if (latOrientation) {
							var latAdjust = northRegexp.test(latOrientation) ? 1 : -1;
							lat = latAdjust * Math.abs(lat);
						}
						if (lngOrientation) {
							var lngAdjust = eastRegexp.test(lngOrientation) ? 1 : -1;
							lng = lngAdjust * Math.abs(lng);
						}
						var latLng = new google.maps.LatLng(lat, lng);
						if(indx ===0 || indx ===3){
							var weight = row[1];
							locations.push({ location: latLng, weight: parseFloat(weight) });
						}else{
							locations.push({ location: latLng });
						}

					}
				}
			}
			return locations;
		},
		getGradient : function(city) {

			var ret = [
				//'rgba(127,182,29,0)',
				//'rgba(116, 168, 32,1)',
				//'rgba(106, 155, 35,1)',
				//'rgba(96, 142, 38,1)',
				//'rgba(85, 129, 41,1)',
				//'rgba(75, 116, 44,1)',
				//'rgba(65, 102, 47,1)',
				//'rgba(54, 89, 50,1)',
				//'rgba(44, 76, 53,1)',
				//'rgba(34, 63, 56,1)',
				//'rgba(24, 50, 60,1)',
				'rgba(102,255,0,0)',
				'rgba(147,255,0,1)',
				'rgba(193,255,0,1)',
				'rgba(238,255,0,1)',
				'rgba(244,227,0,1)',
				'rgba(244,227,0,1)',
				'rgba(249,198,0,1)',
				'rgba(255,170,0,1)',
				'rgba(255,113,0,1)',
				'rgba(255,57,0,1)',
				'rgba(255,0,0,1)'
			];

            return ret;

		},

	}
})
