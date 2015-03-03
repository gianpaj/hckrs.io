Login = {};


var serviceOptions = {
  "facebook": { requestPermissions: [ 'email', 'user_location', 'user_birthday', 'user_website', 'user_work_history' ] },
  "github": { requestPermissions: [ 'user:email' /* XXX not working??? */ ] },
  "twitter": { requestPermissions: [ /* no permission available */ ] }
}



Login.init = function() {

  // Observe if user is logging in
  observeLoggingIn();
}


/* OBSERVE Login State */

// observe if user is logging in
var observeLoggingIn = function() {
  var startLogin;
  Deps.autorun(function() {
    if (Meteor.loggingIn()) {
      startLogin = true;
      if (!Session.get('redirectUrl'))
        Session.set('redirectUrl', location.pathname + location.search + location.hash);
    } else if(startLogin && Meteor.userId() && Subscriptions.ready()) {
      startLogin = false;
      Tracker.nonreactive(function() {
        loggedIn();
      });
    }
  });
}


/* LOGIN EVENT handlers */

// when user becomes logged in
var loggedIn = function() {

  // log
  GAnalytics.event("LoginService", "login", "automatically");

  // set currentCity (which user is visiting) based on city in the url
  if (Meteor.user().isAdmin)
    Users.update(Meteor.userId(), {$set: {currentCity: Session.get('currentCity')}})


  // XXX maybe we can do this on the server side, because
  // meteor introduces a function called Accounts.validateLoginAttempt()
  checkInvitation();
  checkGrowthPhrase();
  checkAccess();

  // if a redirectUrl is present, redirect to that url
  // otherwise if also no route is setted to the hackers list
  var redirectUrl = Session.get('redirectUrl');

  if (redirectUrl && !_.contains(['/','/logout'], redirectUrl)) {
    Session.set('redirectUrl', null);
    Router.go(redirectUrl);
  } else {
    goToEntryPage();
  }

}

// which page should be loaded for logged in users which enter the site
goToEntryPage = function() {
  var entryPage = 'highlights';
  Router.go(entryPage);
}







/* ACCOUNT & ACCESS & INVITATIONS */

Template.registerHelper('invitationLimitReached', function() {
  return Session.get('invitationLimitReached');
});
Template.registerHelper('tellUsMore', function() {
  return Users.myProp('isIncompleteProfile');
});
Template.registerHelper('isInvited', function() {
  return checkInvited();
});
Template.registerHelper('isVerifiedEmail', function() {
  return verifiedEmail(); // user's profile email is verified
});
Template.registerHelper('isUnverifiedEmail', function() {
  return isUnverifiedEmail(); // user's profile email is not verified
});

// when user signup with a growth phrase
// we will mark the growth entry
checkGrowthPhrase = function() {
  var type = Session.get('growthType');
  var phrase = Session.get('growthPhrase');

  // register growth phrase
  if (type && phrase)
    Meteor.call('verifyGrowthPhrase', type, phrase);
}

// when user isn't yet allowed to enter the site
// check if he has signed up with a valid invite code
checkInvitation = function() {
  var bitHash = Session.get('inviteBitHash');

  if (!bitHash)
    return;

  var phrase = Url.bitHashInv(bitHash);
  var broadcastUser = Users.findOne({invitationPhrase: phrase});

  if (phrase) {

    // make a server call to check the invitation
    Meteor.call('verifyInvitation', phrase, function(err) {

      if (err && err.reason === 'limit') {

        Router.scrollToTop();

        // show invitation limit reached message
        Session.set('invitationLimitReached', true);
        Meteor.setTimeout(function() {
          Session.set('invitationLimitReached', false);
        }, 5 * 60 * 1000);

        // log to google analytics
        if (broadcastUser)
          GAnalytics.event('Invitations', 'limit reached for user', broadcastUser._id);

      } else if (err) {

        Router.scrollToTop();

        console.log("Error", err);

        // log to google analytics
        GAnalytics.event('Invitations', 'invalid phrase', phrase);

      } else { //on success

        goToEntryPage();

        // log to google analytics
        if (broadcastUser)
          GAnalytics.event('Invitations', 'invited by user', broadcastUser._id);
      }

      // clean
      Session.set('inviteBitHash', null);

    });

  } else {

    // clean
    Session.set('inviteBitHash', null);
  }
};

// user let us know that he has filled in his profile
// check on server if this is correct
checkCompletedProfile = function() { /* GLOBAL, called from hacker.js */
  if (Meteor.user().isIncompleteProfile) {
    Util.exec(function() {
      Meteor.call('requestProfileCompleted', function(err) {
        if (err) {
          Session.set('isIncompleteProfileError', true);
          Router.scrollToTop();
          console.log(err);
        } else {
          Session.set('isIncompleteProfileError', false);
          goToEntryPage();
        }
      });
    });
  } else {
    checkAccess();
    Router.scrollToTop();
  }
}

