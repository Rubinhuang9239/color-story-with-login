// p5.speech - Basic
var story = new p5.Speech(); // speech synthesis object
story.listVoices();





function say(something) {
	// chair.setVoice(Math.floor(random(chair.voices.length)));  // Randomize the available voices
	story.setPitch(1.0);
	story.setRate(1.1);
	story.speak(something); // say something
}