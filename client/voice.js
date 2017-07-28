Template.voice.onCreated(function voiceOnCreated(){
  this.voiceDict = new ReactiveDict();
  this.recognition_engine = new webkitSpeechRecognition();
  this.voiceDict.set("recording_status", "inactive");
  // Session.set("onlinePage", .findOne({owner:Meteor.userId()}).state);
  Meteor.subscribe("regis_voice_info");
//   if((Profiles.findOne({owner:Meteor.userId()}) != null) && (Session.get("statepage") == undefined)){
//   Meteor.subscribe("Statereginfo", {abbr:Session.get("statepage")});
//   Session.set("statepage", Profiles.findOne({owner:Meteor.userId()}).state);
//
//   // console.log("Statepage = "+this.statepage);
// }
})

Template.voice.helpers({
  ifInactive: function(){
    const voiceDict = Template.instance().voiceDict
    return voiceDict.get("recording_status") == "inactive";
  },

  ifSpeaking: function(){
    const voiceDict = Template.instance().voiceDict
    return voiceDict.get("recording_status") == "speaking";
  },

  isProcessing: function(){
    return Template.instance().voiceDict.get("recording_status") === "processing";
  },
  // page: function() {
  //   return Session.get("statepage");
  //   // return Template.instance().statepage;
  // },
  //
  // // This fuction is what is used to populate the static-template with dynamic data.
  // // For now it's using an array but we late we can pull the array from collections.
  // pageData: function() {
  //   var page = Session.get("statepage")
  //   console.log(page+" is where we are getting data for");
  //   //When we get the collection and agree on a format we we swap out the manual data array for a collection grab
  //   var data = Statereginfo.findOne({abbr:page});
  //   console.log("Page data is pulled from "+data.toString());
  //   return {contentType:page, items:data};
  // },

})

Template.voice.events({
  'click #recordAudioButton'(elt,instance){
    console.log(Session.get("statepage"));
    const voiceDict = Template.instance().voiceDict;
    var recognition_engine = Template.instance().recognition_engine;
    Template.instance().voiceDict.set("recording_status", "speaking");
    var page, voice_data;
    if(Router.current().url.match("register")){
      page = Session.get("statepage");
      voice_data = Regis_voice_info.findOne({abbr:page}).online;
    }
    console.log(voice_data);
    recognition_engine.continuous = true;
    recognition_engine.lang = 'en-US';
    recognition_engine.on
    recognition_engine.onend = function(){
      console.log("ended");
    }
    recognition_engine.onstart = function(){
      console.log("started");
    }
    recognition_engine.onresult = function(event) {
      const text = event.results[0][0].transcript;
      console.log(text);
      //set voiceDict = processing
      if(voiceDict.get("processing_status") === "processing") return;
      voiceDict.set("processing_status", "processing");
      Meteor.call("sendJSONtoAPI_ai", text, { returnStubValue: true }, function(err, result){
        if(err){
          window.alert(err);
          return;
        }
        console.log(result.data.result.metadata.intentName);
        if(result.data.result.metadata.intentName == "register_online" && Router.current().url.match("register")){
         responsiveVoice.speak(voice_data, "US English Male");
       } else if(result.data.result.metadata.intentName == "register_online" && !Router.current().url.match("register")){
         responsiveVoice.speak("Find more information about how to register online, in person, and by mail on our register page.", "US English Male");
       } else if(result.data.result.metadata.intentName == "stop"){
         voiceDict.set("recording_status", "inactive");
         recognition_engine.stop();
         return;
       } else{
          console.log(result);
          console.log(result.data.result.metadata.intentName);
          responsiveVoice.speak(result.data.result.speech, "US English Male", {rate: 1.05});
         }
        recognition_engine.stop();
        setTimeout(function(){
          voiceDict.set("processing_status", "not_processing");
          recognition_engine.start();
        }, 2000)
      })
    };
    recognition_engine.start();
  },
  'click #stopRecordAudioButton'(elt,instance){
    var recognition_engine = Template.instance().recognition_engine;
    Template.instance().recognition_engine.stop();
    Template.instance().voiceDict.set("recording_status", "inactive");
  },
})
