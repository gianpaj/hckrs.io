

// Register external services
// that can be used for user account creation and login.
// This will be done once, at the first time you run meteor.

// check which services are already configured
var facebookConfigured = Accounts.loginServiceConfiguration.findOne({service: 'facebook'});
var githubConfigured = Accounts.loginServiceConfiguration.findOne({service: 'github'});
var twitterConfigured = Accounts.loginServiceConfiguration.findOne({service: 'twitter'});

// XXX TODO: do not write the 'id' and 'secret' directly into the code
// this must be stored seperately, for example in a settings file or 
// exported as environment variables.

Meteor.startup(function() {

  // register facebook
  if(!facebookConfigured) {
    Accounts.loginServiceConfiguration.insert({
      service: "facebook",
      appId: SETTINGS.FACEBOOK.appId,
      secret: SETTINGS.FACEBOOK.secret
    });
  }

  // register github app
  if(!githubConfigured) {
    Accounts.loginServiceConfiguration.insert({
      service: "github",
      clientId: SETTINGS.GITHUB.clientId,
      secret: SETTINGS.GITHUB.secret
    });
  }

  // register twitter app
  if(!twitterConfigured) {
    Accounts.loginServiceConfiguration.insert({
      service: "twitter",
      consumerKey: SETTINGS.TWITTER.consumerKey,
      secret: SETTINGS.TWITTER.secret
    });
  }
  
});


// Manually creating OAuth requests to the external services.
// In this manner you can obtain all information about a user
// Don't forget to set requestPermission that the user must accept.

// @param user String|{Object} (either a userId or an user object)
// @param service String (facebook, github, twitter, etc.)
// @param method String (GET, POST, etc.)
// @param url String (url of the resource you request)
// @param params {Object} (data send with the request)
var oauthCall = function(user, service, method, url, params) {  
  var config = Accounts.loginServiceConfiguration.findOne({service: service});

  if (!config)
    throw new Meteor.Error(500, "Service unknow: " + service);

  if (_.isString(user))
    user = Meteor.users.findOne(user);

  if (!user)
    throw new Meteor.Error(500, "User unknow");

  if (!user.services[service] || !user.services[service].accessToken)
    throw new Meteor.Error(500, "User not (yet) authenticated for this service.");

  var oauth = new OAuth1Binding(config);
  oauth.accessToken = user.services[service].accessToken;
  oauth.accessTokenSecret = user.services[service].accessTokenSecret;

  params = _.extend(params || {}, {oauth_token: oauth.accessToken});
      
  var headers = oauth._buildHeader(params);

  return oauth._call(method, url, headers, params);
}




// fetch user information from external service
// we try to make user's profile complete, if the service don't provide 
// the basic information we set the value to null

// @param user String|{Object} (either a userId or an user object)
// @param service String (facebook, github, twitter, etc.)
var fetchUserData = function(user, service) {

  var services = {
  
    "github": function(user) {
      var url = "https://api.github.com/user";
      var data = oauthCall(user, 'github', 'GET', url).data;

      var userData = {
        'id': data.id,
        'username': data.login,
        'email': data.email,
        'name': data.name,
        //'gender': null,
        //'birthday': null,
        'city': data.location,
        'link': data.html_url,
        'picture': data.avatar_url && data.avatar_url + "&size=180",
        'lang': null
      };

      return userData;
    },
    
    "facebook": function(user) {
      var url = "https://graph.facebook.com/me";
      var params = { fields: [ 'id', 'email', 'name', 'locale', 'picture', 
                               'link', 'username', 'location' /*, 'birthday', 'gender' */ ] };
      var data = oauthCall(user, 'facebook', 'GET', url, params).data;

      // if (data.birthday) {
      //   var p = data.birthday.split('/');
      //   data.birthday = new Date(p[2], p[0], p[1]);
      // }

      if (data.username && data.picture && data.picture.data && !data.picture.data.is_silhouette)
        data.picture = "https://graph.facebook.com/" + data.username + "/picture?type=large";
      
      var userData = {
        'id': data.id,
        'username': data.username,
        'email': data.email,
        'name': data.name,
        //'gender': data.gender,
        //'birthday': data.birthday,
        'city': data.location && data.location.name, //XXX TODO: use additional data.location.id 
        'link': data.link,
        'picture': data.picture,
        'lang': data.locale && data.locale.substr(0,2)
      };

      return userData;
    },
    
    "twitter": function(user) {
      var url = "https://api.twitter.com/1.1/account/verify_credentials.json";
      var data = oauthCall(user, 'twitter', 'GET', url).data;

      if (!data.default_profile_image && data.profile_image_url)
        data.picture = data.profile_image_url.replace(/_normal(.{0,5})$/, '$1');

      var userData = {
        'id': data.id_str,
        'username': data.screen_name,
        'email': null,
        'name': data.name,
        //'gender': null,
        //'birthday': null,
        'city': data.location,
        'link': data.screen_name && "http://twitter.com/" + data.screen_name,
        'picture': data.picture,
        'lang': data.lang
      };

      return userData;
    }
  }

  if (!services[service])
    throw new Meteor.Error(500, "Unknow how to fetch user data from " + service);    

  // return the fetched data
  return services[service](user);
}




