
// In this file we define database collections.
// The database that meteor is using have no scheme.
// We write down the structure of the collections in the comments below.



// Meteor.users is a collection that is already defined by meteor.
// We only specify an outline of the properties here.

// ATTENTION: when changing the model, make sure you also change
// the publish, permissions and merging rules in  
// Publish.js, Permissions.js and ServicesConfiguration.js respectively.

Meteor.users = Meteor.users; // already defined

var user = { /* scheme */
  _id: String,            // automatic generated by meteor
  createdAt: Date,        // automatic filled in by meteor
  
  invitationPhrase: Number,   // uniq number that used in the invite url that this user can share with others
  invitations: Number,        // number of unused invites that this user can use to invite people

  city: String,           // the city where this hacker is registered to (lowercase)
  localRank: Number,      // assigned hacker number based on signup order in city
  globalRank: Number,     // assigned hacker number based on signup order of all world hackers

  profile: {              // user's public profile (visible for other users)
    picture: String,      // url of an avatar for this user
    name: String,         // full name of the user    
    email: String,        // e-mailadress
    location: {
      lat: Number,        // latitude
      lng: Number         // longitude
    },
    homepage: String,     // external website of user
    company: String,      // name of company
    conpanyUrl: String,   // the website of the company 
    hacking: [ String ],  // array of types: (web|apps|software|game|design|life|hardware|opensource)*
    available: [ String ],// array with items where user is available for (drink|lunch|email)*
    social: {
      facebook: String,   // url to user's facebook profile
      github: String,     // url to user's github profile
      twitter: String     // url to user's twitter profile
    },
    socialPicture: {
      facebook: String,   // url to user's facebook picture
      github: String,     // url to user's github picture
      twitter: String     // url to user's twitter picture
    },
    skills: [ String ],           // array of skill name
    favoriteSkills: [ String ]    // skills that are also marked as favorite
  },

  emails: [ {             // user can have multiple e-mailaddressen (internal use only)
    address: String,      // e-mailadress
    verified: Boolean     // e-mailadress is verified by clicking the link in enrollment mail
  } ], 


  /* administration details */

  isAccessDenied: Boolean,  // user isn't allowed to enter the site unless he is invited, profile complete, email verified 
  isHidden: Boolean,        // this user isn't visible to others (denied users & admins)
  isAdmin: Boolean,         // true if this user has admin privilege
  isDeleted: Boolean,       // mark this account as deleted (probably merged with other account)
  deletedAt: Date,          // date of deletion
  mergedWith: String,       // userId of the user where this accounts is merged with

  services: {             // meteor stores login information here...
    resume: { /* ... */ },
    facebook: { /* ... */ },
    github: { /* ... */ },
    twitter: { /* ... */ },
  }
}



// Invitations is a collection that contains signup invitation codes
// new users must have such code in order to signup

Invitations = new Meteor.Collection('invitations'); 

var invitation = { /* scheme */
  _id: String,            // automatic generated by meteor
  broadcastUser: String,  // user that is permitted to distribute this code
  receivingUser: String,  // new user that used this code to signup
  signedupAt: Date,       // date when the receiving user has signed up
}




