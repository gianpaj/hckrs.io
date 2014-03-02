// this code loads first because of
// the alphabetic filename load order


Meteor.startup(function() {

  // keep track of the login session
  Session.set('currentLoginState', 'loggedOut');
  
  Deps.autorun(loginStateHandler);
  Deps.autorun(observeLoginState);

  // language
  // XXX use English with Europe formatting
  // in the future we probably use navigator.language || navigator.userLanguage; 
  moment.lang('en-gb'); 

  // reset meteor (local development)
  Deps.autorun(resetMeteor);
});


// Current User
// We need to subscribe to the currentUser subscription because by itself, 
// Meteor doesn't send all the user properties that we need
Meteor.subscribe('currentUser');


// reset local storage after running 
// "meteor reset" on the terminal
var resetMeteor = function() {
  if (Meteor.users.find().count() === 0 && Session.get('subscriptionsReady')) {
    _.each(_.keys(amplify.store()), function(key) { amplify.store(key, null); });
    log('Meteor resetted!')
  }
}