// merge new user data in the given user object
// only empty fields are filled in, so no info will be overidden

// @param user {Object} (an user object)
// @param service String (facebook, github, twitter, etc.)
// @param userData {Object} (the additional user data that fill the empty properties)
// @return {Object} (the same user object with additional info attached to it)
var mergeUserData = function(user, service, userData) {
  
  // data used for creating the user profile
  var extract = ['name', 'picture', 'city', 'lang' /*, 'gender', 'birthday'*/];
  var data = _.pick(userData, extract);

  // fill undefined or null properties in user's profile with the new user data
  user.profile = _.defaults(omitNull(user.profile), omitNull(data)); 
  
  // customized profile properties
  if (userData.link) {
    if (!user.profile.social) user.profile.social = {};
    user.profile.social[service] = userData.link
  }

  // add e-mail address to user's account
  if (userData.email) {
    if (!user.emails) user.emails = [];
    if (!_.findWhere(user.emails, {address: userData.email}))
      user.emails.push({ address: userData.email, verified: true });
  }

  // beside creating a new profile for this user, 
  // the user also gets a new service data object
  user.services[service] = _.extend(user.services[service], userData);
  
  return user;
}




// When an user account is created (after user is logging in for the first time)
// extract the important user information and return a new user object where this
// information is associated in user's profile.
// XXX TODO: also update user's profile when user logged in in the future.

Accounts.onCreateUser(function (options, user) {
  user.profile = options.profile;

  // determine which external service is used for account creation
  var serviceObj = _.omit(user.services, ['resume']);
  var serviceName = _.first(_.keys(serviceObj));

  // fetch additional user information
  var userData = fetchUserData(user, serviceName);
  
  // return the new user object that will be used for account creation
  return mergeUserData(user, serviceName, userData);
});





// Existing users can link additional social services to their accounts.
// Therefor a service token is required to fetch user data from the external service. 
// This token can obtained on the client-side when the user authenticate the service.
// After the token is obtained, the server method below can be called and it will fetch 
// user information from the external service and update user's profile.

// @param token String (oauth requestToken that can be exchanged for an accessToken)
// @param service String (facebook, github, twitter, etc.)
// @effect (updating the user object with an additional service attached)
var addServiceToCurrentUser = function(token, service) {
  var userId = this.userId; //current logged in user
  var user = Meteor.users.findOne(userId); //get user document from our collection
  var Service = global[capitaliseFirstLetter(service)]; //meteor package for this external service

  if (!userId || !user)
    throw new Meteor.Error(500, "Unknow user: " + userId);

  if (!Service)
    throw new Meteor.Error(500, "Unknow service: " + service);


  // retrieve user data from the external service
  var serviceData = Service.retrieveCredential(token).serviceData;

  // check if the requested external account is already assigned to an (other) user
  var query = _.object(["service."+service+".id"], [serviceData.id]);
  if (Meteor.users.findOne(query))
    throw new Meteor.Error(500, "This "+service+" account has already assigned to a user.");

  // atach serviceData directly to the user
  user.services[service] = serviceData;

  // fetch additional user information
  var userData = fetchUserData(user, service);
  
  // merge fetched data into the user object
  user = mergeUserData(user, service, userData);

  // replace the whole user by the updated one
  Meteor.users.update(userId, user);
}




var test = function() {
  
}


// define methods that can be called from the client-side
Meteor.methods({
  "addServiceToUser": addServiceToCurrentUser,
  "oauth": oauthCall, // XXX, check secutiry for client-calls (don't make private user info public)
  "test": test // XXX, check secutiry for client-calls
});