// new users have no access to the site until their profile is complete
// observe if the fields email and name are filled in, after saving
// also the user must have filled in a verified e-mailaddress
checkAccess = function() { /* GLOBAL, called from router.js */
  Util.exec(function() {
    var user = Meteor.user();
    var profile = user.profile;
    if (user.isAccessDenied && !user.isIncompleteProfile && checkInvited() && verifiedEmail()) {
      Meteor.call('requestAccess', function(err) {
        if (err) {
          Router.scrollToTop();
          console.log(err);
        } else {
          goToEntryPage();
        }
      });
    }
  });
};

// check if user is invited
var checkInvited = function() { //GLOBAL, used in hacker.js
  return !Users.myProp('isUninvited');
}

// check if user's profile e-mail address is verified
var verifiedEmail = function() { //GLOBAL, used in hacker.js
  return !!_.findWhere(Users.myProp('emails'), {address: Users.myProp('profile.email'), verified: true});
}

// check if user's profile e-mail address is not verified
var isUnverifiedEmail = function() {
  return Users.myProp('profile.email') && !verifiedEmail();
}










/* LOGIN functionality */

Template.registerHelper('serviceLoginError', function() {
  return Session.get('serviceLoginError');
});

// after user tries to login, check if an error occured
var loginCallback = function(err) {
  if (err) {

    // log
    GAnalytics.event("LoginService", "login failure");

    // on error
    var message = "<h3>Something went wrong...</h3>Please try again or <a href=\"&#109;&#097;&#105;&#108;&#116;&#111;:&#109;&#097;&#105;&#108;&#064;&#104;&#099;&#107;&#114;&#115;&#046;&#105;&#111;\">email</a> us.";

    // emailadres is in use by another user
    if (err.reason === "duplicateEmail")
      message = "<h3>Oopsy!</h3>Please try one of the other services!";

    if (err.reason === "city unmatch") {
      var userCity = err.details;
      var cityUrl = Url.replaceCity(userCity);
      var cityDomain = Url.hostname(cityUrl);
      message = '<h3>oopsy!</h3><a href="'+cityUrl+'">'+cityDomain+'</a> looks more like your home ;)';
    }

    Session.set('serviceLoginError', message);
    Meteor.setTimeout(function() { Session.set('serviceLoginError', false); }, 12000);
    console.log(err);

  } else {

    // when the merged user account is located in an other city
    // we have to redirect the subdomain
    if (Meteor.user().city !== Session.get('currentCity') && !Meteor.user().isAdmin)
      Router.goToCity(Meteor.user().city);
  }
}

// login by using a external service
var loginWithService = function(event) {
  if (!Session.get('currentCity'))
    return alert('Specify where do you hack in order to continue.');

  var $elm = $(event.currentTarget);
  var service = $elm.data('service');
  var options = serviceOptions[service];
  var Service = String.capitaliseFirstLetter(service);

  // log
  GAnalytics.event("LoginService", "login", service);

  // login
  Meteor["loginWith"+Service](options, loginCallback);

}



// bind the sign up buttons to the corresponding actions
Template.main.events({
  "click .signupService": loginWithService
});





/* ADD SERVICES to my profile */

// add an external service to current user's account
var global = this;
var _addService = function(service, options, onSuccessCallback) {
  var Service = window[String.capitaliseFirstLetter(service)];


  // request a token from the external service
  Service.requestCredential(options, function(token, more) {
    var secret = OAuth._retrieveCredentialSecret(token);

    // send the token to our server-side method, which will handle
    // updating the user with the new service information
    Meteor.call("addServiceToUser", token, secret, service, function(err, res) {
      if (err) {
        if (err.reason === "duplicateEmail") {
          // emailadres is in use by another user
          Session.set('isAddServiceError_'+service, true);
          Meteor.setTimeout(function() { Session.set('isAddServiceError_'+service, false); }, 10000);
        } else {
          console.log(err);
        }

        // log
        GAnalytics.event("LoginService", "link failure", service);
      } else { //success

        // when the merged user account is located in an other city
        // we have to redirect the subdomain
        if (Meteor.user().city !== Session.get('currentCity') && !Meteor.user().isAdmin)
          Router.goToCity(Meteor.user().city);

        if(_.isFunction(onSuccessCallback))
          onSuccessCallback();

        // log
        GAnalytics.event("LoginService", "link service", service);
      }
    });
  });
}

// remove an external service from user's account
var _removeService = function(service) {
  Meteor.call("removeServiceFromUser", service, function(err, res) {
    if (err)
      throw new Meteor.Error(500, err.reason);
    else
      // log
      GAnalytics.event("LoginService", "unlink service", service);
  });
}

// user toggles an external service
// add or remove the service from user's account
toggleService = function (event, onSuccessCallback) {
  var $elm = $(event.currentTarget);
  var service = $elm.data('service');
  var options = serviceOptions[service];
  var isLinked = !!Meteor.user().profile.social[service];

  isLinked ? _removeService(service) : _addService(service, options, onSuccessCallback);
}
