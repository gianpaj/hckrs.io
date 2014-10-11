var MailChimpOptions = Settings['MailChimpOptions'];


/* MAIL TEMPLATES */

var siteName, siteEmail, siteOwnerEmail, siteUrl, siteFrom, siteUrlShort;

Meteor.startup(function() {
  siteOwnerEmail = Settings.siteOwnerEmail;
  siteUrl = Meteor.absoluteUrl();
  siteFrom = Settings["siteName"] + " <" + Settings['siteEmail'] + ">";
  siteUrlShort = function() { return Url.hostname(); } // defined in /lib/Url.js 

  Accounts.emailTemplates.siteName = Settings["siteName"];
  Accounts.emailTemplates.from = siteFrom;
});




/* METEOR E-MAIL TEMPLATES */

// verify your mail address
Accounts.emailTemplates.verifyEmail.subject = function (user) {
  return "email validation";
}
Accounts.emailTemplates.verifyEmail.text = function (user, url) {
  
  // we change the default meteor verification url
  // because we use our own client-side router
  // that not depending on url hashes
  var url = url.replace('/#', ''); 

  // e-mail link must include the correct city
  if (user.city)
    url = Url.replaceCity(user.city, url);

  var text = "If you are a real person please place your input device pointer " + 
             "above the following anchor, followed by the onclick action:\n\n" + url;

  return text;
}



/* CUSTOM E-MAIL sending functions */

// this e-mail will be sent to the admins 
// when a new user joined the site
SendEmailsOnNewUser = function(userId) {

  var user = Users.findOne(userId);
  var city = user.city;
  var hash = Url.bitHash(user.globalId);
  var url = Meteor.absoluteUrl(hash);
  var cityUrl = Url.replaceCity(city, url);
  var cityHost = Url.hostname(cityUrl);  
  var toAmbassadors = _.compact(Users.find({city: city, "isAmbassador": true}).map(function(u) { return property(u, 'staff.email'); }));
  var toAdmin = _.difference(_.compact(Users.find({"isAdmin": true}).map(function(u) { return property(u, 'staff.email'); })), toAmbassadors);
  var userEmail = user.profile.email;

  var status = [];
  if (!userEmail)
    status.push("No e-mailaddress given (yet).")
  if (!user.profile.name)
    status.push("No name given (yet).")
  if (user.isUninvited)
    status.push("Not invited (yet).")

  var email = {};
  email.to = toAmbassadors;
  email.cc = toAdmin;
  email.from = siteFrom;
  email.replyTo = userEmail;
  email.subject = "New hacker on " + cityHost;
  email.text = "Hacker '" + user.profile.name + "' joined " + cityHost + ".\n\n" + cityUrl;
  if (status.length)
    email.text += "\n\nStatus:\n" + status.join("\n");  
  
  // send to admins and ambassadors of city
  Email.send(email);
  
}



/* Mail Chimp Interace */

Mailing = {};

Mailing.fields = [
  'city',
  'globalId',
  'profile.email',
  'profile.name',
  'profile.picture',
  'profile.hacking',
  'profile.available',
  'mailings',
  'invitations',
  'invitationPhrase',
  'isAmbassador',
  'isAdmin',
  'isIncompleteProfile',
  'isUninvited'
];


// subscribe task
// which will update the user information within MailChimp
var _subscribe = function(options, cb) {
  user = OtherUserProps(options.user, Mailing.fields);

  var quotedItemString = function(array) {
    return _.map(array || [], function(item) { return "'"+item+"'"; }).join(',');
  }

  var name = user.profile.name || "";

  var params = {
    id: MailChimpOptions['listId'],
    update_existing: true,
    email: {email: options.previousEmail || user.profile.email},
    merge_vars: {
      "email": options.previousEmail ? user.profile.email : undefined,
      "USER_ID": user._id,
      "FNAME": _.first(name.split(' ')),
      "LNAME": _.rest(name.split(' ')).join(' '),
      "NAME": name,
      "CITY_ID": user.city,
      "CITY_NAME": CITYMAP[user.city].name,
      "PROFILE": userProfileUrl(user),
      "PICTURE": user.profile.picture,
      "INVITES": user.invitations,
      "INVITE_URL": userInviteUrl(user),
      "IS_AMBSSDR": user.isAmbassador ? "true" : "false",
      "IS_ADMIN": user.isAdmin ? "true" : "false",
      "IS_INCOMPL": user.isIncompleteProfile ? "true" : "false",
      "IS_UNINVIT": user.isUninvited ? "true" : "false",
      // 'AVAILABLE': quotedItemString(user.profile.available),
      // 'HACKING': quotedItemString(user.profile.hacking),
      "groupings": [
        { name: "available", groups: user.profile.available || [] },
        { name: "hacking", groups: user.profile.hacking || [] },
        { name: "mailings", groups: user.mailings || [] },
      ]
    },
    replace_interests: true,
    double_optin: false,
    send_welcome: false,
  };

  // console.log('subscribe', params)

  new MailChimp().call('lists', 'subscribe', params, cb);
}


