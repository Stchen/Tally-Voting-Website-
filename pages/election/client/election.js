Template.election.onCreated(function() {
  this.state = new ReactiveDict();
  this.state.setDefault({
    contest:[], //this will hold all the elections
    t:{},//this would hold each seperate election

  });
  console.log("creating the template");
  console.dir(this.state);
});

Template.election.helpers({
  contest: function(){
    const instance = Template.instance();
    return instance.state.get("contest");
  }
});

Template.election.events({
  "click .getElection": function(event,instance){
    var xmlhttp = new XMLHttpRequest();
    const address = $(".addressInput").val();
    const electionId = 2000; //this is used to look up a specific type of election
    const ElectionAPIkey = "AIzaSyDYoZw_sdVIOmvB1yxnFvdBwNxf9hB7T1M";
    xmlhttp.onreadystatechange = function(){
      if(this.readyState == 4 && this.status == 200){
        var url =  "https://www.googleapis.com/civicinfo/v2/voterinfo?key=" + ElectionAPIkey + "&address=" +address+"&electionId=" + electionId;
        //https://www.googleapis.com/civicinfo/v2/voterinfo?key=AIzaSyDYoZw_sdVIOmvB1yxnFvdBwNxf9hB7T1M&address=269%20South%20St.%20Waltham%20MA&electionId=2000
        var electionInfo = JSON.parse(this.responseText);
        var type = electionInfo.contest.type.toString();
        var office = electionInfo.contest.office.toString();
        console.log(type);
        console.log(office);
      }
    };
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
  },
})
