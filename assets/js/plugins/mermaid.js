$(document).ready(function() {
  var config = {
    startOnLoad:true,
    flowchart:{
      useMaxWidth:false,
      htmlLabels:true
    }
  };
  mermaid.initialize(
    config,
  );
});