// only send 5 subscribe tasks simultaneous to MailChimp. 
var _queue = async.queue(Meteor.bindEnvironment(_subscribe), 3);

Mailing.subscribe = function(user, options, cb) {
  options = options || {};
  options.user = user;

  // queue subscribe task
  _queue.push(options, cb || function(){});
}

Mailing.unsubscribe = function(emailToDelete, keepInList, cb) {
  
  var params = {
    id: MailChimpOptions['listId'],
    email: {email: emailToDelete},
    delete_member: !keepInList,
    send_goodbye: false,
    send_notify: !!keepInList,
  }

  // console.log('unsubscribe', params)

  new MailChimp().call('lists', 'unsubscribe', params, cb || function(){});
}

// Observer user data changes and update mailing list
Meteor.startup(function() {
  var initialized = false;

  var selector = {
    "city": {$exists: true, $ne: ""}, 
    "profile.email": {$exists: true, $ne: ""}
  };

  Users.find(selector, {fields: fieldsArray(Mailing.fields)}).observe({
    added: function(user) {
      if (!initialized) return;
      Mailing.subscribe(user);
    },
    changed: function(newUser, oldUser) {
      var options = {};
      
      if (newUser.profile.email !== oldUser.profile.email) 
        options.previousEmail = oldUser.profile.email;

      Mailing.subscribe(newUser, options);
    }
  });

  initialized = true;  
});



/* 
Options {
  from_name: String,
  from_email: String,
  to_name: String,
  subject: String,
  html: String,
  segments: {
    match: String(all|any),
    conditions: [
      { field: 'CITY_ID', op: 'eq', value: 'utrecht' }
    ]
  },
  test: String(EMAIL) // optional
} 
*/
Mailing.send = function(options) {

  var params = {
    type: "regular",
    options: {
      list_id: MailChimpOptions['listId'],
      subject: options.subject,
      from_email: options.from_email,
      from_name: options.from_name,
      to_name: options.to_name,
      inline_css: true,
      authenticate: false, // ??????
      analytics: {}, // ???
    },
    content: { html: options.html },
    segment_opts: options.segments
  }

  console.log('Send mailing:', params.options);
  console.log('To users:', options.segments);

  // on test environments, send always test e-mails. Never mail the users
  if (Settings['environment'] !== 'production') {
    console.log('Because you are on a development environment, this email will be only send to you. Users will not receive them.');
    if (!options.test) {
      console.log("No test e-mail account specified");
      throw new Meteor.Error(500, "No test e-mail account specified");
    }
  }

  var mailChimp = new MailChimp();
  mailChimp.call('campaigns', 'create', params, function(err, res) {
    if (err) throw new Meteor.Error(500, "Mail failed", err);

    if (options.test) {
      mailChimp.call('campaigns', 'send-test', {cid: res.id, test_emails: [options.test]}, function(err,res) {
        if (err) {
          console.log("Mailed failed", err);
          throw new Meteor.Error(500, "Mail failed", err);
        }
      });
    } else {
      mailChimp.call('campaigns', 'send', {cid: res.id}, function(err,res) {
        if (err) {
          console.log("Mailed failed", err);
          throw new Meteor.Error(500, "Mail failed", err);
        }
      });
    }
  }) 
}

// ambassador can send mail to some group specified by selector
// either {userId: String} or {mailing: String from MAILING_VALUES}
Mailing.ambassadorMail = function(subject, content, selector, isTest) {
  checkAmbassadorPermission();

  var ambassador = Meteor.user();
  var city = ambassador.currentCity;
  var email = property(ambassador, 'staff.email');

  if (!email)
    throw new Meteor.Error(500, "no ambassador email specified");

  if (selector.userId && (Users.findOne(selector.userId) || {}).city !== city)
    throw new Meteor.Error(500, "not allowed", "Ambassador not allowed to mail this user");

  if (selector.mailing && !_.contains(MAILING_VALUES, selector.mailing)) 
    throw new Meteor.Error(500, "no allowed", "no valid group specified");

  // on test environments, send always test e-mails. Never mail the users
  if (Settings['environment'] !== 'production')
    isTest = true;

  var html = Assets.getText('html-email.html')
  html = html.replace(/{{subject}}/g, subject);
  html = html.replace(/{{content}}/g, content);
  html = html.replace(/{{unsubscribe}}/g, 'if you don\'t want receive this kind of email, change your email settings at <a href="http://hckrs.io">hckrs.io</a>');

  // segments
  // e.g. {match: 'all', conditions: [{field: 'HACKING', op: 'like', value: "%'apps'%%'web'%" }]}
  var segments;
  if (selector.userId) {
    segments = {
      match: 'all', 
      conditions: [
        { field: 'USER_ID', op: 'eq', value: selector.userId }
      ]
    }
  }
  if (selector.mailing) {
    segments = {
      match: 'all', 
      conditions: [
        { field: 'CITY_ID', op: 'eq', value: city },
        { field: 'interests-' + MailChimpOptions['group-mailings'], op: 'one', value: selector.mailing },
      ]
    } 
  }

  if (!segments) 
    throw new Meteor.Error(500, "no segement", "no valid segment specified");

  Mailing.send({
    from_name: ambassador.profile.name + " / hckrs.io",
    from_email: email,
    to_name: "*|NAME|*",
    subject: subject,
    html: html,
    segments: segments,
    test: isTest ? email : undefined
  });
}


