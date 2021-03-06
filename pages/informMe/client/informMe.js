Template.informMe.onCreated(function(){
  Meteor.subscribe('politicians');
  Meteor.subscribe('bills');
  Meteor.subscribe('poliinfo');
  Meteor.subscribe("profiles", {owner:Meteor.userId()});

  Meteor.call('politicians.clear');
  Meteor.call('bills.clear');
  Meteor.call('poliinfo.clear');
  this.voiceDict = new ReactiveDict();
  this.recognition_engine = new webkitSpeechRecognition();
  this.voiceDict.set("recording_status", "inactive");

})

Template.informMe.helpers({
  informed: function(){
    return Politicians.find({userId:Meteor.userId()});
  },
  cosponsor: function(){
    return Bills.find({userId:Meteor.userId()});
  },
  additionalInfo: function(){
    return PoliInfo.find({userId:Meteor.userId()});
  },
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

  profileLoaded:function(){
    if(Profiles.findOne({owner:Meteor.userId()}) != null){
      if((Profiles.findOne({owner:Meteor.userId()}).address != null) && (Profiles.findOne({owner:Meteor.userId()}).city != null) && (Profiles.findOne({owner:Meteor.userId()}).state != null) && (Profiles.findOne({owner:Meteor.userId()}).zip != null)){
          findrepbyaddress();
        }
    }
    return true;
  }

})


function findrepbyaddress(){
  Session.set("ourreps", "");
  load(Profiles.findOne({owner:Meteor.userId()}).address+" "+Profiles.findOne({owner:Meteor.userId()}).city+" "+Profiles.findOne({owner:Meteor.userId()}).state+" "+Profiles.findOne({owner:Meteor.userId()}).zip, "country", "legislatorUpperBody");
  load(Profiles.findOne({owner:Meteor.userId()}).address+" "+Profiles.findOne({owner:Meteor.userId()}).city+" "+Profiles.findOne({owner:Meteor.userId()}).state+" "+Profiles.findOne({owner:Meteor.userId()}).zip, "country", "legislatorLowerBody");
  return true;

  function load(address, levels, roles) {
    gapi.client.setApiKey('AIzaSyDYoZw_sdVIOmvB1yxnFvdBwNxf9hB7T1M');
    lookup(address, levels, roles, renderResults);
  };

  // Address: String, includeOfficees:Boolean, Levels:String, Roles:String
  function lookup(address, levels, roles, callback) {
   var req = gapi.client.request({
       'path' : '/civicinfo/v2/representatives',
       'params' : {'address' : address, 'includeOffices' : true, 'levels' : levels, 'roles' : roles }
   });
  req.execute(callback);
  };

  function renderResults(response, rawResponse) {
   if (!response || response.error) {
     return;
   }
   var normalizedAddress = response.normalizedInput.line1 + ' ' + response.normalizedInput.city + ', ' + response.normalizedInput.state + ' ' + response.normalizedInput.zip;
   if(response.offices == null){
     var yourrep = 'Could not find representantives for ' + normalizedAddress
   }else if (response.offices.length > 0) {
     var yourrep = "<div class = 'well'><p><strong>Office: "+response.offices[0].name+"</strong><br>"
     for(i=0; i<response.officials.length; i++){
       yourrep= yourrep + "<img class='img-thumbnail' src='"+response.officials[i].photoUrl+"'><br>Name: "+response.officials[i].name+"<br>Party: "+response.officials[i].party+"<br>Website: <a href='"+response.officials[i].urls+"'> "+response.officials[i].urls+" </a><br><br>";
     }
     yourrep= yourrep+"</p></div>"
   }else{
     var yourrep = 'Could not find representantives for ' + normalizedAddress
   }
   Session.set("ourreps", Session.get("ourreps")+yourrep);
    console.log("ourreps set too: "+Session.get("ourreps"));
  };
};

