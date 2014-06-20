
// In this file we define database collections.
// The database that meteor is using have no scheme.
// We write down the structure of the collections in the comments below.



/* USERS */

// Meteor.users is a collection that is already defined by meteor.
// We only specify an outline of the properties here.

// ATTENTION: when changing the model, make sure you also change
// the publish, permissions and merging rules in  
// Publish.js, Permissions.js and ServicesConfiguration.js respectively.

Users = Meteor.users; // already created by meteor

var user = { /* scheme */
  _id: String,            // automatic generated by meteor
  createdAt: Date,        // automatic filled in by meteor
  
  invitationPhrase: Number,   // uniq number that used in the invite url that this user can share with others
  invitations: Number,        // number of unused invites that this user can use to invite people

  city: String,           // the city where this hacker is registered to (lowercase)
  localRank: Number,      // assigned hacker number based on signup order in city
  globalRank: Number,     // assigned hacker number based on signup order of all world hackers

  localRankHash: String,  // CLIENT-ONLY hashed localRank
  globalRankHash: String, // CLIENT-ONLY hashed globalRank

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
    hacking: [ String ],  // array of types: (web|apps|software|game|design|life|hardware|opensource|growth)*
    available: [ String ],// array with items where user is available for (drink|lunch|email)*
    social: {
      facebook: String,   // url to user's facebook profile
      github: String,     // url to user's github profile
      twitter: String     // url to user's twitter profile
    },
    socialName: { // CLIENT-ONLY
      facebook: String,   // username of user's facebook profile
      github: String,     // username of user's github profile
      twitter: String     // username of user's twitter profile
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

  ambassador: {           // (optional) only when user is ambassador
    city: String,         // refer to the city where this user is ambassor
    title: String,        // custom title of this ambassador
  },

  /* administration details */

  isAccessDenied: Boolean,  // user isn't allowed to enter the site unless he is invited, profile complete, email verified 
  isUninvited: Boolean,     // flag wheter this user is not invited
  isIncompleteProfile: Boolean, // new users starts with an incomplete profile until user pressed the 'ready' button
  isHidden: Boolean,        // this user isn't visible to others (denied users & admins)
  isMayor: Boolean,         // this user is the mayor of a city
  isAdmin: Boolean,         // true if this user has admin privilege
  isDeleted: Boolean,       // mark this account as deleted (probably merged with other account)
  deletedAt: Date,          // date of deletion
  mergedWith: String,       // userId of the user where this accounts is merged with


  /* fields assigned by meteor */

  services: {               // meteor stores login information here...
    resume: {  
      loginTokens: [ { token: String, when: Date } ]
    },
    email: {
      verificationTokens: [ { token: String, address: String, when: Date } ]
    },
    facebook: { /* ... */ },
    github: { /* ... */ },
    twitter: { /* ... */ },
  }
}




/* INVITATIONS */

// Invitations is a collection that contains signup invitation codes
// new users must have such code in order to signup

Invitations = new Meteor.Collection('invitations');

var invitation = { /* scheme */
  _id: String,            // automatic generated by meteor
  broadcastUser: String,  // user that is permitted to distribute this code
  receivingUser: String,  // new user that used this code to signup
  signedupAt: Date,       // date when the receiving user has signed up
}


/* HIGHLIGHTS */

Highlights = new Meteor.Collection('highlights');

var Highlight = { /* scheme */
  _id: String,           // _id automatic generated by meteor
  createdAt: Date,
  city: String,          // highlight only visible in this city
  title: String,
  subtitle: String,
  imageUrl: String,
  website: String,
  userId: String,        // published by this user
}


/* GIFTS */

Gifts = new Meteor.Collection('gifts');

var Gift = { /* scheme */
  _id: String,           // _id automatic generated by meteor
  createdAt: Date,
  city: String,          // gift only visible in this city
  title: String,
  websiteUrl: String,
  websiteName: String,
  description: String,
}



/* MIGRATIONS */

// database migrations on deploying new app versions
// When changing the model the existing database must fit the new model
// After running the migration the data should be up to date.
// This collection stores the already processed migrations

Migrations = new Meteor.Collection('migrations');

var migration = { /* scheme */
  _id: String,         // automatic generated by meteor
  processedAt: Date,   // The date this migration is processed
  name: String,        // the name of the migration
  status: String,      // processing status (inProgress|done) 
}





/*
  CLIENT ONLY collections

  This are collections that only exist on the client and will not
  be synced with the server. This collections are used to store session state.
  Instead yoy can using the Session object provided by meteor, but the local collections
  allow you to query/modify the data in an easy way.
*/

if (Meteor.isClient) {


  /* nothing */

}



