
// get the information of the hacker on the current page
// this session variable 'hacker' is setted in the router
var hackerId = function () { return Session.get('hackerId'); }
var hackerProp = function(field) { return Users.prop(hackerId(), field); }
var hackerProps = function (fields) { return Users.props(hackerId(), fields); }


// state
var state = new State('hacker', {
  activePanel: null,  /* mail, edit, null */ 
});



Template.hackerToolbar.events({
  'click [panel]': function(evt) {
    state.toggle('activePanel', $(evt.currentTarget).attr('panel'));
    Tracker.flush();
    fillTemplate();
  },
  "click [action='invite']": function(evt) {
    var by = $(evt.currentTarget).attr('by');
    var userId = hackerId();

    // invite user
    Meteor.call('inviteUserAnonymous', userId, function(err,res) { 
      var err = false;
      if (err) {  
        console.log(err);
        new PNotify({
          title: 'Failed',
          text: "Something went wrong",
          type: 'error',
          icon: false
        });
      } else {
        openMailTemplate('personalWelcome');
        new PNotify({
          title: 'Activated',
          text: "User is now activated and has access to the site. Send a welcome message.",
          icon: false
        });
      }
    }); 
  },
  "click [action='verifyEmail']": function(evt) {
    Meteor.call('forceEmailVerification', hackerId(), function(err, res) {
      if (err) {
        console.log(err);
        new PNotify({
          title: 'Failed',
          text: "Something went wrong",
          type: 'error',
          icon: false
        });
      } else {
        openMailTemplate('personalWelcome');
        new PNotify({
          title: 'Email verified',
          text: "You have forced the verification of user's email address. Send a welcome message.",
          icon: false
        });
      }
    });
  },
  "click [action='sendVerificationEmail']": function() {
    Meteor.call('sendVerificationEmail', hackerId(), function(err) {
      if (err) console.log(err);
    });
  },
  'keyup #invitationsNumber, change #invitationsNumber': function(evt) {
    var $target = $(evt.currentTarget);
    var invitations = parseInt($target.val());
    var userId = hackerId();

    // update invitations count
    Util.exec(function() {
      Users.update(userId, {$set: {invitations: invitations}});
    });

    openMailTemplate('personalInviteSlots');
  },
  "change #citySelect select": function(evt) {
    var city = $(evt.currentTarget).val();
    var cityName = City.lookup(city).name;
    var userId = hackerId();
    var userName = hackerProp('profile.name');

    if (confirm("Are you sure you want move this user to '"+cityName+"'?")) {

      // move
      Meteor.call('moveUserToCity', userId, city, function(err) {
        if (err) return;

        new PNotify({
          title: 'Moved to ' + cityName,
          text: 'Moved \'' + userName + '\' to ' + cityName,
          icon: false
        });

        // redirect to hackers page
        Router.go('hackers');
      }); 

    } else { 
      
      // cancel, reset <select>
      $(evt.currentTarget).val(Session.get('currentCity'));
    }

  },
  'click [flag]': function(evt) {
    var $flag = $(evt.currentTarget);
    var flag = $flag.attr('flag');
    var activate = !$flag.hasClass('active');

    // make property staff in doc if not already exists
    if (!hackerProp('staff'))
      Users.update(hackerId(), {$set: {staff: {}}});
    
    Users.update(hackerId(), _.object([activate ? '$set' : '$unset'], [_.object([flag], [true])]));
  }
});

Template.hackerToolbarPanelMail.events({
  'change select[name="group"]': function(evt) {
    fillTemplate();
  },
  'click [action="submit"]': function(evt) {
    evt.preventDefault();

    var $button = $(evt.currentTarget);
    var $form = $("#hackerMailForm");
    var formData = $form.serializeObject();

    // validate email
    if (! AutoForm.getValidationContext("hackerMailForm").validate(formData))
      return;

    // disable button for a few seconds
    var text = $button.text();
    $button.attr('disabled', 'disabled').addClass('disabled').text('Sending...');
    var cb = function() {
      $button.removeAttr('disabled').removeClass('disabled').text(text);
    }
    
    // send mail
    sendMailing(formData, cb);
  }
})