// github growth mailing
/* {
    subjectId: String
    bodyId: String
  }
*/
Mailing.githubGrowthMail = function(city, userIds, subjectIdentifier, bodyIdentifier) {
  checkAdminPermission();

  var isTest = true;
  // userIds = ['av5GT2BbqGmtsL2qA']

  var subject = property(EmailTemplates.findOne({identifier: subjectIdentifier}), 'subject');
  var body = property(EmailTemplates.findOne({identifier: bodyIdentifier}), 'body');

  if (!subject || !body)
    throw new Meteor.Error(500, "incomplete message", "No subject or body provided.");

  var adminId = Meteor.userId();
  var from_email = city + "@hckrs.io";

  var html = Assets.getText('html-email.html')
  html = html.replace(/{{subject}}/g, subject);
  html = html.replace(/{{content}}/g, body);
  html = html.replace(/{{unsubscribe}}/g, '');

  var users = GrowthGithub.find({_id: {$in: userIds}}).fetch();

  var to_list = _.map(users, function(user) {
    var to = { email: user.email, name: user.name, type: 'to', userId: user._id };
    console.log(to.email, to.name);
    return to;
  });

  var merge_vars = _.map(users, function(user) {
    var vars = _.map(user, function(val, key){ 
      if (key == 'city') val = CITYMAP[val].name; // use human readable city name
      return {name: key, content: val}; 
    });
    console.log(user.email, vars);
    return { rcpt: user.email, vars: vars };
  });


  var mail = {
    "key": Settings['mandrill'][isTest ? 'apiTestKey' : 'apiKey'],
    "message": {
      "html": html,
      "subject": subject,
      "from_email": from_email,
      // "from_name": "",
      "to": to_list,
      "important": false,
      "track_opens": true,
      "track_clicks": true,
      // "auto_text": null,
      // "auto_html": null,
      "inline_css": true,
      // "url_strip_qs": null,
      "preserve_recipients": false,
      "view_content_link": true,
      // "tracking_domain": null,
      // "signing_domain": null,
      // "return_path_domain": null,
      "merge": true,
      "merge_vars": merge_vars,
      "tags": ['growth', 'github'],
      // "subaccount": null,
      // "google_analytics_domains": [],
      // "google_analytics_campaign": null,
      // "metadata": {},
      // "recipient_metadata": [],
      // "attachments": [],
      // "images": []
    },
    "async": true,
    // "ip_pool": null,
    // "send_at": null, // 'send_at' requires paid account
  };

  var mail_internal = {
    kind: "growth",
    type: "growthGithub",
    city: city,
    from: {
      email: from_email, 
      userId: adminId
    },
    to: to_list,
    subjectTemplate: subjectIdentifier,
    bodyTemplate: bodyIdentifier,
    subject: subject,
    body: body,
    tags: ['growth', 'github'],
    mergeVars: merge_vars,
  }

  console.log(mail);
  console.log("internal", mail_internal);

  // first mark users as mailed

  // send email
  
  try {
    var url = 'https://mandrillapp.com/api/1.0/messages/send.json';
    var res = HTTP.post(url, {data: mail});
    
    if (res.statusCode !== 200)
      throw 'mailing failed with status code' + res.statusCode;

    // link mandrill's message IDs
    _.each(to_list, function(mail) {
      mail.messageId = property(_.findWhere(res.data, {email: mail.email}), '_id');
    });

    // save email
    EmailsOutbound.insert(mail_internal);

    // update Growth Users, saving messageId an Invitation Date
    _.each(to_list, function(mail) {
      GrowthGithub.update(mail.userId, {
        $set: { invitedAt: new Date(), messageId: mail.messageId }
      });
    });

    console.log('mailing succeed', res, res.data)
  } catch(e) {
    console.log(e);
  }
}



Meteor.methods({
  'ambassadorMail': function(mail, isTest) {
    return Mailing.ambassadorMail(mail.subject, mail.message, mail.selector, isTest);
  },
  'githubGrowthMail': Mailing.githubGrowthMail,
  // 'test-chimp': function() {
  //   var mailChimp = new MailChimp();
  //   mailChimp.call('lists', 'interest-groupings', {id: MailChimpOptions['listId']}, function(err, res) {
  //     console.log(err, res);
  //   });
  // }
});


