

// SUBSCRIBE

if (Meteor.isClient) {
  
  // subscribe to published collections
  // to receive documents on the client  

  Subscriptions = [
    'publicUserDataCurrentUser', 
    'publicUserDataEmail', 
    'publicUserData',
    'invitations', 
    'goodStuffItems',
  ];

}



// PUBLISH

if (Meteor.isServer) {

  // publishing collections to the client
  

  /* USER DATA */

  // we define multiple publish rules for userdata.
  // the priority of rules is from top to bottom
  // 1. current logged in user
  // 2. users with public e-mailaddress
  // 3. otherwise only the default public user data is published
  // when a user match a rule it will directly published with the specified 
  // fields. The lower rules are not evaluated further for that user.
  // on the client you must subscribe all publish rules.
  // note: we not publish all users, only the ones that are allowed to access

  var publicUserFields = {
    "createdAt": true,
    "city": true,
    "localRank": true,
    "globalRank": true,
    "profile.picture": true,
    "profile.name": true,
    "profile.location": true,
    "profile.homepage": true,
    "profile.company": true,
    "profile.companyUrl": true,
    "profile.hacking": true,
    "profile.available": true,
    "profile.social": true,
    "profile.skills": true,
    "profile.favoriteSkills": true

    // DON'T INCLUDE
    // "profile.socialPicture": true,
  };

  var publicUserFieldsEmail = _.extend(_.clone(publicUserFields), {
    "profile.email": true
  });

  var publicUserFieldsCurrentUser = _.extend(_.clone(publicUserFieldsEmail), {
    "isAdmin": true,
    "isMayor": true,
    "isAccessDenied": true,
    "isIncompleteProfile": true,
    "isHidden": true,
    "invitations": true,
    "invitationPhrase": true,
    "profile.socialPicture": true,
    "emails": true
  });


  // 1. current logged in user
  // publish additional fields 'emails' and 'profile' for the current user
  Meteor.publish("publicUserDataCurrentUser", function (hash) {
    if(!this.userId) {
      return [];
    } else {
      var selector = {_id: this.userId};
      return Users.find(selector, {fields: publicUserFieldsCurrentUser});
    }
  });

  // 2. users with public e-mailaddress
  // we make emailaddresses public of the users that are available for drink/lunch
  // publish their public information including emailaddress
  Meteor.publish("publicUserDataEmail", function (hash) {
    if(!this.userId || !allowedAccess(this.userId)) {
      return []; 
    } else {
      var selector = {"profile.available": {$exists: true, $not: {$size: 0}}, isHidden: {$ne: true}};
      return Users.find(selector, {fields: publicUserFieldsEmail}); 
    }
  });

  // 3. otherwise only the default public user data is published
  // publish all public profile data of all users
  Meteor.publish("publicUserData", function (hash) {
    var selector = {isHidden: {$ne: true}};
    if(!this.userId || !allowedAccess(this.userId)) {
      return Users.find(selector, {fields: {_id: true}});   
    } else {
      return Users.find(selector, {fields: publicUserFields}); 
    }
  });



  /* INVITATIONS */

  // Only publish invitation codes for the logged in user
  Meteor.publish("invitations", function (hash) {
    if(!this.userId) {
      return [];
    } else {
      return Invitations.find({});
    }
  });



  /* GOOD-STUFF */

  Meteor.publish("goodStuffItems", function(hash) {
    if(!this.userId) {
      return [];
    } else {
      return GoodStuffItems.find({});
    }
  });



  // helper functions

  // check if user is allowed to access the site
  // otherwise all database modifier functions will be blocked
  var allowedAccess = function(userId) {
    var user = Users.findOne(userId);
    return user && user.isAccessDenied != true;
  }


}