Template.hackerToolbar.helpers({
  'owner': function() {
    return hackerProp('_id') === Meteor.userId();
  },
  'unverifiedEmail': function() {
    return _.findWhere(hackerProp('emails'), {address: hackerProp('profile.email'), verified: false});
  },
  'statusLabels': function() {
    return Users.userStatusLabel(hackerId());
  },
  'active': function(panel) {
    return state.equals('activePanel', panel) ? 'active' : '';
  },
  'flag': function(flag) {
    return hackerProp(flag) ? 'active' : '';
  },
  'staff': function() {
    return Users.hasAmbassadorPermission(hackerId());
  }
});

Template.hackerToolbarPanelMail.helpers({
  'mailSchema': function() {
    return new SimpleSchema({
      "subject": { type: String },
      "message": { type: String },
      "group": { 
        type: String, 
        autoform: { 
          type: "select",
          firstOption: false,
          options: [
            {value: 'personalMessage', label: 'message'},
            {value: 'personalMissingInfo', label: 'missing information'},
            {value: 'personalWelcome', label: 'welcome'},
            {value: 'personalInviteSlots', label: 'invite slots added'},
          ] 
        },
      },
    });
  }
});


Template.hackerToolbar.rendered = function() {
  $('[data-toggle="tooltip"]').tooltip();
}





/* mailing */

// after doing some actions, we directly open a mail template
// so that the ambassador can notify the user about the changes.
var openMailTemplate = function(requestTmpl) {
  setTimeout(function() {
    // if 'welcome' message requested, but user still haven't access
    // because of missing info, we should open the 'missingInfo' template.
    if (requestTmpl === 'personalWelcome' && hackerProp('isIncompleteProfile'))
      requestTmpl = 'personalMissingInfo';

    state.set('activePanel', 'mail');
    Tracker.flush();
    setTemplate(requestTmpl);
  }, 800);
}

var setTemplate = function(tmpl) {
  var $mailing = $("#hackerMailForm"),
      $select = $mailing.find('[name="group"]'),
      $option = $select.find('option[value="'+tmpl+'"]');
  $select.val(''); // reset current selected template
  $option.attr('selected', 'selected'); // select correct template
  fillTemplate();
}

var fillTemplate = function() {
  var cityUsersCount = Users.find({city: Session.get('currentCity')}).count(),
      $mailing = $("#hackerMailForm"),
      $subject = $mailing.find('[name="subject"]'),
      $message = $mailing.find('[name="message"]'),
      $option = $mailing.find('[name="group"] option:selected'),
      templateName = $option.val();

      if (templateName === 'personalWelcome' && cityUsersCount <= 10)
        templateName = 'personalWelcome10first';

  var template = loadEmailTemplate(templateName);
  $subject.val(template.subject);
  $message.val(template.message);
}

var loadEmailTemplate = function(templateName) {
  var tmpl_subject = Template['emailSubject_' + templateName],
      tmpl_message = Template['emailContent_' + templateName],
      subject = Blaze.toHTML(tmpl_subject),
      message = Blaze.toHTML(tmpl_message);
  
  return { subject: subject, message: message };
}

var sendMailing = function(mail, cb) {

  // preserve line breaks in message
  mail.message = mail.message.replace(/\n/g, '<br/>');

  // selector (recipient)
  mail.selector = {userId: hackerId()};

  // send mail from server
  Meteor.call('ambassadorMail', mail, function(err, res) {
    
    // error handling
    if (err) {
      console.log('Mail failed')
      new PNotify({
        title: 'Mail failed',
        text: "Mailing isn't sent correctly.",
        type: 'error',
        icon: false
      });
    } else {
      console.log('Mail send');  
      new PNotify({
        title: 'Mail sent',
        text: 'E-mail sent to user ' + hackerProp('profile.name'),
        icon: false
      });
      state.set('activePanel', null);
    }

    cb(err);
  });
}

