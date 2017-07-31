/**
 * Created by michael on 5/19/2017.
 */
var app = new Vue({
	el: '#app1',
	data: {
		map_center : [52.20558826791002, 4.879429816894572],
		message: '',
		inputdata : '',
		level : 0,
		rows: [
		],
		vacancies : 0,
		map : null,
		layers : [],
		circle : null,
		marker : null,
		googleApiKey : 'AIzaSyDgeWFx_kGWHDEtYu6GI1Mtqfne7EBegvE',
		tables : ["1LPZq3-Ln6I9eXoiVJanOpktJfBFonogRQeRSiezV",
		          "1ISzdfO_jC5DJCWw18xctkDuOKNOwzo6RWIdLSjp2",
		          "1xpYXatNhvjsqLUnq87Vhi4FPh77qoX7sL-9BwMX8"]
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
		onInit : function(){
			this.showMap(this.map_center,false);
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
				//this.layers[id].enableMapTips({
				//	select: "'address','price'",
				//	from: this.tables[0],
				//	geometryColumn: 'location', // geometry column name
				//	suppressMapTips: false,
				//	delay: 100,
				//	tolerance: 25,
				//	style: "text-align: left;",
				//	googleApiKey: this.googleApiKey,
				//	htmlTemplate: function(rows) {
				//		return '<div style="text-align: left;"><h6>Address: </h6>' + rows[0][0] + '<br><h6>Rent Rate / m² : </h6>€'+rows[0][1] + '</div>';
				//	}
				//});
				//google.maps.event.addListener(this.layers[id], 'click', function(fEvent) {
				//	var row = fEvent.row;
				//});
			}else{
				$( "#googft-legend" ).addClass( "hide" );
			}
			this.layers[id].setMap(this.map);
		},
		showMap: function (center,search){
			var that = this;
			if(!search) {
				var mapOptions = {
					zoom: 10,
					center: new google.maps.LatLng(center[0], center[1]),
					mapTypeId: google.maps.MapTypeId.ROADMAP
				};
				//gapi.client.setApiKey(this.googleApiKey);
				that.map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
			} else {
				if(that.circle){
					that.circle.setMap(null);
				}
				if(that.marker){
					that.marker.setMap(null);
				}
				if(center){
					that.map.panTo(new google.maps.LatLng(center[0], center[1]));
					that.map.setZoom(12);
					that.circle = new google.maps.Circle({
						strokeColor: that.getColor(that.level),
						strokeOpacity: 0.5,
						strokeWeight: 1,
						fillColor: that.getColor(that.level),
						fillOpacity: 0.35,
						map: that.map,
						center: {lat: center[0], lng: center[1]},
						radius:  1000
					});

					that.marker = new google.maps.Marker({
						position: new google.maps.LatLng(center[0], center[1]),
						map: that.map,
						title: ''     });

				} else {
						that.map.panTo(new google.maps.LatLng(that.map_center[0], that.map_center[1]));
						that.map.setZoom(10);
				}
				$("#rd-bsn").prop("checked", true);
				that.showLayer(0);
			}



		},
		getLayer : function(table_id,index,callback) {

            var that = this;
			if(index ===0 ){
				this.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(document.getElementById('googft-legend-open'));
				this.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(document.getElementById('googft-legend'));
				var layer = new google.maps.FusionTablesLayer({
					query: {
						select: "col2\x3e\x3e1",
						from: table_id,
						where:'number-of-listings' > 2
					},
					//suppressInfoWindows: true,
					heatmap: {
						enabled: false
					},
					//map : that.map,
					options: {
				        styleId: 2,
				        templateId: 2
				      }

				});

				callback(0,layer);
			} else {

				var layer = new google.maps.FusionTablesLayer({
					query: {
						select: "location",
						from: table_id
					},
					//suppressInfoWindows: true,
					heatmap: {
						enabled: index == 1,
						radius: 25
					},
					//map : that.map,
					options: {
						styleId: 2,
						templateId: 2
					}

				});
				callback(index,layer);
			}
		},
		searchAddress: function () {
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
						that.showMap(data.location,true);
						that.rows.unshift({item:data.formatted_address,price: res,level:that.level});
					}else{
						$( ".not-found-container" ).removeClass( "hide" )
						that.rows = [];
						that.showMap(null,true);
					}

				},
				error: function(xhr, ajaxOptions, thrownError) {
					that.message ="Cannot find the address"
				}
			});
		},

	}
})
