(function() {
	
	angular.module("sjcamRemoteApp", ["xml", "duScroll"])
	.factory('timeoutHttpInterceptor', timeoutHttpInterceptor)
	.config(MainConfig)
	.controller("MainController", MainController);
	
	timeoutHttpInterceptor.$inject = [];
	function timeoutHttpInterceptor() {
		return {
		      'request': function(config) {
		        config.timeout = 2500;
		        return config;
		      }
	    };
	}
	
	MainConfig.$inject = ["$httpProvider"];
	function MainConfig($httpProvider) {
		$httpProvider.interceptors.push('timeoutHttpInterceptor');
	    $httpProvider.interceptors.push('xmlHttpInterceptor');
	}
	
	MainController.$inject = ["$scope", "$http", "$timeout"];
	function MainController($scope, $http, $timeout){
		var vm = this;
		
		vm.init = init;
		vm.openWiFiSettings = openWiFiSettings;
		vm.connect = connect;
		vm.snap = snap;
		
		vm.isWiFiSet = false;
		vm.isConnecting = false;
		vm.isConnected = false;
		
		vm.cameraMode = 1; //0: Photo, 1: Movie
		
		var CONFIG_MENU = {
				'1002':['Photo_Image_Size', '12M_4032x3024', '10M_3648x2736', '8M_3264x2448', '5M_2592x1944', '3M_2048x1536', '2MHD_1920x1080', 'VGA_640x480', '1.3M_1280x960'],
				'1006':['Sharpness', 'Strong', 'Normal', 'Soft'],
				'1007':['White_Balance', 'Auto', 'Daylight', 'Cloudy', 'Tungsten', 'Flourescent'],
				'1008':['Colour', 'Colour', 'B/W', 'Sepia'],
				'1009':['ISO', 'Auto', '100', '200', '400'],
				'1011':['Anti_Shaking', 'Off', 'On'],
				'2002':['Movie_Resolution', '1080FHD_1920x1080', '720P_1280x720_60fps', '720P_1280x720_30fps', 'WVGA_848x480', 'VGA_640x480'],
				'2003':['Cyclic_Record', 'Off', '3_Minutes', '5_Minutes', '10_Minutes'],
				'2004':['HDR/WDR', 'Off', 'On'],
				'2005':['Exposure', '+2.0', '+5/3', '+4/3', '+1.0', '+2/3', '+1/3', '+0.0', '-1/3', '-2/3', '-1.0', '-4/3', '-5/3', '-2.0'],
				'2006':['Motion_Detection', 'Off', 'On'],
				'2007':['Audio', 'Off', 'On'],
				'2008':['Date_Stamping', 'Off', 'On'],
				'2019':['Videolapse','Off', '1_Second', '2_Seconds', '5_Seconds', '10_Seconds', '30_Seconds', '1_Minute'],
				'3007':['Auto_Power_Off', 'Off', '3_Minutes', '5_Minutes', '10_Minutes'],
				'3008':['Language', 'English', 'French', 'Spanish', 'Polish', 'German', 'Italian', 'Unknown_1', 'Unknown_2', 'Russian', 'Unknown_3', 'Unknown_4', 'Unknown_5', 'Portugese'],
				'3010':['Format', 'Cancel', 'OK'],
				'3011':['Default_Setting', 'Cancel', 'OK'],
				'3025':['Frequency', '50Hz', '60Hz'],
				'3026':['Rotate', 'Off', 'On'],
				}
		
		vm.cameraIp = "192.168.1.254";
		vm.cameraSettings = {};
		
		vm.init();
		
		vm.systemInfoWifiNetwork = {
				ipAddress: null,
				ipv6Address: null,
				macAddress: null,
				signalStrength: null,
				ssid: null,
				status: null
			};

		var isRecording = false;
		

	    function init() {
	        setDefaultEvents();
	    	
			console.debug("Program is initiated");
			
			tizen.systeminfo.getPropertyValue("WIFI_NETWORK", 
					function (systemInfoWifiNetwork) {
						$scope.$apply(function(){
							vm.systemInfoWifiNetwork = systemInfoWifiNetwork;
							
							if(systemInfoWifiNetwork.status != "ON"){
								alert("Please open wifi!");
								vm.openWiFiSettings();
							}else if(!angular.isString(systemInfoWifiNetwork.ipAddress)){
								alert("Please select a wifi network!");
								vm.openWiFiSettings();
							}else{
								vm.isWiFiSet = true;
							}
							
						});
					}, function (e) {
						$scope.$apply(function(){
							vm.isWiFiSet = false;
							alert(e.message);
						});
					});
			
	    }
	    
	    function openWiFiSettings() {
			tizen.application.launch("com.samsung.wifi", angular.noop, angular.noop);
		}
		
		function connect() {
			//Test connection
			vm.isConnecting = true;
			$http.get("http://" + vm.cameraIp + "/?custom=1&cmd=3014")
			.then(function(response){

				vm.isConnecting = false;
				
				var rawSettings = response.data["Function"];
				
				vm.cameraSettings = {};
				angular.forEach(rawSettings["Cmd"], function(rawSettingCmd, rawSettingCmdIndex) {
					if(angular.isArray(CONFIG_MENU[rawSettingCmd])){
						vm.cameraSettings[CONFIG_MENU[rawSettingCmd][0]] = CONFIG_MENU[rawSettingCmd][(parseInt(rawSettings["Status"][rawSettingCmdIndex]) + 1)];
					}
				});
				
				
				$http.get("http://" + vm.cameraIp + "/?custom=1&cmd=3016").then(function(result) {
					vm.cameraMode = parseInt(result.data["Function"]["Status"]);
					
					vm.isConnected = true;
					
				}, connectionFailure);
				
			}, connectionFailure);
			
			function connectionFailure(e){
				vm.isConnecting = false;
				alert("Can not connect to camera!");
				tizen.application.launch("com.samsung.wifi", angular.noop, angular.noop);
			}

		}


	    function snap(){
	    	
	    	if(vm.isConnected){
	    		//TODO: kamera moduna göre değiştir.
	    		
//	    		if(isRecording){
//		    		$("#snap").prop("disabled", true);
//					$("#snap").text("Stopping...");
//		    		$.get("http://" + vm.cameraIp + "/?custom=1&cmd=2001&par=0")
//		    		.done(function(data){
//		    			isRecording = false;
//		    			$("#snap").text("Start");
//		    			$("#snap").css("background", "red");
//		    		}).fail(function(data){
//		    			$("#snap").text("Stop");
//		    			alert("No connection!");
//		    			console.error(data);
//		    		})
//		    		.always(function(){
//		    		$("#snap").prop("disabled", false);
//		    		});
//		    	}else{
//		    		$("#snap").prop("disabled", true);
//					$("#snap").text("Starting...");
//		    		$.get("http://" + vm.cameraIp + "/?custom=1&cmd=2001&par=1")
//		    		.done(function(data){
//		    			isRecording = true;
//		    			$("#snap").text("Stop");
//		    			$("#snap").css("background", "black");
//		    		}).fail(function(data){
//		    			$("#snap").text("Start");
//		    			alert("No connection!");
//		    			console.error(data);
//		    		})
//		    		.always(function(){
//		        		$("#snap").prop("disabled", false);
//		    		});
//		    	}
//	    		
	    	}
	    	
	    }
	    
	    function setDefaultEvents() {
	        document.addEventListener("tizenhwkey", function(event){
	        	if (event.keyName === "back") {
		            try {
		                tizen.application.getCurrentApplication().exit();
		            } catch (ignore) {}
		        }
	        });
	        
	        document.addEventListener('rotarydetent', function(event) {
	            var direction = event.detail.direction;

	            if (direction == 'CW') {
	            	angular.element(".ui-scroller").scrollTopAnimated(angular.element(".ui-scroller").scrollTop() + 75, 125);
	            	console.log("cw" + $(".ui-scroller")[0].scrollTop);
	            } else if (direction == 'CCW') {
	            	angular.element(".ui-scroller").scrollTopAnimated(angular.element(".ui-scroller").scrollTop() - 75, 125);
	            	console.log("ccw" + $(".ui-scroller")[0].scrollTop);
	            }
	        });
	    }

		
	}
    
}());