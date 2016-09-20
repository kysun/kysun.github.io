	var context = new AudioContext();

	// Buffer source
	var source = null;
	var myAudioBuffer = null;
	var loopPlayBack = false;

	///////////////////////////////////////////
	// Biquad filter default
	var biquad_params = {
		type : "lowpass",
		frequency : 5000,
		Q : 1,
		gain: 4
	}

	var filter_types = [
		"lowpass",
		"highpass",
	    "bandpass",
		"lowshelf",
		"highshelf",
		"peaking",
		"notch",
		"allpass"
	];
	var biquad = context.createBiquadFilter();
	var biquad_bypass = false;

	
	///////////////////////////////////////////
	// Delay effect
	var delay_params = {
		delayTime : 0.5,
		feedbackGain : 0.1
	}
	var delay = context.createDelay();
	var feedbackGain = context.createGain();
	var delay_bypass = false;
		

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
	// Amp response plot
	var canvas = null;
	var WIDTH = 512;
	var HEIGHT = 256;
	
	var numFreqs = 200;
	var magResponse = new Float32Array(numFreqs); // magnitude
	var phaseResponse = new Float32Array(numFreqs);  // phase

    var freqBins = new Float32Array(numFreqs);
 
    for(var i = 0; i < numFreqs; ++i) {
       freqBins[i] = context.sampleRate/2*(i+1)/numFreqs;
    }


	///////////////////////////////////////////
	// Initialization

	window.onload=function(){
		
		// select a filter
		var filterSelect = document.getElementById("filtersDropdown");
		for (var i in filter_types) {
			var option = document.createElement("option");
			option.text = filter_types[i];
			option.value = filter_types[i];
			filterSelect.appendChild(option);
		}
		filterSelect.addEventListener("change", changeFilterType, false);


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
		
		updateFilter();	
		updateDelay();			
		updateReverb();	
	}
	

	///////////////////////////////////////////
	// jQuery-based knob control settings (Biquad-filter)
	$(function() {
		$( ".filter_freq_knob" ).knob({
			change: function (value) {
				biquad_params.frequency = value;		
				updateFilter(); 		
			},
			'min':100,
	    	'max':10000,
			'step': 1
		});
	});
	
	$(function() {
		$( ".filter_Q_knob" ).knob({
			change: function (value) {
				biquad_params.Q = value;		
				updateFilter(); 		
			},
			'min':0.01,
	    	'max': 40,
			'step': 0.1
		});
	});
	
	$(function() {
		$( ".filter_gain_knob" ).knob({
			change: function (value) {
				biquad_params.gain = value;		
				updateFilter(); 		
			},
			'min': -40,
	    	'max': 40,
			'step': 0.1
		});
	});
	
	// jQuery-based knob control settings (Delay)
	$(function() {
		$( ".delay_delay_time" ).knob({
			change: function (value) {
				delay_params.delayTime = value;		
				updateDelay(); 		
			},
			'min': 0,
	    	'max': 2,
			'step': 0.001
		});
	});
	
	$(function() {
		$( ".delay_feedback_gain" ).knob({
			change: function (value) {
				delay_params.feedbackGain = value;		
				updateDelay(); 		
			},
			'min': 0,
	    	'max': 0.99,
			'step': 0.01
		});
	});
	
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

	function changeFilterType(e){
		var filterName = e.target.value;		
		biquad_params.type = filterName;		
		updateFilter(); 		
	}
	
	function changeReverbType(e){
		var reverbName = e.target.value;		
		reverb_params.type = reverbName;		
		updateReverb(); 		
	}
	
	
	///////////////////////////////////////////
	// update filter parameters
	function updateFilter() {		
		// update filter parameters
		biquad.type = biquad_params.type;
		biquad.frequency.value  = biquad_params.frequency ;
		biquad.Q.value = biquad_params.Q;
		biquad.gain.value = biquad_params.gain;
		
		// update filter plot
		drawFrequencyResponse();		
	}
	
	// update delay parameters
	function updateDelay() { 	
		// update filter parameters
		delay.delayTime.value = delay_params.delayTime;
		feedbackGain.gain.value  = delay_params.feedbackGain ;
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
	
	
	///////////////////////////////////////////
	// plot amplitude response	  	  
	function drawFrequencyResponse() {
		var drawContext = canvas.getContext("2d");		

		// fill rectangular
		drawContext.fillStyle = 'rgb(200, 200, 200)';
		drawContext.fillRect(0, 0, WIDTH, HEIGHT);
		
	    var barWidth = WIDTH / numFreqs;
    
	    // get magnitude response
		biquad.getFrequencyResponse(freqBins, magResponse, phaseResponse);

	    drawContext.strokeStyle = "black";
	    drawContext.beginPath();
	    for(var frequencyStep = 0; frequencyStep < numFreqs; ++frequencyStep) {
			drawContext.lineTo(frequencyStep * barWidth, HEIGHT - magResponse[frequencyStep]*HEIGHT/2);
	    }
	    drawContext.stroke();
    } 


	///////////////////////////////////////////

	// -KYSun- onoff gains for temp process of bypass for each filter, delay and reverb
		var biquad_onoff = context.createGain();
		var delay_onoff = context.createGain();
		var reverb_onoff = context.createGain();

		biquad_onoff.gain = 1;
		delay_onoff.gain = 1;
		reverb_onoff.gain = 1;

	// -KYSun- using getUserMedia to stream the microphone


	if (!navigator.getUserMedia)
		navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
							  
	if (!navigator.getUserMedia)
		alert("Error: getUserMedia not supported!");
						
	// get audio input streaming

	navigator.getUserMedia({audio: true}, onStream, onStreamError);	

	function onStream(stream) {

		var input = context.createMediaStreamSource(stream);
		input.connect(biquad_onoff);
		playSound();
	}	

	// errorCallback			 
	function onStreamError(error) {
		console.error('Error getting microphone', error);
	}


	function playSound(anybuffer) {
		/////////////////////////////////////////////////////
		// TODO: cascade three audio effect units
		// 	Biquad --> Delay (w/feedback) --> Reverb   
		//
		// fill out the following part
		/////////////////////////////////////////////////////
				
		// -KYSun- if statements for initial conditions
		// in the case of  stop and then start again 
		if (!biquad_bypass){
			biquad_onoff.connect(biquad);
			biquad.connect(delay_onoff);
		}
		else{
			biquad_onoff.connect(delay_onoff)
		}

		if (!delay_bypass){
			delay_onoff.connect(delay);
			delay.connect(reverb_onoff);
			delay.connect(feedbackGain);
			feedbackGain.connect(delay);
		}
		else {
			delay_onoff.connect(reverb_onoff);
		}

		if (!reverb_bypass){
			reverb_onoff.connect(convolver);
			convolver.connect(wetGain);
			wetGain.connect(context.destination);
			reverb_onoff.connect(dryGain);
			dryGain.connect(context.destination);		
		}
		else{
			reverb_onoff.connect(context.destination);
		}
	
		source.start();

	}
		///////////////////////////////////////////
		// -KYSun- toggle functions for filter, delay and reverb

function toggleFilterBypass() {
		if ( biquad_bypass ) {
			biquad_onoff.disconnect();
			biquad_onoff.connect(biquad);
			biquad_bypass = false;
		}
		else {
			biquad_onoff.disconnect();
			biquad_onoff.connect(delay_onoff);
			biquad_bypass = true;
		}
	}	

	function toggleDelayBypass() {
		if ( delay_bypass ) {
			delay_onoff.disconnect();
			delay_onoff.connect(delay);
			delay_bypass = false;
		}
		else {
			delay_onoff.disconnect();			
			delay_onoff.connect(reverb_onoff);
			delay_bypass = true;
		}
	}	

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