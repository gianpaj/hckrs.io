AdminGrowth = {}

AdminGrowth.setCity = function(city) {
  state.set('city', city);
}
AdminGrowth.getCity = function() {
  return state.get('city');
}



// state

var state = new State('adminGrowth', {
  'city': null,
});



// including fields

var fields = function() {
  return [
    Field.city,
    { fieldId: 'createdAt', key: 'createdAt', label: 'since', sortByValue: true, fn: Field.fn.date },
    { fieldId: 'avatarUrl', key: 'avatarUrl', label: '#', fn: function(avatarUrl, obj) { return Safe.string('<a href="https://github.com/'+obj['username']+'" target="_blank"><img src="'+avatarUrl+'" width="50" /></a>'); }},
    // 'name',
    { fieldId: 'followers', key: 'followers', label: 'followers'},
    { fieldId: 'following', key: 'following', label: 'following'},
    { fieldId: 'repos', key: 'repos', label: 'repos'},
    { fieldId: 'gists', key: 'gists', label: 'gists'},

    { fieldId: 'username', key: 'username', label: 'username', sortByValue: true, fn: function(username) { return Safe.url("https://github.com/"+username, {text: username}); }},
    { fieldId: 'hireable', key: 'hireable', label: 'hire', fn: Field.fn.bool },
    { fieldId: 'biography', key: 'biography', label: 'bio', fn: function(bio) { return bio ? Safe.string('<span class="glyphicon glyphicon-leaf" title="'+bio+'" style="cursor:help;"></span>') : ''; } },
    { fieldId: 'company', key: 'company', label: 'comp.', fn: function(company) { return company ? Safe.string('<span class="glyphicon glyphicon-briefcase" title="'+company+'" style="cursor:help;"></span>') : ''; } },
    { fieldId: 'location', key: 'location', label: 'loc.', fn: function(location) { return location ? Safe.string('<span class="glyphicon glyphicon-map-marker" title="'+location+'" style="cursor:help;"></span>') : ''; } },

    { fieldId: 'website', key: 'website', label: 'site', sortByValue: true, fn: function(url) { return url ? Safe.url(url, {text: '<span class="glyphicon glyphicon-globe"></span>'}) : ''; }},
    { fieldId: 'email', key: 'email', label: 'email', sortByValue: true, fn: Field.fn.email },
    { fieldId: 'invitedAt', key: 'invitedAt', label: 'invited', sortByValue: true, fn: Field.fn.date},
    { fieldId: 'open', key: 'open', label: 'open', sortByValue: true, fn: Field.fn.bool},
    { fieldId: 'clicks', key: 'clicks', label: 'clicks', sortByValue: true},
    { fieldId: 'signupAt', key: 'signupAt', label: 'singup', sortByValue: true, fn: Field.fn.date},
  ];
};

// Determine row color based on invited/signedup
var rowClass = function(doc) {
  if (doc.signupAt) return 'success'
  else if (doc.invitedAt) return 'warning'
  return ''
}


// Template helpers

Template.admin_growth.helpers({
  'city': function() {
    return City.lookup(state.get('city'));
  },
  'collection': function() {
    return GrowthGithub.find({city: state.get('city')});
  },
  'tableFormat': function() {
    return {
      showFilter: false,
      showColumnToggles: true,
      rowsPerPage: 50,
      fields: fields(),
      rowClass: rowClass,
    }
  }
});

// Template rendered

Template.admin_growth.rendered = function() {
  // default sorting
  // XXX can be implemented using a 'sort' attribute in later package versions of reactive-table
  Session.set('reactive-table-reactive-table-sort', 1); // signup date github
  Session.set('reactive-table-reactive-table-sort-direction', -1); // desc
}


/* Compose Email */

Template.admin_growthEmail.helpers({
  'subjects': function() {
    return EmailTemplates.find({groups: 'growthGithub', subject: {$exists: true}}).map(function(message) {
      return { value: message.identifier, label: message.identifier };
    });
  },
  'bodies': function() {
    return EmailTemplates.find({groups: 'growthGithub', body: {$exists: true}}).map(function(message) {
      return { value: message.identifier, label: message.identifier };
    });
  },
  'schema': function() {
    return new SimpleSchema({
      "subject": { type: String, label: "Subject Template" },
      "body": { type: String, label: "Body Template" },
    });
  }
})

Template.admin_growth.events({
  'change #growthCityChooser select': function(evt) {
    var city = $(evt.currentTarget).val();
    state.set('city', city);
  },
  'click [action="crawl"]': function(evt) {
    var city = state.get('city');
    Crawler.fetchGithubUsersInCity(city, function(err) {
      if (err && err.reason === 'busy')
        alert('Crawler already busy with crawling some city.')
      else if (err)
        console.log(err);
    });
  },
})

Template.admin_growthEmail.events({
  'click [action="submit"]': function(evt) {
    evt.preventDefault();

    var tmpl = Template.instance();
    var $button = tmpl.$(evt.currentTarget);
    var $form   = tmpl.$("#adminGrowthEmailForm");

    var formData = $form.serializeObject()
      , number   = parseInt(formData.number)
      , userIds  = getUsersFromTop(number)
      , subjectIdentifier  = formData.subject
      , bodyIdentifier     = formData.body;

    // validate email
    if (!AutoForm.validateForm("adminGrowthEmailForm"))
      return;

    // disable button for a few seconds
    var text = $button.text();
    $button.attr('disabled', 'disabled').addClass('disabled').text('Sending...');
    var cb = function() {
      $button.removeAttr('disabled').removeClass('disabled').text(text);
    }

    // send mail
    sendGrowthMailing(userIds, subjectIdentifier, bodyIdentifier, cb);
  }
})

// extract internal information from the reactiveTable package
// such as current column sorting.
// XXX THIS HACKS INTO THE PRIVATE LIB
var getTableInfo = function(fields) {

  // get sorting property from reactive table
  var sortDir = Session.get('reactive-table-reactive-table-sort-direction');
  var sortIdx = Session.get('reactive-table-reactive-table-sort');
  var sortKey = fields[sortIdx].key || fields[sortIdx];

  return {sortDir: sortDir, sortKey: sortKey};
}

// get x number of users from top of the table
// based on current sorting and skip users that
// are already invited/signedup
var getUsersFromTop = function(number) {
  var table = getTableInfo(fields())
    , city  = state.get('city');

  var selector = {
    city: city,
    invitedAt: {$exists: false},
    signupAt: {$exists: false},
  };

  var options = {
    sort: _.object([table.sortKey], [table.sortDir]),
    limit: number
  };

  return GrowthGithub.find(selector, options).map(_.property('_id'));;
}

// let the server send the actual growth mail
var sendGrowthMailing = function(githubUserIds, subjectIdentifier, bodyIdentifier, cb) {
  var users = githubUserIds.length;
  var city = state.get('city');

  // send mail from server
  Meteor.call('githubGrowthMail', city, githubUserIds, subjectIdentifier, bodyIdentifier, function(err, res) {

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
        text: 'E-mail sent to '+users+' users',
        icon: false
      });
    }

    cb(err);
  });
}
