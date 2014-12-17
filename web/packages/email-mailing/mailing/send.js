
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

  console.log('Email:', options.html);
  console.log('Send mailing:', params.options);
  console.log('To users:', options.segments);

  // don't proceed on development machines
  if (Settings['environment'] === 'dev')
    return;

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
  Users.checkAmbassadorPermission();

  var ambassador = Meteor.user();
  var city = ambassador.currentCity;
  var email = Util.property(ambassador, 'staff.email');

  if (!email)
    throw new Meteor.Error(500, "no ambassador email specified");

  if (selector.userId && (Users.findOne(selector.userId) || {}).city !== city)
    throw new Meteor.Error(500, "not allowed", "Ambassador not allowed to mail this user");

  if (selector.mailing && !_.contains(MAILING_VALUES, selector.mailing)) 
    throw new Meteor.Error(500, "no allowed", "no valid group specified");

  // on test environments, send always test e-mails. Never mail the users
  if (Settings['environment'] !== 'production')
    isTest = true;

  var html = Assets.getText('email-wrappers/html-email.html')
  html = html.replace(/{{subject}}/g, subject);
  html = html.replace(/{{content}}/g, content);
  html = html.replace(/{{unsubscribe}}/g, 'if you don\'t want to receive this kind of emails you can <a href="http://hckrs.io">change your email settings</a>');

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





Meteor.methods({
  'ambassadorMail': function(mail, isTest) {
    return Mailing.ambassadorMail(mail.subject, mail.message, mail.selector, isTest);
  },
});