Template.informMe.events({
  "click .searchbar": function(event,instance){
    Meteor.call('politicians.clear',Meteor.userId());
    Meteor.call('bills.clear',Meteor.userId());
    Meteor.call('poliinfo.clear',Meteor.userId());
    const input = $(".search").val();
    const state = instance.$('#state').val();
    const position = instance.$('#position').val();
    var xmlhttp = new XMLHttpRequest();

    Meteor.call('informMeGeneral',state, position, function(err, result){
      if(err){
        window.alert(err);
        return;
      }
      for(i=0; i<result.data.results.length; i++){
        name = result.data.results[i].name.toString(); //this gets name of politician
        //if(input.toUpperCase()==name.toUpperCase()){
        id = result.data.results[i].id.toString(); //this is getting the politican id
        var src = 'https://theunitedstates.io/images/congress/225x275/' + id + '.jpg';//we are getting pictures from this github page
        //var img = document.createElement('img');
        //.src = src;
        //div.appendChild(img);
        var role = result.data.results[i].role.toString();

        var party = result.data.results[i].party.toString();
        var userId = Meteor.userId();
        var nextElection = result.data.results[i].next_election.toString();

        var information = {name,role,party,nextElection,src,userId};
        Meteor.call('politicians.insert',information);
      }
    });
  },
  'click #recordAudioButton'(elt,instance){
    const voiceDict = Template.instance().voiceDict;
    var recognition_engine = Template.instance().recognition_engine;
    Template.instance().voiceDict.set("recording_status", "speaking");
    // var voice_data = new SpeechSynthesisUtterance(Regis_voice_info.findOne({abbr:page}).online);
    // var interim_result, final_result, stop_word;
    // stop_word="stop";
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
        if(result.data.result.metadata.intentName == "stop"){
          voiceDict.set("recording_status", "inactive");
          recognition_engine.stop();
          return;
        } else{
          console.log(result);
          console.log(result.data.result.metadata.intentName);
          responsiveVoice.speak(result.data.result.speech, "UK English Male");
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
}),

Template.trow.events({
  "click .moreInfo": function(event,instance){
    Meteor.call('politicians.clear',Meteor.userId());
    Meteor.call('bills.clear',Meteor.userId());
    Meteor.call('poliinfo.clear',Meteor.userId());
    var input = this.t.name;
    const state = $('#state').val();
    const position = $('#position').val();

    Meteor.call('informMeGeneral',state, position, function(err, result){
      if(err){
        window.alert(err);
        return;
      }
      var id;
      for(i=0; i<result.data.results.length; i++){
        name = result.data.results[i].name.toString(); //this gets name of politician
        if(input.toUpperCase()==name.toUpperCase()){
          id = result.data.results[i].id.toString(); //this is getting the politican id
          var src = 'https://theunitedstates.io/images/congress/225x275/' + id + '.jpg';//we are getting pictures from this github page
          var role = result.data.results[i].role.toString();
          var party = result.data.results[i].party.toString();
          var nextElection = result.data.results[i].next_election.toString();
          var userId = Meteor.userId();
          var information = {name,role,party,nextElection,src,userId};
          Meteor.call('politicians.insert',information);
          i = result.data.results.length;
          getBills(id);
          getPoliInfo(id);
        }
      }
    });

    function getBills(id){//this is for getting the bills the politician supports
      Meteor.call('informMeBills', id, function(err, result){
        if(err){
          window.alert(err);
          return;
        }
        for(i=0; i<result.data.results[0].bills.length; i++){

          var title = result.data.results[0].bills[i].title.toString(); //this gets name of politician
          var summary = result.data.results[0].bills[i].summary.toString();
          if(!summary){
            summary = "Summary Unavaliable";
          }
          var userId = Meteor.userId();
          var information = {title,summary,userId};
          Meteor.call('bills.insert',information);
        }
      });
    }

    function getPoliInfo(id){
      Meteor.call('informMeMore', id, function(err, result){
        if(err){
          window.alert(err);
          return;
        }
        for(i=0; i<result.data.results[0].roles[0].committees.length; i++){
          var committee =result.data.results[0].roles[0].committees[i].name.toString();
          var userId = Meteor.userId();
          var url = result.data.results[0].url.toString();
          var district =result.data.results[0].roles[0].district.toString();
          var information = {committee, userId,url,district};
          Meteor.call('poliinfo.insert',information);
        }
      });


    }
    Router.go('/politician');
  },
})
