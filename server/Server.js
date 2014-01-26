// XXX temporary disabled because of lacking support for allowFrameOrigin()
//
// // Browser Policy

// // global rules
// BrowserPolicy.framing.disallow();
// BrowserPolicy.content.disallowInlineScripts();
// BrowserPolicy.content.disallowEval();
// BrowserPolicy.content.allowInlineStyles();
// BrowserPolicy.content.allowImageOrigin("*"); // XXX security issue !!!
// BrowserPolicy.content.allowConnectOrigin("*");  // XXX security issue ??? (default in Meteor)

// // restricted rules, allow some website
// BrowserPolicy.content.allowFrameOrigin("http://a.tiles.mapbox.com");
// BrowserPolicy.content.allowScriptOrigin("http://api.tiles.mapbox.com");
// BrowserPolicy.content.allowScriptOrigin('http://www.google-analytics.com');
// BrowserPolicy.content.allowStyleOrigin('http://api.tiles.mapbox.com');
// BrowserPolicy.content.allowStyleOrigin('http://fonts.googleapis.com');
// BrowserPolicy.content.allowFontOrigin('http://themes.googleusercontent.com');






// server startup
Meteor.startup(function() {
  
  /* server startup */

  // check if settingsfile is missing
  if (!Meteor.settings || !Meteor.settings.public || !Meteor.settings.public.environment)
    throw new Meteor.Error(500, "Settings file missing!");

  // add environment variables from settings file to current process environment
  if (Meteor.settings.env)
    _.extend(process.env, Meteor.settings.env);
  
  // print uptime to console
  uptimeLogging();
  
});



// show server uptime in console
var uptimeLogging = function() {
  var startupDate = new Date();
  var logging = function() { 
    log("[Server Uptime]: " + moment(startupDate).fromNow(true)); 
  }
  Meteor.setInterval(logging, 15 * 60 * 1000);
}


