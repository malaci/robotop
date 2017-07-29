/**
 * Created by michael on 5/19/2017.
 */
var app = new Vue({
	el: '#app1',
	data: {
		message: '',
		inputdata : '',
		rows: [
			//initial data
			//{item: "Something", price: 55.20},
			//{ item: "Something else", price: 1255.20},
		],
		level : 0,
		vacancies : 0,
		map : null,
	},
	methods: {
		getColor : function (l) {
			var res;
			switch(l) {
				case 0:
					res = "#00C851"
					break;
				case 1:
					res = "#ffbb33";
					break;
				case 2:
					res = "#ff7043";
					break;
				default:
					res = "#ff4444";
			}
			return res;
		},
		getColorClass : function () {
			var res;
			switch(this.level) {
				case 0:
					res = "green";
					break;
				case 1:
					res = "yellow";
					break;
				case 2:
					res = "deep-orange";
					break;
				default:
					res = "red";
			}
			return res;
		},
		searchAddress: function () {
			//this.message = this.inputdata.split('').reverse().join('');

			var data = {"input":this.inputdata},
				that=this;
			that.message ="";
			//that.rows=[];
			if(this.inputdata.length ===0 ){
				return;
			}
			if(this.inputdata.length < 10 ){
				that.message = "The address is too short";
				return;
			}
			$.ajax({
				url: 'https://2zowgqu0v5.execute-api.eu-west-1.amazonaws.com/prod/list',
				type: 'POST',
				crossDomain: true,
				contentType: 'application/json',
				data:JSON.stringify(data),
				dataType: "json",
				success: function(data) {
					var res = "not found";
					if(data.found ===true){
						that.found = true;
						res = data.avg_price;
						for( var i =0;i< data.levels.length;i++){
							if(res <=data.levels[i]){
								that.level = i;
								break;
							}
						};
						$( ".not-found-container" ).addClass( "hide" );
						that.vacancies =data.in_range.length;
						that.showMap(data.location,that.level,data.table_id);
						that.rows.unshift({item:data.formatted_address,price: res,level:that.level});
					}else{
						$( ".not-found-container" ).removeClass( "hide" )

					}

				},
				error: function(xhr, ajaxOptions, thrownError) {
					that.message ="Cannot find the address"
				}
			});
		},
		showMap: function (center,lvl,table_id){
			var mapOptions = {
				zoom: 14,
				center: new google.maps.LatLng(center[0], center[1]),
				mapTypeId: google.maps.MapTypeId.ROADMAP
			};
			var that=this;
			gapi.client.setApiKey('AIzaSyDgeWFx_kGWHDEtYu6GI1Mtqfne7EBegvE');
			that.map = new google.maps.Map(document.getElementById('map-canvas'),mapOptions);
			var circle = new google.maps.Circle({
				strokeColor: that.getColor(lvl),
				strokeOpacity: 0.5,
				strokeWeight: 1,
				fillColor: that.getColor(lvl),
				fillOpacity: 0.35,
				map: that.map,
				center: {lat: center[0], lng: center[1]},
				radius:  1000
			});
			var marker = new google.maps.Marker({
				position: new google.maps.LatLng(center[0], center[1]),
				map: that.map,
				title: 'Click me'     });
			var layer = new google.maps.FusionTablesLayer({
				query: {
					select: 'location',
					from: table_id
				},
				heatmap: {
					enabled: false
				}
			});
			layer.setMap(that.map);
			$( ".map-container" ).removeClass( "hide" )

			gapi.client.load('fusiontables', 'v1',function(){


				var query = 'select col1, col2 from ' + table_id + ' limit 1000' ;
				var request = gapi.client.fusiontables.query.sqlGet({ sql: query });
				request.execute(function(response) {
					that.onDataFetched(response);
				});


				//$( ".map-container" ).removeClass( "hide" )
			});

		},
		onDataFetched : function(response) {
			if (response.error) {
				alert('Unable to fetch data. ' + response.error.message +
						' (' + response.error.code + ')');
			} else {
				this.drawHeatmap(this.extractLocations(response.rows));
			}
		},
		extractLocations : function(rows) {
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
						var weight = row[1];
						locations.push({ location: latLng, weight: parseFloat(weight) });
					}
				}
			}
			return locations;
		},
		getGradient : function(city) {

			var ret = [
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
		drawHeatmap:  function(locations) {
			var heatmap = new google.maps.visualization.HeatmapLayer({
				dissipating: true,
				gradient: this.getGradient(),
				opacity: 0.44,
				radius: 64,
				data: locations
			})
			heatmap.setMap(this.map);

		},
	}
})
