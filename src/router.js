if (Meteor.isClient) {

  
  // ROUTES 

  Router.map(function () {
    
    this.route('frontpage', { path: '/' });
    
    this.route('hackers', { path: '/hackers' });
    
    this.route('hacker', { path: '/hacker/:_id', data: function() {
      return Meteor.users.findOne(this.params._id); 
    }});

    this.route('skills', { path: '/skills' }); // XXX TEMPORARY

  });



  /* custom functionality */

  // when login is required, render the frontpage
  var loginRequired = function() {
    if(!Meteor.user()) {
      this.render('frontpage');
      this.stop();
    }
  }

  // make sure the user is logged in, except for the pages below
  Router.before(loginRequired, {except: ['frontpage']});

  // global router configuration
  Router.configure({
    autoRender: false
  });
}

