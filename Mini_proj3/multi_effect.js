	var context = new AudioContext();

	// Buffer source
	var source = null;
	var myAudioBuffer = null;
	var loopPlayBack = false;
	
	///////////////////////////////////////////

	///////////////////////////////////////////
	// Reverberation effect
	// convolver
	var reverb_types = [
		"sample1.wav",
		"sample2.wav",
		"sample3.wav",
		"sample4.wav"
	];

	var reverb_params = {
		type : "sample1.wav",
		wetdryRatio : 0.2
	}

	var convolver = context.createConvolver();
	var dryGain = context.createGain();
	var wetGain = context.createGain();
	var reverb_bypass = false;
	
	var impulseResponse = null;
	


	///////////////////////////////////////////
	// Initialization

	window.onload=function(){

		// select a room impulse response 
		var reverbSelect = document.getElementById("reverbDropdown");
		for (var i in reverb_types) {
			var option = document.createElement("option");
			option.text = reverb_types[i];
			option.value = reverb_types[i];
			reverbSelect.appendChild(option);
		}
		reverbSelect.addEventListener("change", changeReverbType, false);


		// get convas to plot amp response
		canvas = document.getElementById("amp_response");				
		canvas.width =  WIDTH;
		canvas.height = HEIGHT;
				
		updateReverb();	
	}
	

	///////////////////////////////////////////	
	// jQuery-based knob control settings (Reverb)
	$(function() {
		$( ".reverb_wet_dry_ratio" ).knob({
			change: function (value) {
				reverb_params.wetdryRatio = value;		
				updateReverb(); 		
			},
			'min': 0,
	    	'max': 0.99,
			'step': 0.01
		});
	});
	

	///////////////////////////////////////////
	// event handlers
	///////////////////////////////////////////
	
	function changeReverbType(e){
		var reverbName = e.target.value;		
		reverb_params.type = reverbName;		
		updateReverb(); 		
	}
	

	// update convolver parameters
	function updateReverb() { 	
		// update filter parameters
		dryGain.gain.value = 1-reverb_params.wetdryRatio;
		wetGain.gain.value = reverb_params.wetdryRatio;
		
		loadImpulseResponse(reverb_params.type)
	}
	
	
	///////////////////////////////////////////
	//load impulse response
	function loadImpulseResponse(type) {
		var request = new XMLHttpRequest();
		var url = type; //"memchu_ir2.wav";
	  	request.open('GET', url, true);
	  	request.responseType = 'arraybuffer';
	  	request.onload = function() {
	    context.decodeAudioData(request.response, function(buffer) {
			convolver.buffer = buffer;
	    });
	  }
	  request.send();
	}	
	

	// -KYSun- onoff gains for temp process of bypass for each filter, delay and reverb

		var reverb_onoff = context.createGain();

		reverb_onoff.gain = 1;


		/////////////////////////////////////////////////////
		// -KYSun- toggle functions for reverb

	function toggleReverbBypass() {
		if ( reverb_bypass ) {
			reverb_onoff.disconnect();
			reverb_onoff.connect(convolver);
			reverb_onoff.connect(dryGain);
			reverb_bypass = false;
		}
		else {
			reverb_onoff.disconnect();
			reverb_onoff.connect(context.destination);
			reverb_bypass = true;
		}
	}	